import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import {
  getAllTransactions, createTransaction as dbCreateTransaction, createAuditLog
} from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  const url = new URL(req.url);
  const result = await getAllTransactions({
    billNo: url.searchParams.get('billNo'),
    partyName: url.searchParams.get('partyName'),
    type: url.searchParams.get('type'),
    dateFrom: url.searchParams.get('dateFrom'),
    dateTo: url.searchParams.get('dateTo'),
    sortOrder: url.searchParams.get('sortOrder'),
    page: parseInt(url.searchParams.get('page') || '1'),
    limit: parseInt(url.searchParams.get('limit') || '50'),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { date, billNo, folio, debit, credit, sr, type, partyName } = await req.json();

    if (!date || !billNo || !type) {
      return NextResponse.json({ error: 'Date, bill number, and type are required' }, { status: 400 });
    }
    if (!['CIR', 'DIR', 'SR'].includes(type)) {
      return NextResponse.json({ error: 'Type must be CIR, DIR, or SR' }, { status: 400 });
    }

    const debitVal = parseFloat(debit) || 0;
    const creditVal = parseFloat(credit) || 0;
    const srVal = parseFloat(sr) || 0;

    if (debitVal < 0 || creditVal < 0 || srVal < 0) {
      return NextResponse.json({ error: 'Negative values are not allowed' }, { status: 400 });
    }

    const activeAmounts = [debitVal > 0, creditVal > 0, srVal > 0].filter(Boolean).length;
    if (activeAmounts !== 1) {
      return NextResponse.json({ error: 'Exactly one amount type must be provided' }, { status: 400 });
    }

    const transaction = await dbCreateTransaction({
      date, partyName, billNo, folio,
      debit: debitVal, credit: creditVal, sr: srVal,
      type, adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      adminId: admin.id,
      actionType: 'TRANSACTION_CREATE',
      actionDetails: `Created transaction: ${type} - Bill #${billNo}`,
      targetId: transaction.id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    console.error('Create transaction error:', err);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
