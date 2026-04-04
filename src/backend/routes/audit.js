const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAuditLogs } = require('../services/auditService');

const router = express.Router();

// GET /api/audit-logs
router.get('/', authMiddleware, (req, res) => {
  try {
    const { from, to, page, limit } = req.query;
    const result = getAuditLogs({
      from,
      to,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit-logs/:adminId
router.get('/:adminId', authMiddleware, (req, res) => {
  try {
    const { from, to, page, limit } = req.query;
    const result = getAuditLogs({
      adminId: req.params.adminId,
      from,
      to,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
