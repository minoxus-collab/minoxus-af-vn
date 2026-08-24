// src/logic/post.ts
import { getSupabase } from '../data/supabase';
import { calcWordCount } from '../utils/helpers';
import type { Block } from '../editor/blocks';

// Định nghĩa Type dựa trên Schema của Database
export interface PostInput {
  id?: string;
  title: string;
  slug: string;
  type: 'pillar' | 'money' | 'support';
  status: 'draft' | 'published';
  content: Block[];
  meta_desc?: string;
  featured_image_url?: string;
  og_title?: string;
  focus_keyword?: string;
  canonical_url?: string;
  show_toc?: boolean;
}

// Lấy toàn bộ bài viết (hiển thị ở admin)
export async function getAllPosts() {
  const sb = getSupabase();
  return sb.from('posts').select('*').order('created_at', { ascending: false });
}

// Lấy 1 bài viết theo ID (để edit)
export async function getPostById(id: string) {
  const sb = getSupabase();
  return sb.from('posts').select('*').eq('id', id).single();
}

// Lấy 1 bài viết theo Slug (để hiển thị public blog)
export async function getPostBySlug(slug: string) {
  const sb = getSupabase();
  return sb.from('posts').select('*').eq('slug', slug).eq('status', 'published').single();
}

// Tạo bài viết mới
export async function createPost(data: Omit<PostInput, 'id'>) {
  const sb = getSupabase();
  const word_count = calcWordCount(data.content ?? []);
  
  const insertData = {
    ...data,
    word_count,
    // Nếu tạo mới với status=published ngay -> set published_at
    ...(data.status === 'published' ? { published_at: new Date().toISOString() } : {})
  };
  
  return sb.from('posts').insert(insertData).select().single();
}

// Cập nhật bài viết
export async function savePost(data: PostInput) {
  const sb = getSupabase();
  if (!data.id) throw new Error('savePost: thiếu id. Dùng createPost() cho bài mới.');
  
  const word_count = calcWordCount(data.content ?? []);
  
  // Lấy trạng thái hiện tại từ DB
  const { data: existing, error } = await sb
    .from('posts')
    .select('status, published_at')
    .eq('id', data.id)
    .single();
    
  if (error) throw error;
  
  // Chỉ set published_at nếu publish lần đầu (chưa có published_at)
  const shouldSetPublishedAt = 
    data.status === 'published' && 
    existing?.status !== 'published' && 
    !existing?.published_at;
    
  const updateData = {
    ...data,
    word_count,
    updated_at: new Date().toISOString(),
    ...(shouldSetPublishedAt ? { published_at: new Date().toISOString() } : {})
  };
  
  return sb.from('posts').update(updateData).eq('id', data.id);
}

// Xóa bài viết
export async function deletePost(id: string) {
  const sb = getSupabase();
  return sb.from('posts').delete().eq('id', id);
}
// Bổ sung vào cuối file src/logic/post.ts

// Cập nhật bài viết
export async function updatePost(id: string, updateData: any) {
  const sb = getSupabase();
  return sb
    .from('posts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
}

// --- TÍNH NĂNG MỚI: Lấy tất cả bài viết ĐÃ XUẤT BẢN để chèn link ---
export async function getAllPublishedPosts() {
  const sb = getSupabase();
  return sb
    .from('posts')
    .select('id, title, slug, type, created_at')
    .eq('status', 'published') // Chỉ lấy bài đã xuất bản
    .order('created_at', { ascending: false });}

    // Bổ sung vào cuối file src/logic/post.ts

// Lấy bài viết liên quan hiển thị cuối trang đọc bài — không giới hạn cùng type
export async function getRelatedPosts(excludePostId: string, limit: number = 3) {
  const sb = getSupabase();
  return sb
    .from('posts')
    .select('id, title, slug, type, created_at, featured_image')
    .eq('status', 'published')
    .neq('id', excludePostId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

// Bổ sung import này ở đầu file src/logic/post.ts (nếu chưa có)
import type { PostType } from '../utils/postTaxonomy.ts';

// Bổ sung hàm này vào cuối file src/logic/post.ts
export async function getPostsByType(
  type: PostType,
  { page = 1, limit = 9 }: { page?: number; limit?: number } = {}
) {
  const sb = getSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await sb
    .from('posts')
    .select('id, title, slug, type, created_at, featured_image', { count: 'exact' })
    .eq('status', 'published')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .range(from, to);

  return {
    posts: data ?? [],
    totalCount: count ?? 0,
    error,
  };
}

// Bổ sung vào cuối file src/logic/post.ts (dùng tên mới để tránh trùng lặp)
export async function getPaginatedPosts(
  { page = 1, limit = 9 }: { page?: number; limit?: number } = {}
) {
  const sb = getSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await sb
    .from('posts')
    .select('id, title, slug, type, created_at, featured_image', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(from, to);

  return {
    posts: data ?? [],
    totalCount: count ?? 0,
    error,
  };
}
