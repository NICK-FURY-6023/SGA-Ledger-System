import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { findAdminById, updateAdmin, createAuditLog } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const adminRecord = await findAdminById(admin.id);
    if (!adminRecord) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, adminRecord.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await updateAdmin(admin.id, { passwordHash: newHash });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      adminId: admin.id,
      actionType: 'PASSWORD_CHANGE',
      actionDetails: 'Admin changed their password',
      targetId: admin.id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
