import { NextRequest, NextResponse } from 'next/server';
import { getStore, seedAdmin } from '@/lib/server/store';
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const adminToken = getAdminFromRequest(req);
  if (!adminToken) return unauthorizedResponse();

  await seedAdmin();
  const store = getStore();
  const admin = store.admins.find(a => a.id === adminToken.id);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: admin.id,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  });
}
