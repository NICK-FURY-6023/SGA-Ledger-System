import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { getSettings, updateSettings, createAuditLog } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { shopName, currency, dateFormat, sortOrder } = await req.json();
    const updated = await updateSettings({ shopName, currency, dateFormat, sortOrder });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      adminId: admin.id,
      actionType: 'SETTINGS_UPDATE',
      actionDetails: `Updated settings`,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
