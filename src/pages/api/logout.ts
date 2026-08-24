// src/pages/api/logout.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../data/supabase';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Xóa session trên Supabase
  await supabase.auth.signOut();
  
  // Xóa cookie ở client
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });

  // Redirect về trang đăng nhập
  return redirect('/login');
};