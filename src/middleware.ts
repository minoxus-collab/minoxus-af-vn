// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { supabase } from './data/supabase';

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  if (!url.pathname.startsWith('/admin')) return next();

  // 1. Đọc token từ Cookie
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return redirect('/login');
  }

  // 2. Set session cho Supabase client trên Server
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.user) {
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return redirect('/login');
  }

  // 3. Verify lại bằng getUser() để đảm bảo token không bị giả mạo (theo đúng v3)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return redirect('/login');
  }

  return next();
});