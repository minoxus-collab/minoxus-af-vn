import type { APIRoute } from 'astro';
import { supabase } from '../../data/supabase'; // Điều chỉnh đường dẫn

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { product_id, customer_name, customer_phone, customer_address, product_name } = body;

    // 1. Lưu thông tin vào bảng orders trên Supabase
    const { data: orderData, error: dbError } = await supabase
      .from('orders')
      .insert([{ 
        product_id, 
        customer_name, 
        customer_phone, 
        customer_address 
      }])
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    // 2. Gửi Email thông báo qua Resend
    // LƯU Ý: Cần có biến môi trường RESEND_API_KEY
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Minoxus Shop <onboarding@resend.dev>', // Resend cho phép dùng mail này để test
        to: ['email-cua-ban@gmail.com'], // TODO: Đổi thành Email cá nhân của Minox
        subject: `🎉 Đơn hàng mới: ${product_name}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #2563eb;">Bạn có một đơn đặt hàng Handmade mới!</h2>
            <p><strong>Sản phẩm:</strong> ${product_name}</p>
            <hr />
            <h3>Thông tin khách hàng:</h3>
            <ul>
              <li><strong>Họ tên:</strong> ${customer_name}</li>
              <li><strong>Số điện thoại:</strong> ${customer_phone}</li>
              <li><strong>Địa chỉ giao hàng:</strong> ${customer_address}</li>
            </ul>
            <p>Hãy vào hệ thống quản trị để kiểm tra chi tiết nhé!</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      console.error('Lỗi khi gửi email qua Resend:', await resendRes.text());
      // Dù lỗi gửi mail nhưng đơn đã lưu DB thì vẫn báo thành công cho khách
    }

    // 3. Trả về kết quả thành công cho Frontend
    return new Response(JSON.stringify({ success: true, order: orderData }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};