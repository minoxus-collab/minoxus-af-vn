import { supabase } from '../data/supabase'; // Điều chỉnh đường dẫn nếu cần

// 1. Lấy danh sách sản phẩm (có phân trang, tìm kiếm, lọc)
export async function getProducts({ page = 1, limit = 10, search = '', type = '', status = '' }) {
  let query = supabase.from('products').select('*', { count: 'exact' });

  // Bộ lọc
  if (search) {
    query = query.ilike('title', `%${search}%`); // Tìm tương đối theo tên
  }
  if (type) {
    query = query.eq('product_type', type);
  }
  if (status) {
    query = query.eq('status', status);
  }

  // Phân trang
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  return { data, error, count };
}

// 2. Lấy chi tiết sản phẩm theo Slug (Dùng cho Public)
export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  return { data, error };
}

// 3. Lấy chi tiết sản phẩm theo ID (Dùng cho Admin Edit)
export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

// 4. Thêm mới hoặc Cập nhật sản phẩm (Xử lý mảng JSON mượt mà)
export async function upsertProduct(productData: any) {
  // Nếu có ID thì là update, không có là insert mới
  const isUpdate = !!productData.id;
  
  const { data, error } = await supabase
    .from('products')
    .upsert({
      ...productData,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
}

// 5. Xóa sản phẩm
export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return { error };
}