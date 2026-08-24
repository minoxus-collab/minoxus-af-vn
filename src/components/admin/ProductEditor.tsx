import React, { useState, useRef, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import Editor from '../../editor/Editor'; 
import { upsertProduct } from '../../logic/product';
import { supabase } from '../../data/supabase';

// --- TYPE DEFINITIONS ---
interface ImageItem {
  id: string;
  url: string;
  alt: string;
}

interface AttributeItem {
  name: string;
  value: string;
}

interface ProductData {
  id?: string;
  title?: string;
  slug?: string;
  sku?: string;
  status?: string;
  product_type?: string;
  category?: string | null;
  brand?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  weight?: number | string | null;
  weight_unit?: string | null;
  stock_status?: string | null;
  cta_text?: string | null;
  affiliate_link?: string | null;
  content?: any;
  meta_title?: string;
  meta_description?: string;
  gallery?: ImageItem[];
  attributes?: AttributeItem[];
  [key: string]: any; 
}

interface ProductEditorProps {
  initialData?: ProductData | null;
}
// ------------------------

export default function ProductEditor({ initialData = null }: ProductEditorProps) {
  // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
  const [loading, setLoading] = useState(false);

  // Nhóm Cơ bản
  const [title, setTitle] = useState(initialData?.title || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [isSlugEdited, setIsSlugEdited] = useState(!!initialData?.slug);
  const [sku, setSku] = useState(initialData?.sku || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');

  // Nhóm Phân loại & Thương hiệu
  const [productType, setProductType] = useState<string>(initialData?.product_type || 'handmade');
  const [category, setCategory] = useState<{ label: string; value: string } | null>(
    initialData?.category ? { label: initialData.category, value: initialData.category } : null
  );
  const [brand, setBrand] = useState<{ label: string; value: string } | null>(
    initialData?.brand ? { label: initialData.brand, value: initialData.brand } : null
  );

  // Nhóm Handmade
  const [price, setPrice] = useState(initialData?.price || '');
  const [compareAtPrice, setCompareAtPrice] = useState(initialData?.compare_at_price || '');
  const [weight, setWeight] = useState(initialData?.weight || '');
  const [weightUnit, setWeightUnit] = useState(initialData?.weight_unit || 'gram');
  const [stockStatus, setStockStatus] = useState(initialData?.stock_status || 'in_stock');

  // Nhóm Affiliate
  const [ctaText, setCtaText] = useState(initialData?.cta_text || 'Mua ngay');
  const [affiliateLink, setAffiliateLink] = useState(initialData?.affiliate_link || '');
  const [affiliateOptions, setAffiliateOptions] = useState<{ label: string; value: string }[]>([]);

  // Nhóm Content & SEO
  const [content, setContent] = useState<any>(initialData?.content || []);
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || '');

  // Nhóm Media (Gallery)
  const [gallery, setGallery] = useState<ImageItem[]>(initialData?.gallery || []);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Nhóm Thuộc tính động
  const [attributes, setAttributes] = useState<AttributeItem[]>(initialData?.attributes || []);

  // Hàm tiện ích: Ép nén mọi loại ảnh sang WebP ngay trên trình duyệt
const compressToWebP = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Tự động thu nhỏ nếu ảnh lớn hơn 1920px để tối ưu Web
        const MAX_WIDTH = 1920;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Nén sang định dạng webp với chất lượng 80% (0.8)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Lỗi chuyển đổi Canvas sang Blob'));
        }, 'image/webp', 0.8);
      };
    };
    reader.onerror = error => reject(error);
  });
};
  // --- LẮNG NGHE & TỰ ĐỘNG ---

  // 1. Tự động tạo slug khi gõ tên sản phẩm
  useEffect(() => {
    if (!initialData?.id && !isSlugEdited && title) {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/([^0-9a-z-\s])/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, initialData?.id, isSlugEdited]);

  // 2. Fetch danh sách Affiliate Link từ DB
  useEffect(() => {
    const fetchAffiliateLinks = async () => {
      try {
        // Đảm bảo đường dẫn này trỏ tới file supabase.ts của bạn
        const { supabase } = await import('../../logic/affiliate'); 
        
        const { data, error } = await supabase
          .from('affiliate_links') // Đổi thành 'affiliates' nếu tên bảng của bạn khác
          .select('id, name, url, platform')
          .order('created_at', { ascending: false });
        
        if (data && !error) {
          const options = data.map((item: any) => ({
            label: `[${item.platform || 'Link'}] ${item.name}`,
            value: item.url 
          }));
          setAffiliateOptions(options);
        }
      } catch (error) {
        console.error('Lỗi lấy danh sách Affiliate Link:', error);
      }
    };

    fetchAffiliateLinks();
  }, []);

  // --- 2. LOGIC KÉO THẢ ẢNH (DRAG & DROP) ---
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    let _gallery = [...gallery];
    const draggedItemContent = _gallery.splice(dragItem.current, 1)[0];
    _gallery.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setGallery(_gallery);
  };

