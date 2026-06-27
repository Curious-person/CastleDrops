import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value
  const { pathname } = request.nextUrl

  // Protected paths
  const isProtectedPath = pathname === '/' ||
                          pathname.startsWith('/orders') ||
                          pathname.startsWith('/water-logs') ||
                          pathname.startsWith('/customers') ||
                          pathname.startsWith('/settings')

  // Auth paths
  const isAuthPath = pathname.startsWith('/login')

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/orders', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images, logo, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}
