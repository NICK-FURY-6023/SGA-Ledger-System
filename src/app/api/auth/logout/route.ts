import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { updateSession, createAuditLog } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const logoutTime = new Date().toISOString();
    await updateSession(admin.sessionId, {
      logoutTime,
      duration: Math.round((new Date(logoutTime).getTime() - Date.now()) / 1000),
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      adminId: admin.id,
      actionType: 'LOGOUT',
      actionDetails: 'Admin logged out',
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
