// /api/send-receipt.js
// Fonction serverless Vercel : envoie le ticket PDF par email via Resend.
// Nécessite la variable d'environnement RESEND_API_KEY (Vercel > Settings > Environment Variables).
// Optionnel : RESEND_FROM_EMAIL (ex: "SLAY. <commandes@votredomaine.com>").
// Sans domaine vérifié sur Resend, l'expéditeur par défaut "onboarding@resend.dev" fonctionne
// pour les tests mais est limité à l'email associé à votre compte Resend.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, orderRef, customerName, pdfBase64 } = req.body || {};

    if (!to || !pdfBase64 || !orderRef) {
      return res.status(400).json({ error: 'Champs manquants (to, orderRef, pdfBase64 requis).' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY n'est pas configurée sur le serveur." });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'SLAY. <onboarding@resend.dev>';

    const emailPayload = {
      from: fromEmail,
      to: [to],
      subject: `Votre ticket SLAY. — Commande ${orderRef}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#111; line-height:1.6;">
          <h2 style="letter-spacing:2px;">SLAY.</h2>
          <p>Bonjour ${customerName || ''},</p>
          <p>Merci pour votre commande <strong>${orderRef}</strong> !</p>
          <p>Vous trouverez votre ticket (facture) en pièce jointe de cet email.</p>
          <p>Notre équipe vous contactera prochainement pour confirmer la livraison.</p>
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
      return res.status(response.status).json({ error: data?.message || 'Erreur Resend', details: data });
    }

    return res.status(200).json({ success: true, id: data?.id || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erreur serveur inconnue.' });
  }
}
