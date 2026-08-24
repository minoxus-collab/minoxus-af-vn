// src/logic/affiliate.ts
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '../data/supabase';
// Khởi tạo trực tiếp Supabase Client để tránh lỗi sai đường dẫn import
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

/* ====================================================================
   PHẦN 1: CÁC HÀM QUẢN TRỊ TỪ CÁC PHASE TRƯỚC (Dành cho trang Admin)
   ==================================================================== */

export async function getAffiliates() {
  return supabase
    .from('affiliate_links')
    .select('*')
    .order('created_at', { ascending: false });
}

export async function getAffiliateById(id: string) {
  return supabase
    .from('affiliate_links')
    .select('*')
    .eq('id', id)
    .single();
}

export async function createAffiliate(data: any) {
  return supabase
    .from('affiliate_links')
    .insert([data])
    .select();
}

export async function updateAffiliate(id: string, data: any) {
  return supabase
    .from('affiliate_links')
    .update(data)
    .eq('id', id)
    .select();
}

export async function deleteAffiliate(id: string) {
  return supabase
    .from('affiliate_links')
    .delete()
    .eq('id', id);
}

/* ====================================================================
   PHẦN 2: CÁC HÀM MỚI BỔ SUNG CHO PHASE 7 (Dành riêng cho Editor)
   ==================================================================== */

// Hàm tối ưu hóa payload cho Editor: Chỉ kéo các trường cần thiết
export async function getAllAffiliateLinks() {
  return supabase
    .from('affiliate_links')
    .select('id, name, url, platform, expired_at')
    .order('name', { ascending: true });
}

export function getLinkStatus(expiredAtStr: string | null): 'active' | 'expiring' | 'expired' {
  if (!expiredAtStr) return 'active';
  
  const now = new Date();
  const expiredAt = new Date(expiredAtStr);

  if (now > expiredAt) return 'expired';

  // Dưới 7 ngày (7 * 24 * 60 * 60 * 1000 = 604800000 ms)
  const SEVEN_DAYS_MS = 604800000;
  if (expiredAt.getTime() - now.getTime() <= SEVEN_DAYS_MS) {
    return 'expiring';
  }

  return 'active';
}




