import {
  getStoredOrder,
  readOrderAccessTokenFromCookies,
  toPublicOrder,
  verifyOrderAccessToken
} from "../src/lib/orders.js";
import {
  enforceRateLimit,
  getRequestHeader,
  methodNotAllowed,
  parseCookies,
  sendJson
} from "../src/lib/security.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "orders",
    limit: 60,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const host = request.headers?.host || "edureach.local";
  const url = new URL(request.url || "/api/orders", `https://${host}`);
  const orderId = url.searchParams.get("orderId") || url.searchParams.get("order") || "";

  if (!orderId) {
    return sendJson(response, 400, {
      ok: false,
      message: "Order ID is required."
    });
  }

  const order = await getStoredOrder(orderId);

  if (!order) {
    return sendJson(response, 404, {
      ok: false,
      message: "Order not found."
    });
  }

  const accessToken =
    getRequestHeader(request, "x-order-access-token") ||
    readOrderAccessTokenFromCookies(parseCookies(request), orderId);

  if (!accessToken) {
    return sendJson(response, 401, {
      ok: false,
      message: "Order access token is required."
    });
  }

  if (!verifyOrderAccessToken(order, accessToken)) {
    return sendJson(response, 403, {
      ok: false,
      message: "Order access token is invalid."
    });
  }

  return sendJson(response, 200, {
    ok: true,
    order: toPublicOrder(order, { includeDownloads: true })
  });
}
