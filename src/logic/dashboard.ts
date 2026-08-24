import { getSupabase } from '../data/supabase';

export async function getDashboardData() {
  const sb = getSupabase(); // Nếu dự án dùng biến supabase trực tiếp, hãy đổi thành const sb = supabase;
  const now = new Date();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    { count: totalPosts },
    { count: publishedPosts },
    { data: allLinks },
    { data: topPosts },
    { data: topLinks },
    { data: trackingEvents }
  ] = await Promise.all([
    sb.from('posts').select('*', { count: 'exact', head: true }),
    sb.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    sb.from('affiliate_links').select('expired_at'),
    sb.from('posts').select('id, title, type, views, status').order('views', { ascending: false }).limit(10),
    sb.from('affiliate_links').select('id, name, platform, clicks, expired_at').order('clicks', { ascending: false }).limit(10),
    sb.from('tracking_events').select('created_at').eq('event_type', 'view_post').gte('created_at', thirtyDaysAgo.toISOString())
  ]);

  return {
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    allLinks: allLinks || [],
    topPosts: topPosts || [],
    topLinks: topLinks || [],
    trackingEvents: trackingEvents || []
  };
}