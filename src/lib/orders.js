const ORDER_STORE = globalThis.__EDUREACH_ORDER_STORE__ || new Map();
globalThis.__EDUREACH_ORDER_STORE__ = ORDER_STORE;

const ORDER_STATUSES = Object.freeze({
  pending: "pending",
  paid: "paid",
  cancelled: "cancelled",
  failed: "failed"
});

export function createOrder({ customer, items, amountCents, currency = "ZAR", mode = "sandbox" }) {
  const now = new Date().toISOString();
  const order = {
    id: createOrderId(),
    customer: {
      name: text(customer?.name),
      surname: text(customer?.surname),
      email: text(customer?.email).toLowerCase()
    },
    items: items.map((item) => ({
      id: text(item.id),
      type: text(item.type),
      slug: text(item.slug),
      title: text(item.title),
      quantity: positiveInteger(item.quantity),
      unitAmountCents: positiveInteger(item.unitAmountCents),
      amountCents: positiveInteger(item.amountCents),
      currency: text(item.currency || currency),
      image: item.image || null,
      fileUrl: text(item.fileUrl),
      fileType: text(item.fileType || "PDF")
    })),
    amountCents: positiveInteger(amountCents),
    currency,
    mode,
    status: ORDER_STATUSES.pending,
    createdAt: now,
    updatedAt: now,
    payment: null
  };

  ORDER_STORE.set(order.id, order);
  return order;
}

export function getOrder(orderId) {
  return ORDER_STORE.get(text(orderId)) || null;
}

export function markOrderPaid(orderId, payment = {}) {
  const order = getOrder(orderId);
  if (!order) return null;

  order.status = ORDER_STATUSES.paid;
  order.updatedAt = new Date().toISOString();
  order.payment = {
    provider: "PayFast",
    pfPaymentId: text(payment.pfPaymentId),
    status: text(payment.status || "COMPLETE"),
    amountGross: text(payment.amountGross),
    amountFee: text(payment.amountFee),
    amountNet: text(payment.amountNet)
  };
  ORDER_STORE.set(order.id, order);
  return order;
}

export function markOrderCancelled(orderId) {
  const order = getOrder(orderId);
  if (!order) return null;

  order.status = ORDER_STATUSES.cancelled;
  order.updatedAt = new Date().toISOString();
  ORDER_STORE.set(order.id, order);
  return order;
}

export function markOrderFailed(orderId, payment = {}) {
  const order = getOrder(orderId);
  if (!order) return null;

  order.status = ORDER_STATUSES.failed;
  order.updatedAt = new Date().toISOString();
  order.payment = {
    provider: "PayFast",
    status: text(payment.status || "FAILED")
  };
  ORDER_STORE.set(order.id, order);
  return order;
}

export function toPublicOrder(order, options = {}) {
  if (!order) return null;
  const includeDownloads = options.includeDownloads === true && order.status === ORDER_STATUSES.paid;

  return {
    id: order.id,
    customer: order.customer,
    items: order.items.map((item) => ({
      id: item.id,
      type: item.type,
      slug: item.slug,
      title: item.title,
      quantity: item.quantity,
      unitAmountCents: item.unitAmountCents,
      amountCents: item.amountCents,
      currency: item.currency,
      image: item.image,
      fileType: item.fileType,
      downloadUrl: includeDownloads ? item.fileUrl : ""
    })),
    amountCents: order.amountCents,
    currency: order.currency,
    status: order.status,
    date: order.createdAt,
    updatedAt: order.updatedAt,
    payment: order.payment
  };
}

export function parsePriceToCents(price) {
  if (typeof price === "number") {
    return Number.isFinite(price) ? Math.round(price * 100) : 0;
  }

  const normalized = String(price || "")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function createOrderId() {
  const stamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ER-${stamp}-${random}`;
}

function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function text(value) {
  return String(value || "").trim();
}
