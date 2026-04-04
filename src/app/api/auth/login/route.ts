import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateToken, getClientInfo } from '@/lib/server/auth';
import { seedAdmins, findAdminByEmail, updateAdmin, createSession, createAuditLog } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    await seedAdmins();
    const { email, password } = await req.json();
    const { ip, device } = getClientInfo(req);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const admin = await findAdminByEmail(email);
    if (!admin) {
      await createAuditLog({
        actionType: 'FAILED_LOGIN',
        actionDetails: `Failed login attempt for email: ${email}`,
        ipAddress: ip,
        deviceInfo: device,
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await createSession({
      adminId: admin.id,
      loginTime: new Date().toISOString(),
      logoutTime: null,
      duration: null,
      ipAddress: ip,
      deviceInfo: device,
    });

    await updateAdmin(admin.id, { lastLoginAt: new Date().toISOString() });

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      sessionId: session.id,
    });

    await createAuditLog({
      adminId: admin.id,
      actionType: 'LOGIN',
      actionDetails: 'Successful login',
      ipAddress: ip,
      deviceInfo: device,
      sessionId: session.id,
    });

    return NextResponse.json({
      token,
      admin: { id: admin.id, email: admin.email, username: admin.username, role: admin.role },
      sessionId: session.id,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
