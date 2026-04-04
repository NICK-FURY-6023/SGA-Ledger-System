import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  const store = getStore();
  return NextResponse.json(store.settings);
}

export async function PUT(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const store = getStore();
    const { shopName, currency, dateFormat, sortOrder } = await req.json();

    if (shopName) store.settings.shopName = shopName;
    if (currency) store.settings.currency = currency;
    if (dateFormat) store.settings.dateFormat = dateFormat;
    if (sortOrder) store.settings.sortOrder = sortOrder;

    const { ip, device } = getClientInfo(req);
    createAuditLog({
      adminId: admin.id,
      actionType: 'SETTINGS_UPDATE',
      actionDetails: `Updated settings`,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json(store.settings);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
