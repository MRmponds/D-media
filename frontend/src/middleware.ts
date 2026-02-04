import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip auth check if env vars aren't configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  // Check for Supabase auth token in cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Look for the auth token cookie (Supabase stores it with project ref prefix)
  const authCookie = request.cookies.getAll().find(
    (c) => c.name.includes('auth-token') || c.name.includes('sb-') && c.name.includes('-auth-token')
  );

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // If no auth cookie and not on login page, redirect to login
  if (!authCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If has auth cookie, verify it's valid
  if (authCookie) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        },
      });

      const { data: { user } } = await supabase.auth.getUser(
        // Extract the access token from the cookie value
        authCookie.value
      );

      // Valid user on login page -> redirect to dashboard
      if (user && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Invalid token and not on login page -> redirect to login
      if (!user && !isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch {
      // Auth check failed, allow through if on login page
      if (!isLoginPage) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
