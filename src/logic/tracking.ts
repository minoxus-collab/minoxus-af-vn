// src/logic/tracking.ts
import { getSupabase } from '../data/supabase';

export interface TrackingEvent {
  event_type: 'view_post' | 'click_affiliate';
  post_id?: string;
  affiliate_id?: string;
}

// Ghi event vào DB và tăng counter
export async function recordEvent(data: TrackingEvent) {
  const sb = getSupabase();
  
  // Ghi vào tracking_events
  await sb.from('tracking_events').insert(data);

  // Tăng counter tích lũy bằng RPC đã định nghĩa ở DB
  if (data.event_type === 'view_post' && data.post_id) {
    const { error } = await sb.rpc('increment_post_views', { post_id: data.post_id });
    if (error) {
      console.error('>>> LỖI SUPABASE RPC increment_post_views:', error);
    }
  }
  
  if (data.event_type === 'click_affiliate' && data.affiliate_id) {
    await sb.rpc('increment_affiliate_clicks', { affiliate_id: data.affiliate_id });
  }
}

// Lấy tổng quan số liệu cho Dashboard
export async function getTrackingStats() {
  const sb = getSupabase();
  
  // Lấy tổng bài viết
  const { count: totalPosts } = await sb
    .from('posts')
    .select('*', { count: 'exact', head: true });
    
  // Lấy tổng bài published
  const { count: publishedPosts } = await sb
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');
    
  // Lấy tổng link affiliate
  const { count: totalAffiliates } = await sb
    .from('affiliate_links')
    .select('*', { count: 'exact', head: true });
    
  return {
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    totalAffiliates: totalAffiliates || 0
  };
}

// Lấy top bài viết nhiều view nhất
export async function getTopPosts(limit: number = 10) {
  const sb = getSupabase();
  return sb
    .from('posts')
    .select('id, title, views, status')
    .order('views', { ascending: false })
    .limit(limit);
}

// Lấy top affiliate nhiều click nhất
export async function getTopAffiliates(limit: number = 10) {
  const sb = getSupabase();
  return sb
    .from('affiliate_links')
    .select('id, name, clicks, expired_at, platform')
    .order('clicks', { ascending: false })
    .limit(limit);
}

// Lấy lượt view bài viết theo ngày (dùng cho biểu đồ)
export async function getViewsByDay(days: number = 30) {
  const sb = getSupabase();
  
  // Tính ngày bắt đầu lấy data
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);
  
  const { data, error } = await sb
    .from('tracking_events')
    .select('created_at')
    .eq('event_type', 'view_post')
    .gte('created_at', pastDate.toISOString());
    
  if (error) return [];
  
  // Khởi tạo mảng các ngày với giá trị mặc định là 0 (để biểu đồ không bị đứt quãng)
  const counts: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    counts[dateStr] = 0;
  }
  
  // Aggregate (nhóm) data
  if (data) {
    data.forEach(event => {
      const dateStr = event.created_at.split('T')[0];
      if (counts[dateStr] !== undefined) {
        counts[dateStr]++;
      }
    });
  }
  
  return Object.keys(counts).map(date => ({
    date,
    views: counts[date]
  }));
}