const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const { store } = require('../services/memoryStore');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

// Calculate balance for a transaction
function calculateBalance(transactions, index) {
  if (index === 0) {
    const t = transactions[0];
    if (t.type === 'CIR') return t.credit || 0;
    if (t.type === 'SR') return t.sr || 0;
    if (t.type === 'DIR') return -(t.debit || 0);
    return 0;
  }
  const prev = transactions[index - 1].balance || 0;
  const t = transactions[index];
  return prev + (t.credit || 0) + (t.sr || 0) - (t.debit || 0);
}

// Recalculate all balances from scratch
function recalculateAllBalances() {
  // Sort by date, then by createdAt for same-date entries
  store.transactions.sort((a, b) => {
    const dateComp = new Date(a.date) - new Date(b.date);
    if (dateComp !== 0) return dateComp;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  for (let i = 0; i < store.transactions.length; i++) {
    store.transactions[i].balance = calculateBalance(store.transactions, i);
  }
}

// GET /api/transactions
router.get('/', authMiddleware, (req, res) => {
  try {
    const { billNo, type, dateFrom, dateTo, sortOrder, page = 1, limit = 50 } = req.query;
    let transactions = [...store.transactions];

    // Filters
    if (billNo) {
      transactions = transactions.filter(t =>
        t.billNo.toLowerCase().includes(billNo.toLowerCase())
      );
    }
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    if (dateFrom) {
      transactions = transactions.filter(t => new Date(t.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      transactions = transactions.filter(t => new Date(t.date) <= new Date(dateTo));
    }

    // Sort
    if (sortOrder === 'newest') {
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const total = transactions.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = transactions.slice(start, start + parseInt(limit));

    res.json({
      transactions: paginated,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { date, billNo, folio, debit, credit, sr, type } = req.body;

    // Validation
    if (!date || !billNo || !type) {
      return res.status(400).json({ error: 'Date, bill number, and type are required' });
    }
    if (!['CIR', 'DIR', 'SR'].includes(type)) {
      return res.status(400).json({ error: 'Type must be CIR, DIR, or SR' });
    }

    const debitVal = parseFloat(debit) || 0;
    const creditVal = parseFloat(credit) || 0;
    const srVal = parseFloat(sr) || 0;

    if (debitVal < 0 || creditVal < 0 || srVal < 0) {
      return res.status(400).json({ error: 'Negative values are not allowed' });
    }

    // Ensure only one amount type is active
    const activeAmounts = [debitVal > 0, creditVal > 0, srVal > 0].filter(Boolean).length;
    if (activeAmounts !== 1) {
      return res.status(400).json({ error: 'Exactly one amount type must be provided' });
    }

    const transaction = {
      id: uuidv4(),
      date,
      billNo: billNo.trim(),
      folio: folio || '',
      debit: debitVal,
      credit: creditVal,
      sr: srVal,
      type,
      balance: 0,
      createdBy: req.admin.id,
      updatedBy: req.admin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.transactions.push(transaction);
    recalculateAllBalances();

    await createAuditLog({
      adminId: req.admin.id,
      actionType: 'TRANSACTION_CREATE',
      actionDetails: `Created transaction: ${type} - Bill #${billNo}`,
      targetId: transaction.id,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      sessionId: req.admin.sessionId,
    });

    res.status(201).json(transaction);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const index = store.transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const { date, billNo, folio, debit, credit, sr, type } = req.body;

    if (type && !['CIR', 'DIR', 'SR'].includes(type)) {
      return res.status(400).json({ error: 'Type must be CIR, DIR, or SR' });
    }

    const debitVal = parseFloat(debit) || 0;
    const creditVal = parseFloat(credit) || 0;
    const srVal = parseFloat(sr) || 0;

    if (debitVal < 0 || creditVal < 0 || srVal < 0) {
      return res.status(400).json({ error: 'Negative values are not allowed' });
    }

    const existing = store.transactions[index];
    const oldDetails = JSON.stringify({
      billNo: existing.billNo,
      type: existing.type,
      debit: existing.debit,
      credit: existing.credit,
      sr: existing.sr,
    });

    store.transactions[index] = {
      ...existing,
      date: date || existing.date,
      billNo: billNo?.trim() || existing.billNo,
      folio: folio !== undefined ? folio : existing.folio,
      debit: debitVal,
      credit: creditVal,
      sr: srVal,
      type: type || existing.type,
      updatedBy: req.admin.id,
      updatedAt: new Date().toISOString(),
    };

    recalculateAllBalances();

    await createAuditLog({
      adminId: req.admin.id,
      actionType: 'TRANSACTION_UPDATE',
      actionDetails: `Updated transaction from ${oldDetails}`,
      targetId: id,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      sessionId: req.admin.sessionId,
    });

    res.json(store.transactions.find(t => t.id === id));
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const index = store.transactions.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const deleted = store.transactions[index];
    store.transactions.splice(index, 1);
    recalculateAllBalances();

    await createAuditLog({
      adminId: req.admin.id,
      actionType: 'TRANSACTION_DELETE',
      actionDetails: `Deleted transaction: ${deleted.type} - Bill #${deleted.billNo}`,
      targetId: id,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      sessionId: req.admin.sessionId,
    });

    res.json({ message: 'Transaction deleted', id });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
