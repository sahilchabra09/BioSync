import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/settings(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Fix for dev tunnels: Reconstruct proper host from forwarded headers
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedPort = req.headers.get('x-forwarded-port');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  
  if (forwardedHost && forwardedPort && forwardedProto) {
    // Construct proper host with port
    const properHost = `${forwardedHost}:${forwardedPort}`;
    
    // Clone the request headers and update the host
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('host', properHost);
    
    // Return response with modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
    
    return response;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};