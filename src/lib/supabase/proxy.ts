import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";

/**
 * Refresh the Supabase session for an incoming request and enforce the
 * authentication gate. Returns a NextResponse that either:
 *   - continues the request with refreshed session cookies, or
 *   - redirects unauthenticated users to /login (and authed users away
 *     from auth pages).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: getUser() validates the JWT against Supabase Auth and
  // refreshes the session if needed. Do not place any code between
  // createServerClient and getUser, or session refresh may break.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user) {
    // user 역할(현장 담당자)은 /m/request/*, /m/ai-chat, /api/* 만 허용.
    // 그 외 경로로 접근하면 /m/request 로 리다이렉트한다.
    //
    // 역할 조회는 추가 DB 왕복 1회이지만, 이미 user-allowed 경로이거나 루트('/')
    // 페이지는 자체 리다이렉트를 하므로 필요한 경우에만 조회해서 최소화.
    const isUserAllowedPath =
      path.startsWith("/m/request") || path.startsWith("/m/ai-chat");
    const isApiPath = path.startsWith("/api/");
    const isRootPath = path === "/";

    let role: string | null = null;
    if (isAuthRoute || (!isUserAllowedPath && !isApiPath && !isRootPath)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
    }

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = role === "user" ? "/m/request" : "/overview";
      return NextResponse.redirect(url);
    }

    if (role === "user" && !isUserAllowedPath && !isApiPath && !isRootPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/m/request";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
