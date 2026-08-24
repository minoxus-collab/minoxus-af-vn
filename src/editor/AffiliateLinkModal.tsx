// src/editor/AffiliateLinkModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { getAllAffiliateLinks, getLinkStatus } from '../logic/affiliate';

interface AffiliateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (link: { id: string; name: string; platform: string }) => void;
}

// ĐÃ XÓA hàm getLinkStatus nội bộ ở đây vì chúng ta đã dùng hàm import từ logic/affiliate.ts

export default function AffiliateLinkModal({ isOpen, onClose, onSelect }: AffiliateLinkModalProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchLinks = async () => {
        try {
          setIsLoading(true);
          const { data, error } = await getAllAffiliateLinks();
          if (error) throw error;
          setLinks(data || []);
        } catch (error) {
          console.error("Lỗi khi tải danh sách link affiliate:", error);
          alert("Không thể tải danh sách liên kết tiếp thị!");
        } finally {
          setIsLoading(false);
        }
      };
      fetchLinks();
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredLinks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return links;
    return links.filter(link => 
      link.name.toLowerCase().includes(query) || 
      link.platform.toLowerCase().includes(query)
    );
  }, [links, searchTerm]);

  if (!isOpen) return null;

  const handleItemClick = (link: any, status: 'active' | 'expiring' | 'expired') => {
    if (status === 'expired') {
      const proceed = window.confirm(`⚠️ CẢNH BÁO: Liên kết "${link.name}" này đã HẾT HẠN sử dụng từ ngày ${new Date(link.expired_at).toLocaleDateString('vi-VN')}.\n\nBạn có chắc chắn vẫn muốn chèn link này vào bài viết không?`);
      if (!proceed) return;
    }
    
    onSelect({
      id: link.id,
      name: link.name,
      platform: link.platform
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[550px]">
        
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <h3 className="font-bold text-base text-gray-900 uppercase tracking-wide flex items-center text-green-700">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            Chọn Link Tiếp Thị Liên Kết (Affiliate)
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Tìm tên sản phẩm, chiến dịch hoặc nền tảng (Shopee, Lazada...)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none sm:text-sm"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Kết quả */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="animate-spin w-8 h-8 text-green-600 mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <p className="text-sm">Đang quét kho dữ liệu Affiliate...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
              <p className="font-medium text-gray-600">Không tìm thấy liên kết phù hợp</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLinks.map((link) => {
                const status = getLinkStatus(link.expired_at);
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleItemClick(link, status)}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between border transition-all ${
                      status === 'expired' 
                        ? 'border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-300' 
                        : 'border-transparent hover:bg-green-50/60 hover:border-green-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm font-semibold truncate ${status === 'expired' ? 'text-red-900 line-through opacity-60' : 'text-gray-900'}`}>
                        {link.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5 uppercase tracking-wider font-medium">
                        Platform: {link.platform}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {status === 'active' && (
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider">Active</span>
                      )}
                      {status === 'expiring' && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider animate-pulse">Expiring</span>
                      )}
                      {status === 'expired' && (
                        <span className="bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-md tracking-wider">Expired</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}