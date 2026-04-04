import { NextRequest, NextResponse } from 'next/server';
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const store = getStore();
    const { id } = params;
    const index = store.transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const { date, billNo, folio, debit, credit, sr, type, partyName } = await req.json();

    if (type && !['CIR', 'DIR', 'SR'].includes(type)) {
      return NextResponse.json({ error: 'Type must be CIR, DIR, or SR' }, { status: 400 });
    }

    const debitVal = parseFloat(debit) || 0;
    const creditVal = parseFloat(credit) || 0;
    const srVal = parseFloat(sr) || 0;

    if (debitVal < 0 || creditVal < 0 || srVal < 0) {
      return NextResponse.json({ error: 'Negative values are not allowed' }, { status: 400 });
    }

    const existing = store.transactions[index];
    const oldDetails = JSON.stringify({
      billNo: existing.billNo, type: existing.type,
      debit: existing.debit, credit: existing.credit, sr: existing.sr,
    });

    store.transactions[index] = {
      ...existing,
      date: date || existing.date,
      partyName: partyName !== undefined ? partyName?.trim() : existing.partyName,
      billNo: billNo?.trim() || existing.billNo,
      folio: folio !== undefined ? folio : existing.folio,
      debit: debitVal,
      credit: creditVal,
      sr: srVal,
      type: type || existing.type,
      updatedBy: admin.id,
      updatedAt: new Date().toISOString(),
    };

    recalculateAllBalances();

    const { ip, device } = getClientInfo(req);
    createAuditLog({
      adminId: admin.id,
      actionType: 'TRANSACTION_UPDATE',
      actionDetails: `Updated transaction from ${oldDetails}`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json(store.transactions.find(t => t.id === id));
  } catch (err) {
    console.error('Update transaction error:', err);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const store = getStore();
    const { id } = params;
    const index = store.transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const deleted = store.transactions[index];
    store.transactions.splice(index, 1);
    recalculateAllBalances();

    const { ip, device } = getClientInfo(req);
    createAuditLog({
      adminId: admin.id,
      actionType: 'TRANSACTION_DELETE',
      actionDetails: `Deleted transaction: ${deleted.type} - Bill #${deleted.billNo}`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json({ message: 'Transaction deleted', id });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
