import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getStore } from '@/lib/server/store';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import { createAuditLog } from '@/lib/server/audit';

function recalculateAllBalances() {
  const store = getStore();
  store.transactions.sort((a, b) => {
    const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComp !== 0) return dateComp;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  for (let i = 0; i < store.transactions.length; i++) {
    const t = store.transactions[i];
    const prev = i === 0 ? 0 : store.transactions[i - 1].balance;
    t.balance = prev + (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
  }
}

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  const store = getStore();
  const url = new URL(req.url);
  const billNo = url.searchParams.get('billNo');
  const partyName = url.searchParams.get('partyName');
  const type = url.searchParams.get('type');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const sortOrder = url.searchParams.get('sortOrder');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let transactions = [...store.transactions];

  if (billNo) transactions = transactions.filter(t => t.billNo.toLowerCase().includes(billNo.toLowerCase()));
  if (partyName) transactions = transactions.filter(t => t.partyName?.toLowerCase().includes(partyName.toLowerCase()));
  if (type) transactions = transactions.filter(t => t.type === type);
  if (dateFrom) transactions = transactions.filter(t => new Date(t.date) >= new Date(dateFrom));
  if (dateTo) transactions = transactions.filter(t => new Date(t.date) <= new Date(dateTo));
  if (sortOrder === 'newest') transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = transactions.length;
  const start = (page - 1) * limit;
  const paginated = transactions.slice(start, start + limit);

  return NextResponse.json({ transactions: paginated, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const store = getStore();
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

    const transaction = {
      id: uuidv4(),
      date,
      partyName: partyName?.trim() || '',
      billNo: billNo.trim(),
      folio: folio || '',
      debit: debitVal,
      credit: creditVal,
      sr: srVal,
      type: type as 'CIR' | 'DIR' | 'SR',
      balance: 0,
      createdBy: admin.id,
      updatedBy: admin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.transactions.push(transaction);
    recalculateAllBalances();

    const { ip, device } = getClientInfo(req);
    createAuditLog({
      adminId: admin.id,
      actionType: 'TRANSACTION_CREATE',
      actionDetails: `Created transaction: ${type} - Bill #${billNo}`,
      targetId: transaction.id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    const updated = store.transactions.find(t => t.id === transaction.id)!;
    return NextResponse.json(updated, { status: 201 });
  } catch (err) {
    console.error('Create transaction error:', err);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
