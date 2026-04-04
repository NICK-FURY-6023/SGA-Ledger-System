import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const store = getStore();
    const session = store.sessions.find(s => s.id === admin.sessionId);
    if (session) {
      session.logoutTime = new Date().toISOString();
      session.duration = Math.round(
        (new Date(session.logoutTime).getTime() - new Date(session.loginTime).getTime()) / 1000
      );
    }

    const { ip, device } = getClientInfo(req);
    createAuditLog({
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
