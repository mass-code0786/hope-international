import { NextResponse } from 'next/server';

const authRoutes = ['/login', '/register'];

export function middleware(req) {
  const token = req.cookies.get('hope_token')?.value;
  const { pathname } = req.nextUrl;
  const isRootPath = pathname === '/';
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (!token && !isRootPath && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
