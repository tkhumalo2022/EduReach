import { getConfirmedOrder, getOrder, toPublicOrder } from "../src/lib/orders.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, {
      ok: false,
      message: "Method not allowed."
    });
  }

  const host = request.headers?.host || "edureach.local";
  const url = new URL(request.url || "/api/orders", `https://${host}`);
  const orderId = url.searchParams.get("orderId") || url.searchParams.get("order") || "";
  const order = getOrder(orderId);

  if (!order) {
    return sendJson(response, 404, {
      ok: false,
      message: "Order not found."
    });
  }

  return sendJson(response, 200, {
    ok: true,
    order: toPublicOrder(order, { includeDownloads: Boolean(getConfirmedOrder(orderId)) })
  });
}

function sendJson(response, statusCode, payload) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(statusCode).json(payload);
}
