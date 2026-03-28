import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 31536000,
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

export default async function middleware(req: NextRequest) {
  // Admin routes: enforce auth and restore the user's canonical session_id
  if (
    req.nextUrl.pathname.startsWith('/admin/dashboard') ||
    req.nextUrl.pathname.startsWith('/admin/events') ||
    req.nextUrl.pathname.startsWith('/admin/users')
  ) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    const response = NextResponse.next();
    if (token.session_id && req.cookies.get('session_id')?.value !== token.session_id) {
      response.cookies.set('session_id', token.session_id, SESSION_COOKIE_OPTIONS);
    }
    return response;
  }

  // All other routes: ensure anonymous session cookie exists
  const response = NextResponse.next();
  if (!req.cookies.get('session_id')) {
    response.cookies.set('session_id', uuidv4(), SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/events/:path*', '/admin/users/:path*', '/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
