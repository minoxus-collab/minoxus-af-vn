// src/utils/pagination.ts
// Trả về mảng số trang để render, ví dụ: [1, '...', 4, 5, 6, '...', 12]

export function getPageWindow(current: number, total: number, windowSize = 5): (number | '...')[] {
  if (total <= windowSize + 2) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(windowSize / 2);
  let start = Math.max(2, current - half);
  let end = Math.min(total - 1, current + half);

  if (current - half <= 2) end = windowSize + 1;
  if (current + half >= total - 1) start = total - windowSize;

  const pages: (number | '...')[] = [1];
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}