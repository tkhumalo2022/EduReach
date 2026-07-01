import { getCache } from "@vercel/functions";

const PENDING_ORDER_STORE = globalThis.__EDUREACH_PENDING_ORDER_STORE__ || new Map();
const CONFIRMED_ORDER_STORE = globalThis.__EDUREACH_CONFIRMED_ORDER_STORE__ || new Map();
globalThis.__EDUREACH_PENDING_ORDER_STORE__ = PENDING_ORDER_STORE;
globalThis.__EDUREACH_CONFIRMED_ORDER_STORE__ = CONFIRMED_ORDER_STORE;

const ORDER_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;
const ORDER_CACHE_NAMESPACE = "edureach-orders";

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

  PENDING_ORDER_STORE.set(order.id, order);
  return order;
}

export function getOrder(orderId) {
  const id = text(orderId);
  return CONFIRMED_ORDER_STORE.get(id) || PENDING_ORDER_STORE.get(id) || null;
}

export function getConfirmedOrder(orderId) {
  return CONFIRMED_ORDER_STORE.get(text(orderId)) || null;
}

export async function saveOrder(order) {
  if (!order?.id) return order || null;

  if (order.status === ORDER_STATUSES.paid) {
    CONFIRMED_ORDER_STORE.set(order.id, order);
    PENDING_ORDER_STORE.delete(order.id);
    await Promise.all([
      setCachedOrder(confirmedOrderKey(order.id), order),
      deleteCachedOrder(pendingOrderKey(order.id))
    ]);
  } else {
    PENDING_ORDER_STORE.set(order.id, order);
    await setCachedOrder(pendingOrderKey(order.id), order);
  }

  return order;
}

export async function getStoredOrder(orderId) {
  const id = text(orderId);
  if (!id) return null;

  const localOrder = getOrder(id);
  if (localOrder) return localOrder;

  const confirmedOrder = await getCachedOrder(confirmedOrderKey(id));
  if (confirmedOrder) {
    CONFIRMED_ORDER_STORE.set(id, confirmedOrder);
    return confirmedOrder;
  }

  const pendingOrder = await getCachedOrder(pendingOrderKey(id));
  if (pendingOrder) {
    PENDING_ORDER_STORE.set(id, pendingOrder);
    return pendingOrder;
  }

  return null;
}

export async function getStoredConfirmedOrder(orderId) {
  const id = text(orderId);
  if (!id) return null;

  const localOrder = getConfirmedOrder(id);
  if (localOrder) return localOrder;

  const confirmedOrder = await getCachedOrder(confirmedOrderKey(id));
  if (confirmedOrder) {
    CONFIRMED_ORDER_STORE.set(id, confirmedOrder);
    return confirmedOrder;
  }

  return null;
}

export async function markStoredOrderPaid(orderId, payment = {}) {
  const order = await getStoredOrder(orderId);
  if (!order) return null;
  const paidOrder = markOrderPaid(order.id, payment);
  await saveOrder(paidOrder);
  return paidOrder;
}

export async function markStoredOrderFailed(orderId, payment = {}) {
  const order = await getStoredOrder(orderId);
  if (!order) return null;
  const failedOrder = markOrderFailed(order.id, payment);
  await saveOrder(failedOrder);
  return failedOrder;
}

export async function markStoredOrderCancelled(orderId) {
  const order = await getStoredOrder(orderId);
  if (!order) return null;
  const cancelledOrder = markOrderCancelled(order.id);
  await saveOrder(cancelledOrder);
  return cancelledOrder;
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
  PENDING_ORDER_STORE.delete(order.id);
  CONFIRMED_ORDER_STORE.set(order.id, order);
  return order;
}

export function markOrderCancelled(orderId) {
  const order = getOrder(orderId);
  if (!order || order.status === ORDER_STATUSES.paid) return order;

  order.status = ORDER_STATUSES.cancelled;
  order.updatedAt = new Date().toISOString();
  PENDING_ORDER_STORE.set(order.id, order);
  CONFIRMED_ORDER_STORE.delete(order.id);
  return order;
}

