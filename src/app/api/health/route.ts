import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/server/firebase';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isFirebaseConfigured() ? 'firestore' : 'in-memory',
  });
}
