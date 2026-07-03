import crypto from "node:crypto";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_DOWNLOAD_TTL_SECONDS = 60 * 60 * 24 * 7;

export function readOrderEmailConfig(env = process.env) {
  return {
    apiKey: clean(env.RESEND_API_KEY),
    from: clean(env.EDUREACH_EMAIL_FROM),
    replyTo: clean(env.EDUREACH_EMAIL_REPLY_TO),
    downloadSecret: clean(env.EDUREACH_DOWNLOAD_LINK_SECRET),
    downloadTtlSeconds: positiveInteger(
      env.EDUREACH_EMAIL_DOWNLOAD_TTL_SECONDS,
      DEFAULT_DOWNLOAD_TTL_SECONDS
    )
  };
}

export function getMissingOrderEmailConfig(config = readOrderEmailConfig()) {
  return [
    ["RESEND_API_KEY", config.apiKey],
    ["EDUREACH_EMAIL_FROM", config.from],
    ["EDUREACH_DOWNLOAD_LINK_SECRET", config.downloadSecret]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function createEmailDownloadUrl(order, item, options = {}) {
  const config = options.config || readOrderEmailConfig(options.env);
  const origin = clean(options.origin).replace(/\/$/, "");
  if (!origin || !config.downloadSecret || order?.status !== "paid") return "";
  if (!order?.id || !item?.type || !item?.slug) return "";

  const expiresAt = resolveEmailLinkExpiry(order, config.downloadTtlSeconds);
  const params = new URLSearchParams({
    orderId: clean(order.id),
    type: clean(item.type),
    slug: clean(item.slug),
    expires: String(expiresAt),
    delivery: "email"
  });
  if (item.id) params.set("itemId", clean(item.id));
  params.set("signature", signEmailDownloadRequest(order, item, expiresAt, config.downloadSecret));

  return `${origin}/api/downloads?${params.toString()}`;
}

export function verifyEmailDownloadSignature(order, item, expires, signature, env = process.env) {
  const config = readOrderEmailConfig(env);
  const expiresAt = Number(expires);
  if (!config.downloadSecret || order?.status !== "paid") return false;
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expectedHex = signEmailDownloadRequest(
    order,
    item,
    Math.trunc(expiresAt),
    config.downloadSecret
  );
  return timingSafeHexEqual(expectedHex, signature);
}

export async function sendPaidOrderEmail(order, options = {}) {
  const config = options.config || readOrderEmailConfig(options.env);
  const missing = getMissingOrderEmailConfig(config);
  if (missing.length) {
    return {
      ok: false,
      skipped: true,
      missing,
      message: `Order email is not configured: ${missing.join(", ")}`
    };
  }

  if (order?.status !== "paid" || !clean(order?.customer?.email)) {
    return {
      ok: false,
      skipped: false,
      message: "A paid order with a customer email address is required."
    };
  }

  const origin = clean(options.origin).replace(/\/$/, "");
  const links = (order.items || [])
    .map((item) => ({
      item,
      url: createEmailDownloadUrl(order, item, { origin, config })
    }))
    .filter(({ url }) => Boolean(url));

  if (!links.length) {
    return {
      ok: false,
      skipped: false,
      message: "No secure download links could be created for this order."
    };
  }

  const payload = buildPaidOrderEmail(order, links, config);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, skipped: false, message: "Fetch API is not available." };
  }

  try {
    const resendResponse = await fetchImpl(RESEND_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `edureach-paid-order/${clean(order.id)}`
      },
      body: JSON.stringify(payload)
    });
    const responseBody = await readResponseBody(resendResponse);

    if (!resendResponse.ok) {
      return {
        ok: false,
        skipped: false,
        statusCode: resendResponse.status,
        message: extractErrorMessage(responseBody) || "Resend rejected the email request.",
        responseBody
      };
    }

    return {
      ok: true,
      skipped: false,
      emailId: clean(responseBody?.id),
      linkExpiresAt: resolveEmailLinkExpiry(order, config.downloadTtlSeconds)
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      message: error instanceof Error ? error.message : "Order email request failed."
    };
  }
}

function buildPaidOrderEmail(order, links, config) {
  const customerName = [order.customer?.name, order.customer?.surname]
    .map(clean)
    .filter(Boolean)
    .join(" ");
  const expiry = new Date(resolveEmailLinkExpiry(order, config.downloadTtlSeconds) * 1000);
  const expiryLabel = expiry.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "long",
    timeStyle: "short"
  });
  const amount = formatMoney(order.amountCents, order.currency || "ZAR");
  const htmlItems = links.map(({ item, url }) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(item.title || "EduReach resource")}</div>
        <div style="margin:4px 0 12px;color:#475569;font-size:14px;">${escapeHtml(item.fileType || "PDF")}</div>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#0b63ce;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;">Download resource</a>
      </td>
    </tr>`).join("");
  const textItems = links
    .map(({ item, url }) => `${item.title || "EduReach resource"}: ${url}`)
    .join("\n");

  const payload = {
    from: config.from,
    to: [clean(order.customer.email)],
    subject: "Your EduReach download is ready",
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
        <div style="font-size:24px;font-weight:800;color:#0b63ce;">EduReach</div>
        <h1 style="font-size:24px;margin:24px 0 10px;">Payment confirmed</h1>
        <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${escapeHtml(customerName || "there")}, thank you for your purchase. Your secure downloads are ready.</p>
        <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Order <strong>${escapeHtml(order.id)}</strong> · ${escapeHtml(amount)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">${htmlItems}</table>
        <p style="font-size:13px;color:#64748b;line-height:1.6;margin:20px 0 0;">For your security, these links expire on ${escapeHtml(expiryLabel)}. Do not forward this email.</p>
      </div>
    </div>
  </body>
</html>`,
    text: `Hi ${customerName || "there"},\n\nYour EduReach payment has been confirmed.\nOrder: ${order.id}\nTotal: ${amount}\n\n${textItems}\n\nThese secure links expire on ${expiryLabel}. Do not forward this email.`
  };

  if (config.replyTo) payload.reply_to = config.replyTo;
  return payload;
}

function resolveEmailLinkExpiry(order, ttlSeconds) {
  const paidAtMs = Date.parse(order?.updatedAt || order?.createdAt || "");
  const stableStartSeconds = Number.isFinite(paidAtMs)
    ? Math.floor(paidAtMs / 1000)
    : Math.floor(Date.now() / 1000);
  return stableStartSeconds + positiveInteger(ttlSeconds, DEFAULT_DOWNLOAD_TTL_SECONDS);
}

function signEmailDownloadRequest(order, item, expiresAt, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update([
      "email-download",
      clean(order?.id),
      clean(item?.id),
      clean(item?.type),
      clean(item?.slug),
      String(expiresAt)
    ].join("|"))
    .digest("hex");
}

function timingSafeHexEqual(expectedHex, submittedHex) {
  const expected = Buffer.from(clean(expectedHex), "hex");
  const submitted = Buffer.from(clean(submittedHex), "hex");
  return expected.length > 0 && expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted);
}

async function readResponseBody(response) {
  const text = String(await response.text()).trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractErrorMessage(body) {
  return clean(body?.message || body?.error?.message || body?.name);
}

function formatMoney(amountCents, currency) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: clean(currency) || "ZAR"
  }).format(Number(amountCents || 0) / 100);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function clean(value) {
  return String(value || "").trim();
}
