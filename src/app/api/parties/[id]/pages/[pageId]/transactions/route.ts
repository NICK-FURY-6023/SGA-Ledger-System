import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog, getPartyById, getLedgerPageById, createPageTransaction } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: { id: string; pageId: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id, pageId } = params;

    const party = await getPartyById(id);
    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    const page = await getLedgerPageById(pageId);
    if (!page) {
      return NextResponse.json({ error: 'Ledger page not found' }, { status: 404 });
    }

    const body = await req.json();
    const { date, billNo, folio, amount, type } = body;

    if (!date || !billNo || amount === undefined || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: date, billNo, amount, type' },
        { status: 400 }
      );
    }

    const validTypes = ['CIR', 'DIR', 'SR'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: CIR, DIR, SR' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ error: 'Amount must be a valid non-negative number' }, { status: 400 });
    }

    // Calculate debit, credit, sr based on type
    let debit = 0;
    let credit = 0;
    let sr = 0;

    switch (type) {
      case 'CIR':
        credit = numericAmount;
        break;
      case 'DIR':
        debit = numericAmount;
        break;
      case 'SR':
        sr = numericAmount;
        break;
    }

    const transaction = await createPageTransaction({
      pageId,
      partyId: id,
      date,
      partyName: party.name,
      billNo,
      folio: folio || undefined,
      debit,
      credit,
      sr,
      type,
      adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'TRANSACTION_CREATE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Created transaction: ${type} - Bill #${billNo} (Page: ${pageId})`,
      targetId: transaction.id,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
