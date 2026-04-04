import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { getPartyBackup, createAuditLog } from '@/lib/server/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only developer can create backups' }, { status: 403 });
    }

    const { id } = params;
    const backup = await getPartyBackup(id);

    if (!backup) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'BACKUP_PARTY',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Backup exported for party: ${backup.party.name} — ${backup.transactions.length} transactions`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(backup, { status: 200 });
  } catch (error) {
    console.error('Party backup error:', error);
    return NextResponse.json({ error: 'Failed to create party backup' }, { status: 500 });
  }
}
