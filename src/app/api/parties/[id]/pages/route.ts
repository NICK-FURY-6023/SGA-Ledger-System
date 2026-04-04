import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog, getPartyById, getPartyPages, createLedgerPage } from '@/lib/server/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id } = params;

    const party = await getPartyById(id);
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const pages = await getPartyPages(id);

    return NextResponse.json({ party, pages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching party pages:', error);
    return NextResponse.json({ error: 'Failed to fetch party pages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id } = params;

    const party = await getPartyById(id);
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, openingBalance } = body;

    const page = await createLedgerPage({
      partyId: id,
      title: title || undefined,
      openingBalance: openingBalance !== undefined ? Number(openingBalance) : undefined,
      adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'PAGE_CREATE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Created ledger page: ${page.title}`,
      targetId: page.id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating ledger page:', error);
    return NextResponse.json({ error: 'Failed to create ledger page' }, { status: 500 });
  }
}