export function markOrderFailed(orderId, payment = {}) {
  const order = getOrder(orderId);
  if (!order || order.status === ORDER_STATUSES.paid) return order;

  order.status = ORDER_STATUSES.failed;
  order.updatedAt = new Date().toISOString();
  order.payment = {
    provider: "PayFast",
    status: text(payment.status || "FAILED")
  };
  PENDING_ORDER_STORE.set(order.id, order);
  CONFIRMED_ORDER_STORE.delete(order.id);
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

export function getResourceAccessState(resource, orders = []) {
  const normalizedResource = normalizeResource(resource);
  if (!normalizedResource) return { accessGranted: false, order: null, downloadUrl: "" };

  const paidOrders = (Array.isArray(orders) ? orders : [orders]).filter((order) => {
    return order && order.status === ORDER_STATUSES.paid;
  });

  const matchingOrder = paidOrders.find((order) => {
    return (order.items || []).some((item) => matchesResource(normalizedResource, item));
  });

  if (!matchingOrder) return { accessGranted: false, order: null, downloadUrl: "" };

  const matchingItem = (matchingOrder.items || []).find((item) => matchesResource(normalizedResource, item));

  return {
    accessGranted: true,
    order: matchingOrder,
    downloadUrl: text(matchingItem?.fileUrl || matchingItem?.downloadUrl || "")
  };
}

export function parsePriceToCents(price) {
  if (typeof price === "number") {
    return Number.isFinite(price) ? Math.round(price * 100) : 0;
  }

  const number = normalizedPriceNumber(price);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function normalizedPriceNumber(value) {
  const digitsOnly = String(value || "").replace(/[^\d.,-]/g, "");
  if (!digitsOnly) return 0;

  const lastComma = digitsOnly.lastIndexOf(",");
  const lastDot = digitsOnly.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const decimalPart = decimalIndex > -1 ? digitsOnly.slice(decimalIndex + 1) : "";
  const hasDecimalPart = decimalPart.length > 0 && decimalPart.length <= 2;
  const normalized = hasDecimalPart
    ? `${digitsOnly.slice(0, decimalIndex).replace(/[.,]/g, "")}.${decimalPart}`
    : digitsOnly.replace(/[.,]/g, "");

  return Number(normalized);
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

function normalizeResource(resource) {
  if (!resource) return null;
  const type = text(resource.type || resource.resourceType);
  const slug = text(resource.slug || resource.key || resource.id);
  if (!type || !slug) return null;
  return { type: type.toLowerCase(), slug };
}

function matchesResource(resource, item) {
  if (!resource || !item) return false;
  const itemType = text(item.type || item.resourceType).toLowerCase();
  const itemSlug = text(item.slug || item.key || item.id);
  return itemType === resource.type && itemSlug === resource.slug;
}

async function getCachedOrder(key) {
  const cache = getOrderCache();
  if (!cache) return null;

  try {
    const order = await cache.get(key);
    return order && typeof order === "object" ? order : null;
  } catch (error) {
    console.warn("Could not read order from runtime cache.", {
      key,
      message: error instanceof Error ? error.message : "Unknown error"
    });
    return null;
  }
}

async function setCachedOrder(key, order) {
  const cache = getOrderCache();
  if (!cache || !order) return;

  try {
    await cache.set(key, order, {
      ttl: ORDER_CACHE_TTL_SECONDS,
      tags: ["orders", `order:${order.id}`],
      name: `EduReach order ${order.id}`
    });
  } catch (error) {
    console.warn("Could not write order to runtime cache.", {
      key,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function deleteCachedOrder(key) {
  const cache = getOrderCache();
  if (!cache) return;

  try {
    await cache.delete(key);
  } catch (error) {
    console.warn("Could not delete order from runtime cache.", {
      key,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function getOrderCache() {
  try {
    return getCache({
      namespace: ORDER_CACHE_NAMESPACE
    });
  } catch {
    return null;
  }
}

function pendingOrderKey(orderId) {
  return `pending:${orderId}`;
}

function confirmedOrderKey(orderId) {
  return `confirmed:${orderId}`;
}
