import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'sga-ledger-dev-secret-key-2024';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
  sessionId: string;
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRY as any };
  return jwt.sign(payload as object, JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function getAdminFromRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    return verifyToken(authHeader.split(' ')[1]);
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function getClientInfo(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    device: req.headers.get('user-agent') || 'unknown',
  };
}
