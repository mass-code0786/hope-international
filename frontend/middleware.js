import { NextResponse } from 'next/server';

const publicRoutes = ['/login', '/register'];

export function middleware(req) {
  const token = req.cookies.get('hope_token')?.value;
  const { pathname } = req.nextUrl;
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
