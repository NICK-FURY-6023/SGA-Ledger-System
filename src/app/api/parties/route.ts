import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog, createParty, getAllParties, createLedgerPage } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const result = await getAllParties({ search, page, limit });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const body = await req.json();
    const { name, phone, address, gst, notes } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Party name is required' }, { status: 400 });
    }

    const party = await createParty({
      name: name.trim(),
      phone: phone || undefined,
      address: address || undefined,
      gst: gst || undefined,
      notes: notes || undefined,
      adminId: admin.id,
    });

    // Auto-create Page 1 for the new party
    await createLedgerPage({
      partyId: party.id,
      title: 'Page 1',
      openingBalance: 0,
      adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'PARTY_CREATE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Created party khata: ${party.name}`,
      targetId: party.id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    console.error('Error creating party:', error);
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
  }
}
