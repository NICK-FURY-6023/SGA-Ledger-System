import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog, getLedgerPageById, getPageTransactions, closeLedgerPage } from '@/lib/server/db';

export async function GET(req: NextRequest, { params }: { params: { id: string; pageId: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id, pageId } = params;

    const ledgerPage = await getLedgerPageById(pageId);
    if (!ledgerPage) {
      return NextResponse.json({ error: 'Ledger page not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const pageNum = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const transactions = await getPageTransactions(pageId, { page: pageNum, limit });

    return NextResponse.json({ ledgerPage, ...transactions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching page transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch page transactions' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; pageId: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id, pageId } = params;

    const body = await req.json();
    const { action } = body;

    if (action !== 'close') {
      return NextResponse.json({ error: 'Invalid action. Supported actions: close' }, { status: 400 });
    }

    const existingPage = await getLedgerPageById(pageId);
    if (!existingPage) {
      return NextResponse.json({ error: 'Ledger page not found' }, { status: 404 });
    }

    const closedPage = await closeLedgerPage(pageId);
    if (!closedPage) {
      return NextResponse.json({ error: 'Failed to close page' }, { status: 500 });
    }

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'PAGE_CLOSE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Closed page: ${existingPage.title} for party ${id}`,
      targetId: pageId,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(closedPage, { status: 200 });
  } catch (error) {
    console.error('Error closing ledger page:', error);
    return NextResponse.json({ error: 'Failed to close ledger page' }, { status: 500 });
  }
}
