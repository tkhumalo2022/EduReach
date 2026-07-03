import {
  findOrderItem,
  getStoredOrder,
  readOrderAccessTokenFromCookies,
  verifyOrderAccessToken,
  verifyProtectedDownloadSignature
} from "../src/lib/orders.js";
import { verifyEmailDownloadSignature } from "../src/lib/orderEmail.js";
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
    name: "downloads",
    limit: 60,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  const host = request.headers?.host || "edureach.local";
  const url = new URL(request.url || "/api/downloads", `https://${host}`);
  const orderId = url.searchParams.get("orderId") || "";
  const type = url.searchParams.get("type") || "";
  const slug = url.searchParams.get("slug") || "";
  const itemId = url.searchParams.get("itemId") || "";
  const expires = url.searchParams.get("expires") || "";
  const signature = url.searchParams.get("signature") || "";
  const delivery = url.searchParams.get("delivery") || "";

  if (!orderId || !type || !slug || !expires || !signature) {
    return sendJson(response, 400, {
      ok: false,
      message: "Download request is incomplete."
    });
  }

  const order = await getStoredOrder(orderId);
  if (!order) {
    return sendJson(response, 404, {
      ok: false,
      message: "Order not found."
    });
  }

  if (order.status !== "paid") {
    return sendJson(response, 403, {
      ok: false,
      message: "Payment has not been confirmed for this download."
    });
  }

  const item = findOrderItem(order, { type, slug, itemId });
  if (!item || !item.fileUrl) {
    return sendJson(response, 404, {
      ok: false,
      message: "Download is not available for this order."
    });
  }

  if (delivery === "email") {
    if (!verifyEmailDownloadSignature(order, item, expires, signature)) {
      return sendJson(response, 403, {
        ok: false,
        message: "Email download link has expired or is invalid."
      });
    }
  } else {
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

    if (!verifyProtectedDownloadSignature(order, item, expires, signature)) {
      return sendJson(response, 403, {
        ok: false,
        message: "Download link has expired or is invalid."
      });
    }
  }

  response.setHeader("Cache-Control", "no-store");

  if (getRequestHeader(request, "accept").includes("application/json")) {
    return sendJson(response, 200, {
      ok: true,
      downloadUrl: item.fileUrl,
      expiresAt: Number(expires)
    });
  }

  response.statusCode = 302;
  response.setHeader("Location", item.fileUrl);
  response.end();
  return undefined;
}
