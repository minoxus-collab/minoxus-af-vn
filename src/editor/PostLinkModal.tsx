// src/editor/PostLinkModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { getAllPublishedPosts } from '../logic/post';

interface PostLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Callback trả về thông tin bài được chọn để Editor tạo block
  onSelect: (post: { id: string; title: string; slug: string }) => void;
}

export default function PostLinkModal({ isOpen, onClose, onSelect }: PostLinkModalProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Tải danh sách bài viết từ database khi modal được mở
  useEffect(() => {
    if (isOpen) {
      const fetchPosts = async () => {
        try {
          setIsLoading(true);
          const { data, error } = await getAllPublishedPosts();
          if (error) throw error;
          setPosts(data || []);
        } catch (error) {
          console.error("Lỗi khi tải danh sách bài viết:", error);
          alert("Không thể tải danh sách bài viết nội bộ!");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPosts();
      // Reset ô tìm kiếm mỗi khi mở modal
      setSearchTerm('');
    }
  }, [isOpen]);

  // Logic tìm kiếm Client-side: Lọc danh sách bài dựa trên ô nhập
  const filteredPosts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter(post => 
      post.title.toLowerCase().includes(query) || 
      post.slug.toLowerCase().includes(query)
    );
  }, [posts, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
        
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <h3 className="font-bold text-base text-gray-900 uppercase tracking-wide flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            Chèn Link bài viết nội bộ
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Ô tìm kiếm cố định */}
        <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Nhập tiêu đề hoặc đường dẫn (slug) để tìm bài..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none sm:text-sm transition-colors"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Danh sách kết quả có thể cuộn */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="animate-spin w-8 h-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="text-sm">Đang tải danh sách bài viết...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="font-medium text-gray-600">Không tìm thấy bài viết nào</p>
              <p className="text-xs mt-1">Hãy thử từ khóa khác hoặc kiểm tra lại trạng thái bài viết (phải là Published).</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelect({ id: post.id, title: post.title, slug: post.slug })}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 flex items-start space-x-3 transition-colors group"
                >
                  <div className="mt-0.5 shrink-0">
                    {post.type === 'pillar' ? (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded" title="Bài chủ đạo">P</span>
                    ) : post.type === 'money' ? (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded" title="Bài Affiliate">M</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded" title="Bài hỗ trợ">S</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 truncate">{post.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">/posts/{post.slug}</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}