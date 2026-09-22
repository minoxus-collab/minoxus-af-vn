// src/logic/appNote.ts
import { supabase } from '../data/supabase';

export type NoteLabel = 'link' | 'code' | 'prompt' | 'note_thuong' | 'image';
// Lấy danh sách Project
export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('pinned', { ascending: false })
    .order('last_activity_at', { ascending: false });
    
  if (error) {
    console.error('Lỗi tải projects:', error);
    return [];
  }
  return data;
}

// Lấy danh sách Note của 1 Project cụ thể
export async function fetchNotes(projectId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      attachments (*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Lỗi tải notes:', error);
    return [];
  }
  return data;
}

// Thêm một Note mới
export async function createNote(projectId: string, content: string, label: string = 'note_thuong') {
  const { data, error } = await supabase
    .from('notes')
    .insert([{ project_id: projectId, content, label }])
    .select()
    .single();
    
  if (error) {
    console.error('Lỗi tạo note:', error);
    return null;
  }
  
  // Cập nhật lại thời gian last_activity_at cho project
  await supabase
    .from('projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', projectId);
    
  return data;
}

// Thêm một Project mới
export async function createProject(name: string, type: string = 'other') {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, type }])
    .select()
    .single();
    
  if (error) {
    console.error('Lỗi tạo project:', error);
    return null;
  }
  return data;
}

// Hàm chuẩn hóa tiếng Việt (xóa dấu, chuyển chữ thường) để Fuzzy Search
export function normalizeVietnamese(str: string | null | undefined) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
}

// Kéo toàn bộ Projects + Notes + Attachments về để tạo Index tìm kiếm
export async function fetchSearchIndex() {
  const [projectsRes, notesRes] = await Promise.all([
    supabase.from('projects').select('*').order('last_activity_at', { ascending: false }),
    supabase.from('notes').select('*, attachments(*)')
  ]);

  return {
    projects: projectsRes.data || [],
    notes: notesRes.data || []
  };
}

// Lấy chi tiết 1 Project
export async function fetchProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  if (error) console.error('Lỗi lấy project:', error);
  return data;
}

// Cập nhật Tags cho Project
export async function updateProjectTags(projectId: string, tags: string[]) {
  const { data, error } = await supabase
    .from('projects')
    .update({ tags })
    .eq('id', projectId)
    .select()
    .single();
  if (error) console.error('Lỗi cập nhật tags:', error);
  return data;
}

// Lấy tất cả các Tags đang có trong hệ thống để Autocomplete
export async function fetchAllTags() {
  const { data, error } = await supabase.from('projects').select('tags');
  if (error) return [];
  const tagSet = new Set<string>();
  data.forEach(p => p.tags?.forEach((t: string) => tagSet.add(t)));
  return Array.from(tagSet);
}

// Lấy danh sách toàn bộ Folder
export async function fetchFolders() {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) console.error('Lỗi lấy folders:', error);
  return data || [];
}

// Tạo Folder mới
export async function createFolder(name: string) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name }])
    .select()
    .single();
  if (error) console.error('Lỗi tạo folder:', error);
  return data;
}

// Gắn Project vào Folder (hoặc gỡ ra nếu folderId = null)
export async function assignProjectToFolder(projectId: string, folderId: string | null) {
  const { data, error } = await supabase
    .from('projects')
    .update({ folder_id: folderId })
    .eq('id', projectId)
    .select()
    .single();
  if (error) console.error('Lỗi chuyển folder:', error);
  return data;
}

// ================= CRUD SỬA / XÓA =================

export async function updateProject(id: string, name: string) {
  const { data } = await supabase.from('projects').update({ name }).eq('id', id).select().single();
  return data;
}
export async function deleteProject(id: string) {
  await supabase.from('projects').delete().eq('id', id);
}

export async function updateFolder(id: string, name: string) {
  const { data } = await supabase.from('folders').update({ name }).eq('id', id).select().single();
  return data;
}
export async function deleteFolder(id: string) {
  // Gỡ folder_id của các project bên trong trước khi xóa thư mục
  await supabase.from('projects').update({ folder_id: null }).eq('folder_id', id);
  await supabase.from('folders').delete().eq('id', id);
}

export async function updateNote(id: string, content: string) {
  const { data } = await supabase.from('notes').update({ content }).eq('id', id).select().single();
  return data;
}


// ================= XỬ LÝ HÌNH ẢNH & FILE =================

// Cấu hình giới hạn
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadImageAndCreateNote(projectId: string, file: File, caption: string) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Chỉ hỗ trợ định dạng JPG, PNG, WEBP, GIF');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Dung lượng ảnh tối đa là 5MB');
  }

  // 1. Upload file vật lý lên Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('app-attachments')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // 2. Lấy link public của ảnh
  const { data: { publicUrl } } = supabase.storage
    .from('app-attachments')
    .getPublicUrl(fileName);

  // 3. Tạo Note với nhãn 'image'
  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert([{ project_id: projectId, content: caption, label: 'image' }])
    .select().single();

  if (noteError || !note) throw noteError;

  // 4. Lưu thông tin file vào bảng attachments
  await supabase.from('attachments').insert([{
    note_id: note.id,
    type: 'image',
    url: publicUrl,
    file_name: file.name,
    size: file.size,
    mime_type: file.type
  }]);

  // Cập nhật last_activity_at
  await supabase.from('projects').update({ last_activity_at: new Date().toISOString() }).eq('id', projectId);

  // 5. Trả về Note kèm data attachment để cập nhật UI
  const { data: fullNote } = await supabase
    .from('notes')
    .select('*, attachments(*)')
    .eq('id', note.id)
    .single();

  return fullNote;
}

// GHI ĐÈ hàm deleteNote này để sửa lỗi không xóa được ảnh
export async function deleteNote(id: string) {
  try {
    // 1. Tìm xem Note này có ảnh không
    const { data: attachments } = await supabase.from('attachments').select('url').eq('note_id', id);
    
    // 2. Nếu có, xóa file vật lý trên Storage
    if (attachments && attachments.length > 0) {
      const paths = attachments.map(a => {
        const parts = a.url.split('/');
        return parts[parts.length - 1]; // Lấy tên file ở cuối URL
      });
      await supabase.storage.from('app-attachments').remove(paths);
    }

    // 3. Xóa dữ liệu trong bảng attachments (Giải quyết lỗi Foreign Key)
    await supabase.from('attachments').delete().eq('note_id', id);

    // 4. Cuối cùng mới xóa Note trong bảng notes
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
    
  } catch (error) {
    console.error('Lỗi khi xóa ghi chú:', error);
    alert('Không thể xóa ghi chú này. Vui lòng kiểm tra lại Console!');
  }
}
