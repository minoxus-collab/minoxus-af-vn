// src/utils/postTaxonomy.ts
// ⚠️ File này CHỈ phục vụ hiển thị (FE). Giá trị 'pillar' | 'support' | 'money'
// vẫn là giá trị thật lưu trong cột posts.type — KHÔNG đổi ở đây.

export type PostType = 'pillar' | 'support' | 'money';

export const POST_TYPE_LABELS: Record<PostType, string> = {
  pillar: 'Kiến Thức Chuyên Sâu',
  support: 'Mẹo & Kinh Nghiệm',
  money: 'Gợi Ý & Đánh Giá',
};

export const POST_TYPE_ROUTES: Record<PostType, string> = {
  pillar: '/guides',
  support: '/insights',
  money: '/picks',
};

export function getPostTypeLabel(type: string): string {
  return POST_TYPE_LABELS[type as PostType] ?? type;
}

export function getPostTypeRoute(type: string): string {
  return POST_TYPE_ROUTES[type as PostType] ?? '/';
}