const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('../middleware/auth');
const { authMiddleware } = require('../middleware/auth');
const { store } = require('../services/memoryStore');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const device = req.headers['user-agent'] || 'unknown';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = store.admins.find(a => a.username === username && a.isActive);
    if (!admin) {
      await createAuditLog({
        actionType: 'FAILED_LOGIN',
        actionDetails: `Failed login attempt for username: ${username}`,
        ipAddress: ip,
        deviceInfo: device,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      await createAuditLog({
        adminId: admin.id,
        actionType: 'FAILED_LOGIN',
        actionDetails: 'Invalid password',
        ipAddress: ip,
        deviceInfo: device,
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      adminId: admin.id,
      loginTime: new Date().toISOString(),
      logoutTime: null,
      duration: null,
      ipAddress: ip,
      deviceInfo: device,
    };
    store.sessions.push(session);

    // Update last login
    admin.lastLoginAt = new Date().toISOString();

    // Generate token
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      sessionId,
    });

    await createAuditLog({
      adminId: admin.id,
      actionType: 'LOGIN',
      actionDetails: 'Successful login',
      ipAddress: ip,
      deviceInfo: device,
      sessionId,
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      sessionId,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const session = store.sessions.find(s => s.id === req.admin.sessionId);
    if (session) {
      session.logoutTime = new Date().toISOString();
      session.duration = Math.round(
        (new Date(session.logoutTime) - new Date(session.loginTime)) / 1000
      );
    }

    await createAuditLog({
      adminId: req.admin.id,
      actionType: 'LOGOUT',
      actionDetails: 'Admin logged out',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      sessionId: req.admin.sessionId,
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const admin = store.admins.find(a => a.id === req.admin.id);
  if (!admin) {
    return res.status(404).json({ error: 'Admin not found' });
  }
  res.json({
    id: admin.id,
    username: admin.username,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  });
});

module.exports = router;
