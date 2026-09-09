// src/pages/api/contact.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // 1. Kiểm tra dữ liệu đầu vào
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Vui lòng điền đầy đủ thông tin' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Gửi Email thông báo qua Resend bằng fetch
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Minoxus Space <onboarding@resend.dev>', // Email mặc định của Resend để test
        to: ['nminhwork10@gmail.com'], // TODO: Đổi thành Email cá nhân của Minox
        reply_to: email, // Thuộc tính này giúp bạn ấn Reply trong Gmail là nó tự điền email của khách
        subject: `[Minoxus Space] Tin nhắn liên hệ từ ${name}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #2C6B9E; text-transform: uppercase;">Có tin nhắn mới từ Website</h2>
            <p><strong>Người gửi:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p><strong>Nội dung:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #eee; white-space: pre-wrap;">${message}</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error('Lỗi khi gửi email qua Resend:', errorText);
      throw new Error('Lỗi kết nối máy chủ gửi mail');
    }

    // 3. Trả về kết quả thành công cho Frontend
    return new Response(JSON.stringify({ success: true }), { 
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