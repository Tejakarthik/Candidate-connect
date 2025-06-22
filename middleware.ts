import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This is a basic middleware setup. In a real application, you would
  // verify the authentication token here. For now, we'll rely on client-side routing.
  return NextResponse.next();
}

export const config = {
  matcher: ['/home/:path*', '/login', '/register']
};