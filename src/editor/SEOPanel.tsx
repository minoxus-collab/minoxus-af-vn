// src/editor/SEOPanel.tsx
import React, { useState, useEffect } from 'react';

export interface SeoData {
  title: string;
  slug: string;
  type: 'pillar' | 'money' | 'support';
  status: 'draft' | 'published';
  meta_description: string;
  generate_toc: boolean;
  featured_image: string;
  og_title: string;
  focus_keyword: string;
  canonical_url: string;
}

interface SEOPanelProps {
  data: SeoData;
  onChange: (updates: Partial<SeoData>) => void;
  wordCount: number;
  onOpenFeaturedImage: () => void;
  onRemoveFeaturedImage: () => void;
}

const generateSlug = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export default function SEOPanel({ data, onChange, wordCount, onOpenFeaturedImage, onRemoveFeaturedImage }: SEOPanelProps) {
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  useEffect(() => {
    if (!isSlugManuallyEdited && data.title) {
      const autoSlug = generateSlug(data.title);
      if (autoSlug !== data.slug) {
        onChange({ slug: autoSlug });
      }
    }
  }, [data.title, isSlugManuallyEdited]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    onChange({ slug: generateSlug(e.target.value) });
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Thiết lập Bài viết
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-7 custom-scrollbar">
        {/* Trạng thái & Thể loại */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Trạng thái</label>
            <select
              value={data.status}
              onChange={(e) => onChange({ status: e.target.value as any })}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm font-medium outline-none ${
                data.status === 'published' ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 bg-white text-gray-700 focus:border-blue-500'
              }`}
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Thể loại</label>
            <select
              value={data.type}
              onChange={(e) => onChange({ type: e.target.value as any })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm bg-white text-sm text-gray-700 font-medium outline-none focus:border-blue-500"
            >
              <option value="pillar">Pillar (Chủ đạo)</option>
              <option value="money">Money (Affiliate)</option>
              <option value="support">Support (Hỗ trợ)</option>
            </select>
          </div>
        </div>

        {/* Tiêu đề & Slug */}
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Tiêu đề chính (H1) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nhập tiêu đề bài viết..."
              value={data.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium outline-none"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <span>Đường dẫn (Slug)</span>
              {isSlugManuallyEdited && (
                <button type="button" onClick={() => { setIsSlugManuallyEdited(false); onChange({ slug: generateSlug(data.title) }); }} className="text-[10px] text-blue-600 hover:underline normal-case">
                  Khôi phục Auto-sync
                </button>
              )}
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-gray-200 bg-gray-50 text-gray-400 text-xs font-mono">
                /
              </span>
              <input
                type="text"
                value={data.slug}
                onChange={handleSlugChange}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-600 outline-none"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* TÍNH NĂNG MỚI: FEATURED IMAGE */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Ảnh đại diện (Featured Image / OG)</label>
          {data.featured_image ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
              <img src={data.featured_image} alt="Featured" className="w-full h-auto max-h-48 object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button type="button" onClick={onRemoveFeaturedImage} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 shadow-sm flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  Xóa ảnh
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenFeaturedImage}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span className="text-sm font-medium">Chọn từ Thư viện</span>
            </button>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* Tối ưu SEO */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              <span>Meta Description</span>
              <span className={`${data.meta_description.length > 160 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {data.meta_description.length}/160
              </span>
            </label>
            <textarea
              rows={3}
              placeholder="Tóm tắt hiển thị trên Google Search..."
              value={data.meta_description}
              onChange={(e) => onChange({ meta_description: e.target.value })}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm outline-none ${
                data.meta_description.length > 160 ? 'border-red-300 focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-red-50/30' : 'border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Từ khóa chính (Focus Keyword)</label>
            <input
              type="text"
              placeholder="VD: review máy chiếu beonmax..."
              value={data.focus_keyword}
              onChange={(e) => onChange({ focus_keyword: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Canonical URL (Tùy chọn)</label>
            <input
              type="text"
              placeholder="Để trống = Tự sinh từ Slug"
              value={data.canonical_url}
              onChange={(e) => onChange({ canonical_url: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none text-blue-700"
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">OG Title (Tùy chọn)</label>
            <input
              type="text"
              placeholder="Tiêu đề hiển thị khi share Facebook..."
              value={data.og_title}
              onChange={(e) => onChange({ og_title: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
            />
          </div>
        </div>

        {/* Tiện ích bài viết */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between bg-blue-50/50 px-4 py-3 rounded-lg border border-blue-100">
            <span className="text-sm font-medium text-blue-900">Tự động sinh Mục lục (TOC)</span>
            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                id="toc-toggle" 
                checked={data.generate_toc}
                onChange={(e) => onChange({ generate_toc: e.target.checked })}
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out z-10"
                style={{ transform: data.generate_toc ? 'translateX(100%)' : 'translateX(0)', borderColor: data.generate_toc ? '#3b82f6' : '#d1d5db' }}
              />
              <label 
                htmlFor="toc-toggle" 
                className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${data.generate_toc ? 'bg-blue-500' : 'bg-gray-300'}`}
              ></label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Thời gian đọc: <span className="font-bold text-gray-700 ml-1">~{readTime} phút</span> <span className="mx-1">•</span> {wordCount} từ
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}