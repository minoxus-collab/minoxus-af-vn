// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { supabase } from './data/supabase';

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  // 1. Xác định các phân vùng cần bảo vệ (Khu vực Admin)
  const isAdminRoute = url.pathname.startsWith('/admin');
  
  // Các App cần bảo mật (Thêm link vào mảng này nếu sau này có app mới)
  const protectedApps = ['/app/note']; 
  const isProtectedAppRoute = protectedApps.some(appPath => url.pathname.startsWith(appPath));

  // Nếu KHÔNG PHẢI trang admin VÀ KHÔNG PHẢI app nội bộ -> Cho phép khách đi tiếp luôn
  if (!isAdminRoute && !isProtectedAppRoute) {
    return next();
  }

  // 2. Đọc token từ Cookie (Luồng này chỉ chạy khi ai đó cố vào /admin hoặc /app/note)
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  // Không có vé (Cookie) -> Đá về trang đăng nhập
  if (!accessToken || !refreshToken) {
    return redirect('/login');
  }

  // 3. Set session cho Supabase client trên Server
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Vé hết hạn hoặc lỗi -> Hủy vé, đá về trang đăng nhập
  if (sessionError || !sessionData.user) {
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return redirect('/login');
  }

  // 4. Verify lại bằng getUser() để đảm bảo token không bị giả mạo (chuẩn bảo mật Supabase v3)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    return redirect('/login');
  }

  // Vé xịn, chính chủ -> Mở cổng cho vào
  return next();
});