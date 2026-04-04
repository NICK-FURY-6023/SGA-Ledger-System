import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, unauthorizedResponse } from '@/lib/server/auth';
import { getAuditLogs } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return unauthorizedResponse();

  const url = new URL(req.url);
  const result = await getAuditLogs({
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    page: parseInt(url.searchParams.get('page') || '1'),
    limit: parseInt(url.searchParams.get('limit') || '50'),
  });

  return NextResponse.json(result);
}
