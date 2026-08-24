// src/editor/ImageModal.tsx
import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { uploadImageAndSaveMetadata, getAllImages, deleteImageFromStorageAndDb } from '../logic/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (src: string, alt: string, caption: string, alignment: 'center' | 'left' | 'right' | 'full', linkUrl: string) => void;
}

async function convertToWebP(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    fileType: 'image/webp',
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  return new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
}

export default function ImageModal({ isOpen, onClose, onSelectImage }: ImageModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [modalMode, setModalMode] = useState<'tabs' | 'configure'>('tabs');
  const [images, setImages] = useState<any[]>([]);
  
  const [pendingImage, setPendingImage] = useState({
    src: '',
    alt: '',
    caption: '',
    alignment: 'center' as 'center' | 'left' | 'right' | 'full',
    linkUrl: ''
  });

  // Tải danh sách ảnh từ cơ sở dữ liệu khi mở tab Thư viện
  const fetchGallery = async () => {
    try {
      setIsLoadingGallery(true);
      const { data, error } = await getAllImages();
      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách thư viện ảnh:", error);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'gallery') {
      fetchGallery();
    }
  }, [isOpen, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const webpFile = await convertToWebP(file);
      const publicUrl = await uploadImageAndSaveMetadata(webpFile, file.name);

      setPendingImage({
        src: publicUrl,
        alt: '',
        caption: '',
        alignment: 'center',
        linkUrl: ''
      });
      setModalMode('configure');

    } catch (error: any) {
      console.error("Lỗi xử lý ảnh:", error);
      alert(error.message || "Có lỗi xảy ra khi tải ảnh lên!");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Xử lý khi click chọn một ảnh có sẵn từ thư viện
  const handleSelectFromGallery = (img: any) => {
    setPendingImage({
      src: img.public_url,
      alt: '', // Bắt buộc nhập alt mới hoặc bổ sung cho block này để chuẩn SEO
      caption: '',
      alignment: 'center',
      linkUrl: ''
    });
    setModalMode('configure');
  };

  // Thao tác xóa ảnh tận gốc ngay tại ô hiển thị
  const handleDeleteImage = async (e: React.MouseEvent, img: any) => {
    e.stopPropagation(); // Chặn sự kiện click chọn ảnh
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ảnh "${img.filename}" khỏi hệ thống? Thao tác này không thể hoàn tác.`);
    if (!confirmDelete) return;

    try {
      setIsLoadingGallery(true);
      await deleteImageFromStorageAndDb(img.id, img.storage_path);
      // Cập nhật lại UI lập tức sau khi xóa thành công
      setImages(images.filter(i => i.id !== img.id));
    } catch (error: any) {
      console.error("Lỗi khi xóa ảnh:", error);
      alert(error.message || "Không thể xóa ảnh!");
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleConfirmInsertion = () => {
    if (!pendingImage.alt.trim()) return; 
    
    onSelectImage(
      pendingImage.src,
      pendingImage.alt.trim(),
      pendingImage.caption.trim(),
      pendingImage.alignment,
      pendingImage.linkUrl.trim()
    );
    
    setModalMode('tabs');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[600px]">
        
        {modalMode === 'tabs' ? (
          <>
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className={`font-medium text-sm pb-1 border-b-2 transition-colors ${
                    activeTab === 'gallery' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Thư viện ảnh ({images.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`font-medium text-sm pb-1 border-b-2 transition-colors ${
                    activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tải lên (Upload)
                </button>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white relative">
              {(isUploading || isLoadingGallery) && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <svg className="animate-spin w-10 h-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <p className="text-sm font-medium text-gray-700">Đang đồng bộ dữ liệu đám mây...</p>
                </div>
              )}

              {activeTab === 'gallery' && (
                <div>
                  {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <p>Thư viện trống. Hãy chuyển sang tab Tải lên để đẩy ảnh mới!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {images.map((img) => (
                        <div 
                          key={img.id}
                          onClick={() => handleSelectFromGallery(img)}
                          className="group/card relative aspect-square bg-gray-50 border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                        >
                          <img src={img.public_url} alt={img.filename} className="w-full h-full object-cover" />
                          
                          {/* Phủ đen nhẹ mờ tên file */}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 transform translate-y-full group-hover/card:translate-y-0 transition-transform">
                            <p className="text-[10px] text-white truncate text-center">{img.filename}</p>
                          </div>

                          {/* NÚT XÓA ẢNH TẬN GỐC HỆ THỐNG */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteImage(e, img)}
                            className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity shadow-sm"
                            title="Xóa vĩnh viễn khỏi bộ nhớ"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors relative">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    <p className="text-sm font-medium text-gray-700">Click để chọn ảnh hoặc kéo thả vào đây</p>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 py-2 text-sm font-medium cursor-pointer shadow-sm">
                      Chọn tệp tin
                    </label>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-amber-50">
              <h3 className="font-bold text-sm text-amber-900 uppercase tracking-wide flex items-center">
                <svg className="w-4 h-4 mr-1.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Cấu hình thuộc tính SEO bắt buộc
              </h3>
              <button type="button" onClick={() => setModalMode('tabs')} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex justify-center bg-gray-50 p-4 rounded-lg border border-gray-100 max-h-[350px]">
                <img src={pendingImage.src} alt="Preview" className="max-w-full max-h-[300px] object-contain rounded shadow-sm" />
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="modal-alt" className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                    Alt Text (Mô tả ảnh cho Google) <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-alt"
                    required
                    placeholder="VD: may-chieu-mini-beonmax-x8-chinh-hang"
                    value={pendingImage.alt}
                    onChange={(e) => setPendingImage({ ...pendingImage, alt: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none bg-amber-50/20"
                  />
                  <p className="text-xs text-gray-400 mt-1">Từ khóa SEO ngăn cách bằng dấu gạch ngang, không chứa ký tự đặc biệt.</p>
                </div>

                <div>
                  <label htmlFor="modal-caption" className="block text-sm font-medium text-gray-700 mb-1">Chú thích ảnh (Caption - Tùy chọn)</label>
                  <input
                    type="text"
                    id="modal-caption"
                    placeholder="VD: Cận cảnh các cổng kết nối phía sau máy chiếu..."
                    value={pendingImage.caption}
                    onChange={(e) => setPendingImage({ ...pendingImage, caption: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="modal-aff-url" className="block text-sm font-medium text-blue-700 mb-1">Link Affiliate bọc ngoài ảnh (Tùy chọn)</label>
                  {/* ĐÃ FIX: Chuyển sang type="text" để tránh bẫy chặn submit ẩn của HTML5 form */}
                  <input
                    type="text"
                    id="modal-aff-url"
                    placeholder="https://shopee.vn/link-affiliate-cua-ban..."
                    value={pendingImage.linkUrl}
                    onChange={(e) => setPendingImage({ ...pendingImage, linkUrl: e.target.value })}
                    className="block w-full px-3 py-2 border border-blue-200 bg-blue-50/10 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm outline-none text-blue-900"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setModalMode('tabs')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={!pendingImage.alt.trim()}
                onClick={handleConfirmInsertion}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                Chèn vào bài viết
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}