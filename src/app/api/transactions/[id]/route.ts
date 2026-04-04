import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import {
  findTransactionById, updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction, createAuditLog
} from '@/lib/server/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { id } = params;
    const existing = await findTransactionById(id);
    if (!existing) {
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

    const oldDetails = JSON.stringify({
      billNo: existing.billNo, type: existing.type,
      debit: existing.debit, credit: existing.credit, sr: existing.sr,
    });

    const updated = await dbUpdateTransaction(id, {
      date, partyName, billNo, folio,
      debit: debitVal, credit: creditVal, sr: srVal,
      type, adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      adminId: admin.id,
      actionType: 'TRANSACTION_UPDATE',
      actionDetails: `Updated transaction from ${oldDetails}`,
      targetId: id,
      ipAddress: ip,
      deviceInfo: device,
      sessionId: admin.sessionId,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update transaction error:', err);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  try {
    const { id } = params;
    const deleted = await dbDeleteTransaction(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
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
