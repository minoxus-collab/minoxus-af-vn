// src/pages/api/tracking.ts
import type { APIRoute } from 'astro';
import { getSupabase } from '../../data/supabase';
import { recordEvent } from '../../logic/tracking';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { event_type, post_id, affiliate_id } = await request.json();

    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    
    // Nếu Admin đang đăng nhập -> bỏ qua, không ghi lượt xem/click
    if (user) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ghi nhận event vào database
    await recordEvent({ event_type, post_id, affiliate_id });
    
    return new Response(JSON.stringify({ ok: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};