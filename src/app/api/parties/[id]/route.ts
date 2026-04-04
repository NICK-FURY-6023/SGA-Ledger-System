import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog, getPartyById, getPartyPages, updateParty, deleteParty } from '@/lib/server/db';

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

    return NextResponse.json({ ...party, pages }, { status: 200 });
  } catch (error) {
    console.error('Error fetching party:', error);
    return NextResponse.json({ error: 'Failed to fetch party' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id } = params;
    const body = await req.json();
    const { name, phone, address, notes } = body;

    const existing = await getPartyById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const updated = await updateParty(id, {
      name: name !== undefined ? name : undefined,
      phone: phone !== undefined ? phone : undefined,
      address: address !== undefined ? address : undefined,
      notes: notes !== undefined ? notes : undefined,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'PARTY_UPDATE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Updated party: ${name || 'details changed'}`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating party:', error);
    return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id } = params;

    const existing = await getPartyById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const deleted = await deleteParty(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });
    }

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'PARTY_DELETE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Deleted party: ${existing.name}`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json({ message: 'Party deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting party:', error);
    return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });
  }
}
