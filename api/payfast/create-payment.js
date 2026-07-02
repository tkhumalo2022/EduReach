import {
  createPaymentSignature,
  formatPayFastAmount,
  getMissingPayFastConfig,
  getRequestOrigin,
  readPayFastConfig
} from "../../src/lib/payfast.js";
import {
  createOrderAccessToken,
  createOrder,
  hashOrderAccessToken,
  parsePriceToCents,
  saveOrder,
  serializeOrderAccessCookie,
  toPublicOrder
} from "../../src/lib/orders.js";
import { getContentBySlug } from "../../src/lib/wixContent.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../../src/lib/security.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_TYPES = new Set(["ebooks", "downloads"]);
const MAX_CART_ITEMS = 50;
const MAX_QUANTITY = 99;
const CHECKOUT_BODY_LIMIT_BYTES = 32 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "checkout",
    limit: 20,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  let body;

  try {
    body = await readJsonBody(request, { maxBytes: CHECKOUT_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid checkout payload."
    });
  }

  const customer = normalizeCustomer(body.customer);
  const cartLines = normalizeCartLines(body.items);

  if (!customer.name || !customer.surname || !EMAIL_PATTERN.test(customer.email)) {
    return sendJson(response, 400, {
      ok: false,
      message: "Name, surname and a valid email address are required."
    });
  }

  if (!cartLines.length) {
    return sendJson(response, 400, {
      ok: false,
      message: "Your cart is empty."
    });
  }

  if (cartLines.length > MAX_CART_ITEMS) {
    return sendJson(response, 400, {
      ok: false,
      message: "Your cart has too many items for one checkout."
    });
  }

  const config = readPayFastConfig();
  const missing = getMissingPayFastConfig(config);

  if (missing.length) {
    console.error("PayFast environment variables are missing.", { missing });
    return sendJson(response, 503, {
      ok: false,
      message: "PayFast checkout is not configured yet."
    });
  }

  let orderItems;

  try {
    orderItems = await loadOrderItems(cartLines);
  } catch (error) {
    const status = error.statusCode || 400;
    return sendJson(response, status, {
      ok: false,
      message: error.publicMessage || "The cart could not be validated."
    });
  }

  const amountCents = orderItems.reduce((sum, item) => sum + item.amountCents, 0);

  if (amountCents <= 0) {
    return sendJson(response, 400, {
      ok: false,
      message: "The selected products are not payable."
    });
  }

  const accessToken = createOrderAccessToken();
  const order = createOrder({
    customer,
    items: orderItems,
    amountCents,
    currency: "ZAR",
    mode: config.mode,
    accessTokenHash: hashOrderAccessToken(accessToken)
  });
  await saveOrder(order);
  response.setHeader("Set-Cookie", serializeOrderAccessCookie(order.id, accessToken));

  const origin = getRequestOrigin(request);
  const fields = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${origin}/payment-success?order=${encodeURIComponent(order.id)}`,
    cancel_url: `${origin}/payment-cancelled?order=${encodeURIComponent(order.id)}`,
    notify_url: `${origin}/api/payfast/notify`,
    name_first: customer.name,
    name_last: customer.surname,
    email_address: customer.email,
    m_payment_id: order.id,
    amount: formatPayFastAmount(amountCents),
    item_name: "EduReach Digital Resources",
    item_description: orderItems
      .map((item) => `${item.quantity} x ${item.title}`)
      .join("; ")
      .slice(0, 255),
    custom_str1: order.id,
    custom_str2: "EduReach digital marketplace"
  };

  fields.signature = createPaymentSignature(fields, config.passphrase);

  return sendJson(response, 200, {
    ok: true,
    paymentUrl: config.endpoint,
    fields,
    orderAccessToken: accessToken,
    order: toPublicOrder(order)
  });
}

async function loadOrderItems(cartLines) {
  const items = [];

  for (const line of cartLines) {
    const result = await getContentBySlug(line.type, line.slug, {
      includePaidFile: true
    });

    if (!result.configured) {
      const error = new Error("Wix CMS is not configured.");
      error.statusCode = 503;
      error.publicMessage = "The product catalogue is not configured yet.";
      throw error;
    }

    const product = result.item;

    if (!product || product.accessType !== "paid") {
      const error = new Error("Product is not available for checkout.");
      error.publicMessage = "One or more cart items are no longer available for purchase.";
      throw error;
    }

    if (line.id && product.id && line.id !== product.id) {
      const error = new Error("Product identity mismatch.");
      error.publicMessage = "One or more cart items could not be verified.";
      throw error;
    }

    const unitAmountCents = parsePriceToCents(product.price);

    if (unitAmountCents <= 0) {
      const error = new Error("Product price is invalid.");
      error.publicMessage = `${product.title || "A product"} does not have a valid paid price.`;
      throw error;
    }

    items.push({
      id: product.id,
      type: product.type,
      slug: product.slug,
      title: product.title || "EduReach resource",
      quantity: line.quantity,
      unitAmountCents,
      amountCents: unitAmountCents * line.quantity,
      currency: product.currency || "ZAR",
      image: product.image,
      fileUrl: product.fileUrl,
      fileType: product.fileType || "PDF"
    });
  }

  return items;
}

function normalizeCartLines(items) {
  const combined = new Map();

  for (const rawItem of Array.isArray(items) ? items : []) {
    const type = clean(rawItem?.type);
    const slug = slugify(rawItem?.slug);
    const id = clean(rawItem?.id);
    const quantity = Number(rawItem?.quantity);

    if (!PRODUCT_TYPES.has(type) || !slug) continue;
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) continue;

    const key = `${type}:${slug}`;
    const existing = combined.get(key);

    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + Math.trunc(quantity));
    } else {
      combined.set(key, {
        id,
        type,
        slug,
        quantity: Math.trunc(quantity)
      });
    }
  }

  return [...combined.values()];
}

function normalizeCustomer(customer = {}) {
  return {
    name: clean(customer.name).slice(0, 100),
    surname: clean(customer.surname).slice(0, 100),
    email: clean(customer.email).toLowerCase().slice(0, 254)
  };
}

function clean(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
