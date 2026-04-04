import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getStore, seedAdmin } from '@/lib/server/store';
import { generateToken, getClientInfo } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';

export async function POST(req: NextRequest) {
  try {
    await seedAdmin();
    const store = getStore();
    const { username, password } = await req.json();
    const { ip, device } = getClientInfo(req);

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const admin = store.admins.find(a => a.username === username && a.isActive);
    if (!admin) {
      createAuditLog({
        actionType: 'FAILED_LOGIN',
        actionDetails: `Failed login attempt for username: ${username}`,
        ipAddress: ip,
        deviceInfo: device,
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      createAuditLog({
        adminId: admin.id,
        actionType: 'FAILED_LOGIN',
        actionDetails: 'Invalid password',
        ipAddress: ip,
        deviceInfo: device,
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = uuidv4();
    store.sessions.push({
      id: sessionId,
      adminId: admin.id,
      loginTime: new Date().toISOString(),
      logoutTime: null,
      duration: null,
      ipAddress: ip,
      deviceInfo: device,
    });

    admin.lastLoginAt = new Date().toISOString();

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      sessionId,
    });

    createAuditLog({
      adminId: admin.id,
      actionType: 'LOGIN',
      actionDetails: 'Successful login',
      ipAddress: ip,
      deviceInfo: device,
      sessionId,
    });

    return NextResponse.json({
      token,
      admin: { id: admin.id, username: admin.username, role: admin.role },
      sessionId,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
