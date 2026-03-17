import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { NextRequest } from 'next/server';

const authMiddleware = withAuth({
  pages: {
    signIn: '/admin',
  },
});

export default function middleware(req: NextRequest) {
  // Admin routes: enforce auth
  if (req.nextUrl.pathname.startsWith('/admin/dashboard') || req.nextUrl.pathname.startsWith('/admin/events') || req.nextUrl.pathname.startsWith('/admin/users')) {
    return (authMiddleware as (req: NextRequest) => Response)(req);
  }

  // All other routes: ensure anonymous session cookie exists
  const response = NextResponse.next();
  if (!req.cookies.get('session_id')) {
    response.cookies.set('session_id', uuidv4(), {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      httpOnly: false,
    });
  }
  return response;
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/events/:path*', '/admin/users/:path*', '/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
