// In-memory store for development when Firebase is not configured
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const store = {
  admins: [],
  sessions: [],
  transactions: [],
  audit_logs: [],
  settings: {
    shopName: 'SGA Hardware & Bath Fittings',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    sortOrder: 'newest',
  },
};

// Seed default admin
async function seedAdmin() {
  if (store.admins.length === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    store.admins.push({
      id: uuidv4(),
      username: 'admin',
      passwordHash: hash,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    console.log('Default admin created: admin / admin123');
  }
}

seedAdmin();

module.exports = { store };
