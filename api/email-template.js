function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatRand(amount = 0) {
  return `R${Number(amount || 0).toFixed(2)}`;
}

export function buildPurchaseEmail(data = {}) {
  const customerName = escapeHtml(data.customerName || 'EduReach customer');
  const productTitle = escapeHtml(data.productTitle || 'EduReach Resource');
  const orderId = escapeHtml(data.orderId || 'EDU-ORDER');
  const downloadUrl = escapeHtml(data.downloadUrl || '#');
  const purchaseDate = escapeHtml(data.purchaseDate || new Date().toLocaleDateString('en-ZA'));
  const supportPhone = escapeHtml(data.supportPhone || '+27 81 214 8384');
  const amountPaid = formatRand(data.amountPaid || 0);

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f8ff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;"><div style="max-width:640px;margin:0 auto;padding:28px 16px;"><div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbeafe;"><div style="background:#063b82;padding:30px 26px;text-align:center;color:#ffffff;"><div style="font-size:30px;font-weight:800;">EduReach</div><div style="font-size:14px;margin-top:8px;">Inclusive education resources for schools, families and communities</div></div><div style="padding:32px 28px;"><h1 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Your resource is ready, ${customerName}</h1><p style="font-size:16px;line-height:1.6;color:#475569;">Thank you for your purchase from EduReach. Your payment was successful and your resource is ready to download.</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:20px;margin:24px 0;"><div style="font-size:15px;font-weight:700;color:#063b82;margin-bottom:14px;">Order Summary</div><p><strong>Customer:</strong> ${customerName}</p><p><strong>Product:</strong> ${productTitle}</p><p><strong>Amount Paid:</strong> ${amountPaid}</p><p><strong>Payment Status:</strong> <span style="color:#16a34a;font-weight:700;">Successful</span></p><p><strong>Order ID:</strong> ${orderId}</p><p><strong>Purchase Date:</strong> ${purchaseDate}</p></div><div style="text-align:center;margin:30px 0;"><a href="${downloadUrl}" style="display:inline-block;background:#063b82;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:15px 28px;border-radius:999px;">Download Resource</a></div><p style="font-size:14px;line-height:1.6;color:#64748b;text-align:center;">For your privacy, do not share this download link with anyone else.</p><div style="border-top:1px solid #e2e8f0;margin-top:28px;padding-top:22px;"><p style="font-weight:700;color:#0f172a;">Need help?</p><p style="font-size:14px;line-height:1.6;color:#64748b;">Reply to this email or contact EduReach on <strong style="color:#063b82;">${supportPhone}</strong>.</p></div></div><div style="background:#f8fafc;padding:20px 26px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">EduReach Foundation<br />Promoting inclusion in schools and communities.</p></div></div></div></body></html>`;
}
