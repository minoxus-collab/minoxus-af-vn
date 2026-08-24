// src/logic/image.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

// 1. Upload ảnh WebP lên Storage và lưu Metadata
export async function uploadImageAndSaveMetadata(webpFile: File, originalName: string) {
  const fileName = `${Date.now()}-${originalName.replace(/\.[^.]+$/, '.webp').replace(/\s+/g, '-')}`;

  const { data, error: uploadError } = await supabaseClient.storage
    .from('post-images')
    .upload(fileName, webpFile, { 
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw new Error(`Lỗi upload Storage: ${uploadError.message}`);

  const { data: { publicUrl } } = supabaseClient.storage
    .from('post-images')
    .getPublicUrl(data.path);

  const { error: dbError } = await supabaseClient.from('images').insert({
    filename: originalName, 
    storage_path: data.path,
    public_url: publicUrl,
    size_bytes: webpFile.size,
  });

  if (dbError) throw new Error(`Lỗi lưu Metadata: ${dbError.message}`);

  return publicUrl;
}

// 2. TÍNH NĂNG MỚI: Lấy tất cả ảnh từ bảng quản lý hệ thống
export async function getAllImages() {
  const { data, error } = await supabaseClient
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
}

// 3. TÍNH NĂNG MỚI: Xóa ảnh song song trên cả Storage lẫn Database
export async function deleteImageFromStorageAndDb(id: string, storagePath: string) {
  // Xóa file vật lý trên Supabase Storage trước
  const { error: storageError } = await supabaseClient.storage
    .from('post-images')
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Không thể xóa file trên Storage: ${storageError.message}`);
  }

  // Xóa dòng ghi chú metadata trong Database sau
  const { error: dbError } = await supabaseClient
    .from('images')
    .delete()
    .eq('id', id);

  if (dbError) {
    throw new Error(`Không thể xóa dữ liệu trong Database: ${dbError.message}`);
  }

  return { success: true };
}