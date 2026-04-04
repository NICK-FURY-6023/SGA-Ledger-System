import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { getFullBackup, createAuditLog } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    // Only superadmin (developer) can create backups
    if (admin.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only developer can create backups' }, { status: 403 });
    }

    const backup = await getFullBackup();

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'BACKUP_FULL',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Full system backup exported — ${backup.transactions.length} transactions, ${backup.parties.length} parties`,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(backup, { status: 200 });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
