// src/pages/api/checkout.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { product_id, product_name, customer_name, customer_phone, customer_address, customer_note, selected_attributes } = data;

    // 1. CHUẨN BỊ NỘI DUNG GỬI ĐI
    // Gộp phân loại và lưu ý vào địa chỉ để lưu vào bảng orders (vì bảng orders không có 2 cột này)
    const fullAddressForDB = `${customer_address}\n\n[Phân loại]: ${selected_attributes || 'Không có'}\n[Lưu ý]: ${customer_note || 'Không có'}`;

    // 2. GỌI API LƯU VÀO SUPABASE (Bảng orders)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          product_id: product_id,
          customer_name: customer_name,
          customer_phone: customer_phone,
          customer_address: fullAddressForDB,
          status: 'pending'
        })
      });
    }

    // 3. GỌI API RESEND ĐỂ BẮN EMAIL CHO BẠN
    const resendApiKey = import.meta.env.RESEND_API_KEY; // Bạn cần thêm biến này vào file .env
    
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Minoxus Store <onboarding@resend.dev>', // Email gửi (Dùng mặc định của Resend khi test)
          to: 'nminhwork10@gmail.com', // Email nhận của bạn
          subject: `🛒 ĐƠN HÀNG MỚI: ${product_name}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2C6B9E;">BẠN CÓ ĐƠN HÀNG MỚI!</h2>
              <p><strong>Sản phẩm:</strong> ${product_name}</p>
              <p><strong>Phân loại (Màu/Size):</strong> ${selected_attributes || 'Không'}</p>
              <hr style="border: none; border-top: 1px solid #eee; my: 20px;" />
              <h3>Thông tin khách hàng:</h3>
              <p><strong>Tên khách:</strong> ${customer_name}</p>
              <p><strong>Số điện thoại:</strong> ${customer_phone}</p>
              <p><strong>Địa chỉ:</strong> ${customer_address}</p>
              <p><strong>Lưu ý từ khách:</strong> <span style="color: #d97706;">${customer_note || 'Không có'}</span></p>
              <br/>
              <p>Hãy liên hệ với khách qua Zalo/SĐT để chốt đơn nhé!</p>
            </div>
          `
        })
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Đặt hàng thành công!" }), { status: 200 });

  } catch (error) {
    console.error("Lỗi khi checkout:", error);
    return new Response(JSON.stringify({ success: false, message: "Lỗi hệ thống!" }), { status: 500 });
  }
}