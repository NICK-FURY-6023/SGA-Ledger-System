import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/server/auth';
import { seedAdmins, findAdminById } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const adminToken = getAdminFromRequest(req);
  if (!adminToken) return unauthorizedResponse();

  await seedAdmins();
  const admin = await findAdminById(adminToken.id);
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