const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Bật trạng thái loading để vô hiệu hóa nút submit tạm thời
    setLoading(true);
    
    try {
      const uploadedImages: ImageItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Nén ảnh sang WebP
        const webpBlob = await compressToWebP(file);
        
        // 2. Tạo tên file độc nhất (chống trùng lặp)
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        
        // 3. Đẩy lên bucket 'products' của Supabase
        const { data, error } = await supabase.storage
          .from('products')
          .upload(fileName, webpBlob, { 
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false 
          });

        if (error) throw error;

        // 4. Lấy public URL thật của ảnh vừa up
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);

        // 5. Đưa vào mảng
        uploadedImages.push({
          id: fileName,
          url: publicUrlData.publicUrl,
          alt: file.name.replace(/\.[^/.]+$/, "") // Lấy tên file gốc làm thẻ Alt SEO mặc định
        });
      }
      
      // Nối ảnh mới vào thư viện ảnh hiện tại
      setGallery(prev => [...prev, ...uploadedImages]);
      
    } catch (error: any) {
      console.error('Lỗi upload ảnh:', error);
      alert('Lỗi khi tải ảnh lên: ' + error.message);
    } finally {
      setLoading(false);
      // Reset input file để có thể up lại cùng 1 file nếu cần
      e.target.value = ''; 
    }
  };

  const updateImageAlt = (index: number, altText: string) => {
    const _gallery = [...gallery];
    _gallery[index].alt = altText;
    setGallery(_gallery);
  };

  const removeImage = (index: number) => {
    const _gallery = [...gallery];
    _gallery.splice(index, 1);
    setGallery(_gallery);
  };

  // --- 3. LOGIC THUỘC TÍNH ĐỘNG ---
  const addAttribute = () => setAttributes([...attributes, { name: '', value: '' }]);
  const updateAttribute = (index: number, field: 'name' | 'value', val: string) => {
    const _attrs = [...attributes];
    _attrs[index][field] = val;
    setAttributes(_attrs);
  };
  const removeAttribute = (index: number) => {
    const _attrs = [...attributes];
    _attrs.splice(index, 1);
    setAttributes(_attrs);
  };

  // --- 4. HÀM SUBMIT FORM ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: ProductData = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      title,
      slug,
      sku,
      status,
      product_type: productType,
      category: category?.value || null,
      brand: brand?.value || null,
      gallery,
      attributes,
      content,
      meta_title: metaTitle,
      meta_description: metaDescription,
      price: productType === 'handmade' && price !== '' ? Number(price) : null,
      compare_at_price: productType === 'handmade' && compareAtPrice !== '' ? Number(compareAtPrice) : null,
      weight: productType === 'handmade' && weight !== '' ? Number(weight) : null,
      weight_unit: productType === 'handmade' ? weightUnit : null,
      stock_status: productType === 'handmade' ? stockStatus : null,
      cta_text: productType === 'affiliate' ? ctaText : null,
      affiliate_link: productType === 'affiliate' ? affiliateLink : null
    };

    try {
      const { error } = await upsertProduct(payload);
      if (error) throw error;
      alert(initialData?.id ? 'Cập nhật sản phẩm thành công!' : 'Tạo sản phẩm mới thành công!');
      window.location.href = '/admin/products'; 
    } catch (err: any) {
      console.error('Lỗi khi lưu sản phẩm:', err);
      alert('Không thể lưu sản phẩm: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER GIAO DIỆN ---
  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6 pb-24">
      
      {/* 1. Nhóm Cơ bản */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Thông tin cơ bản</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">Tên sản phẩm *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500" 
              placeholder="Nhập tên..." 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Đường dẫn (Slug) *</label>
            <input 
              type="text" 
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setIsSlugEdited(true);
              }}
              className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500" 
              placeholder="ten-san-pham" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Mã SKU</label>
            <input 
              type="text" 
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2 border focus:ring-2 focus:ring-blue-500" 
              placeholder="VD: SP-001" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột trái (Chiếm 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Nhóm Cấu hình Rẽ nhánh */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Loại sản phẩm</h2>
              <select 
                value={productType} 
                onChange={(e) => setProductType(e.target.value)}
                className="border-gray-300 rounded-lg p-2 border font-medium text-blue-700 bg-blue-50"
              >
                <option value="handmade">Hàng Handmade (Bán trực tiếp)</option>
                <option value="affiliate">Hàng Affiliate (Chuyển hướng)</option>
              </select>
            </div>

            {/* RẼ NHÁNH: HANDMADE */}
            {productType === 'handmade' && (
              <div className="grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-lg border border-amber-100">
                <div>
                  <label className="block text-sm font-semibold mb-1">Giá bán (VNĐ)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Giá khuyến mãi</label>
                  <input 
                    type="number" 
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white" 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Khối lượng</label>
                  <div className="flex">
                    <input 
                      type="number" 
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full border-gray-300 rounded-l-lg p-2 border border-r-0 bg-white" 
                      placeholder="0" 
                    />
                    <select 
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      className="border-gray-300 rounded-r-lg p-2 border bg-gray-50"
                    >
                      <option value="gram">gram</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Trạng thái kho</label>
                  <select 
                    value={stockStatus}
                    onChange={(e) => setStockStatus(e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white"
                  >
                    <option value="in_stock">Còn hàng</option>
                    <option value="out_of_stock">Hết hàng</option>
                  </select>
                </div>
              </div>
            )}

            {/* RẼ NHÁNH: AFFILIATE */}
            {productType === 'affiliate' && (
              <div className="space-y-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div>
                  <label className="block text-sm font-semibold mb-1">Tên nút bấm (Call to Action)</label>
                  <input 
                    type="text" 
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-2 border bg-white" 
                    placeholder="VD: Mua ngay trên Shopee" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Liên kết Affiliate</label>
                  <CreatableSelect
                    isClearable
                    options={affiliateOptions}
                    value={affiliateOptions.find(opt => opt.value === affiliateLink) || (affiliateLink ? { label: affiliateLink, value: affiliateLink } : null)}
                    onChange={(newValue: any) => setAffiliateLink(newValue ? newValue.value : '')}
                    placeholder="Chọn link từ kho hoặc dán link mới..."
                    formatCreateLabel={(inputValue) => `Dùng link tùy chỉnh: "${inputValue}"`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nhóm Thuộc tính động */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Thuộc tính sản phẩm</h2>
              <button type="button" onClick={addAttribute} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium">
                + Thêm thuộc tính
              </button>
            </div>
            {attributes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Chưa có thuộc tính nào (VD: Màu sắc, Chất liệu...)</p>
            ) : (
              <div className="space-y-3">
                {attributes.map((attr, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input 
                      type="text" 
                      value={attr.name} 
                      onChange={(e) => updateAttribute(index, 'name', e.target.value)} 
                      className="w-1/3 border-gray-300 rounded-lg p-2 border text-sm" 
                      placeholder="Tên (VD: Màu sắc)" 
                    />
                    <input 
                      type="text" 
                      value={attr.value} 
                      onChange={(e) => updateAttribute(index, 'value', e.target.value)} 
                      className="flex-1 border-gray-300 rounded-lg p-2 border text-sm" 
                      placeholder="Giá trị (VD: Đen, Trắng)" 
                    />
                    <button type="button" onClick={() => removeAttribute(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nhóm Content & SEO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nội dung & SEO</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Mô tả chi tiết</label>
                <div className="border border-gray-300 rounded-lg p-2 bg-white max-h-[500px] overflow-y-auto">
                  <Editor 
                    isContentOnly={true}
                    initialBlocks={content} 
                    onChange={(blocks) => setContent(blocks)} 
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold mb-1 text-purple-700">Meta Title (SEO)</label>
                <input 
                  type="text" 
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full border-gray-300 rounded-lg p-2 border" 
                  placeholder="Tiêu đề hiển thị trên Google..." 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-purple-700">Meta Description (SEO)</label>
                <textarea 
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full border-gray-300 rounded-lg p-2 border" 
                  rows={3} 
                  placeholder="Đoạn mô tả ngắn hiển thị trên Google..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải (Chiếm 1/3) */}
        <div className="space-y-6">
          
          {/* Trạng thái, Danh mục, Nhãn hiệu */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Trạng thái xuất bản</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2 border bg-green-50 text-green-700 font-medium"
              >
                <option value="published">Đã xuất bản (Public)</option>
                <option value="draft">Bản nháp (Draft)</option>
              </select>
            </div>
            <hr />
            <div>
              <label className="block text-sm font-semibold mb-1">Danh mục</label>
              <CreatableSelect
                isClearable
                value={category}
                onChange={(newValue) => setCategory(newValue)}
                options={[{label: 'Balo', value: 'balo'}, {label: 'Ví da', value: 'vi-da'}]}
                placeholder="Chọn hoặc gõ để tạo mới..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Nhãn hiệu (Brand)</label>
              <CreatableSelect
                isClearable
                value={brand}
                onChange={(newValue) => setBrand(newValue)}
                options={[{label: 'Minoxus', value: 'minoxus'}]}
                placeholder="Chọn hoặc gõ để tạo mới..."
              />
            </div>
          </div>

          {/* Nhóm Media (Gallery Drag & Drop) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Hình ảnh (Gallery)</h2>
            
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors mb-4">
              <span className="text-sm font-medium text-blue-600">Click để tải ảnh lên</span>
              <span className="block text-xs text-gray-500 mt-1">Tự động convert sang .webp</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUploadImages} />
            </label>

            <div className="space-y-2">
              {gallery.map((img, index) => (
                <div 
                  key={img.id}
                  draggable
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200 cursor-move hover:border-blue-400"
                >
                  <div className="text-gray-400">⋮⋮</div>
                  <img src={img.url} alt="preview" className="w-12 h-12 rounded object-cover border" />
                  <input 
                    type="text" 
                    value={img.alt} 
                    onChange={(e) => updateImageAlt(index, e.target.value)}
                    placeholder="Alt text (SEO)..." 
                    className="flex-1 text-sm p-1.5 border border-gray-300 rounded" 
                  />
                  <button type="button" onClick={() => removeImage(index)} className="text-red-500 p-1 hover:bg-red-100 rounded">
                    ✖
                  </button>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* NÚT LƯU THÔNG TIN */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-end px-8 z-50">
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-8 rounded-lg shadow transition-colors"
        >
          {loading ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
        </button>
      </div>
    </form>
  );
}