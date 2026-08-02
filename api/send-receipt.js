// /api/send-receipt.js
// Vercel serverless function: emails the PDF receipt via Resend.
// Requires the RESEND_API_KEY environment variable (Vercel > Settings > Environment Variables).
// Optional: RESEND_FROM_EMAIL (e.g. "SLAY. <orders@yourdomain.com>").
// Without a verified domain on Resend, the default sender "onboarding@resend.dev" works
// for testing but can only send to the email address associated with your Resend account.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, orderRef, customerName, pdfBase64 } = req.body || {};

    if (!to || !pdfBase64 || !orderRef) {
      return res.status(400).json({ error: 'Missing required fields (to, orderRef, pdfBase64).' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server.' });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'SLAY. <onboarding@resend.dev>';

    const emailPayload = {
      from: fromEmail,
      to: [to],
      subject: `Your SLAY. receipt — Order ${orderRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
          <h2 style="letter-spacing:2px;">SLAY.</h2>
          <p>Hi ${customerName || ''},</p>
          <p>Thank you for your order <strong>${orderRef}</strong>!</p>
          <p>Your receipt is attached to this email.</p>
          <p>Our team will be in touch shortly to confirm delivery.</p>
          <p style="margin-top:24px; color:#888; font-size:12px;">SLAY. — Wear it • Love it • Slay it</p>
        </div>
      `,
      attachments: [
        {
          filename: `${orderRef}.pdf`,
          content: pdfBase64
        }
      ]
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || 'Resend error', details: data });
    }

    return res.status(200).json({ success: true, id: data?.id || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error.' });
  }
}
