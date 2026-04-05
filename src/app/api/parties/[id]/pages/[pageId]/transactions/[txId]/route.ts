import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse, getClientInfo } from '@/lib/server/auth';
import {
  createAuditLog, findTransactionById, updatePageTransaction, deletePageTransaction,
} from '@/lib/server/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string; pageId: string; txId: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id, pageId, txId } = params;

    const existing = await findTransactionById(txId);
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (existing.pageId !== pageId || existing.partyId !== id) {
      return NextResponse.json({ error: 'Transaction does not belong to this page' }, { status: 400 });
    }

    const body = await req.json();
    const { date, billNo, folio, amount, type } = body;

    const validTypes = ['CIR', 'DIR', 'SR'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let debit: number | undefined;
    let credit: number | undefined;
    let sr: number | undefined;

    if (amount !== undefined && type) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        return NextResponse.json({ error: 'Amount must be non-negative' }, { status: 400 });
      }
      debit = type === 'DIR' ? numericAmount : 0;
      credit = type === 'CIR' ? numericAmount : 0;
      sr = type === 'SR' ? numericAmount : 0;
    }

    const updated = await updatePageTransaction(txId, {
      date, billNo, folio, debit, credit, sr, type, adminId: admin.id,
    });

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'TRANSACTION_UPDATE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Updated transaction ${txId} on page ${pageId}`,
      targetId: txId,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; pageId: string; txId: string } }) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return unauthorizedResponse();

    const { id, pageId, txId } = params;

    const existing = await findTransactionById(txId);
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (existing.pageId !== pageId || existing.partyId !== id) {
      return NextResponse.json({ error: 'Transaction does not belong to this page' }, { status: 400 });
    }

    const deleted = await deletePageTransaction(txId);

    const { ip, device } = getClientInfo(req);
    await createAuditLog({
      actionType: 'TRANSACTION_DELETE',
      adminId: admin.id,
      sessionId: admin.sessionId,
      actionDetails: `Deleted transaction: ${existing.type} - Bill #${existing.billNo} from page ${pageId}`,
      targetId: txId,
      ipAddress: ip,
      deviceInfo: device,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
