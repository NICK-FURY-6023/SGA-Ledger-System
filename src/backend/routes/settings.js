const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { store } = require('../services/memoryStore');
const { createAuditLog } = require('../services/auditService');

const router = express.Router();

// GET /api/settings
router.get('/', authMiddleware, (req, res) => {
  res.json(store.settings);
});

// PUT /api/settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { shopName, currency, dateFormat, sortOrder } = req.body;

    if (shopName) store.settings.shopName = shopName;
    if (currency) store.settings.currency = currency;
    if (dateFormat) store.settings.dateFormat = dateFormat;
    if (sortOrder) store.settings.sortOrder = sortOrder;

    await createAuditLog({
      adminId: req.admin.id,
      actionType: 'SETTINGS_UPDATE',
      actionDetails: `Updated settings: ${JSON.stringify(req.body)}`,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent'],
      sessionId: req.admin.sessionId,
    });

    res.json(store.settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
