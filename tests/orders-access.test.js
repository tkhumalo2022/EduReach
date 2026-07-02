import assert from "node:assert/strict";
import test from "node:test";

import downloadHandler from "../api/downloads.js";
import contactHandler from "../api/contact.js";
import ordersHandler from "../api/orders.js";
import checkoutHandler from "../api/payfast/create-payment.js";
import wixContentHandler from "../api/wix-content.js";
import {
  createOrder,
  createOrderAccessToken,
  getConfirmedOrder,
  getResourceAccessState,
  hashOrderAccessToken,
  markOrderFailed,
  markOrderPaid,
  parsePriceToCents,
  toPublicOrder
} from "../src/lib/orders.js";

process.env.EDUREACH_RATE_LIMIT_DISABLED = "1";

test("grants access when a paid public order contains the resource", () => {
  const order = {
    id: "ER-123",
    status: "paid",
    items: [{
      type: "ebooks",
      slug: "sample-ebook",
      downloadUrl: "/api/downloads?orderId=ER-123&type=ebooks&slug=sample-ebook"
    }]
  };

  const result = getResourceAccessState({ type: "ebooks", slug: "sample-ebook" }, [order]);

  assert.equal(result.accessGranted, true);
  assert.equal(result.order?.id, "ER-123");
  assert.match(result.downloadUrl, /^\/api\/downloads\?/);
});

test("does not grant access for a pending or cancelled order", () => {
  const pending = {
    id: "ER-pending",
    status: "pending",
    items: [{ type: "downloads", slug: "lesson-plan" }]
  };
  const cancelled = {
    id: "ER-cancelled",
    status: "cancelled",
    items: [{ type: "downloads", slug: "lesson-plan" }]
  };

  assert.equal(getResourceAccessState({ type: "downloads", slug: "lesson-plan" }, [pending]).accessGranted, false);
  assert.equal(getResourceAccessState({ type: "downloads", slug: "lesson-plan" }, [cancelled]).accessGranted, false);
});

test("moves downloads into confirmed protected access only after payment is marked paid", () => {
  const { order } = createSecuredOrder();

  assert.equal(getConfirmedOrder(order.id), null);
  assert.equal(toPublicOrder(order, { includeDownloads: true }).items[0].downloadUrl, "");

  markOrderPaid(order.id, { pfPaymentId: "PF-1", amountGross: "125.00" });
  const confirmedOrder = getConfirmedOrder(order.id);
  const publicOrder = toPublicOrder(confirmedOrder, { includeDownloads: true });

  assert.equal(confirmedOrder?.status, "paid");
  assert.match(publicOrder.items[0].downloadUrl, /^\/api\/downloads\?/);
  assert.doesNotMatch(publicOrder.items[0].downloadUrl, /example\.com\/paid-guide\.pdf/);
});

test("failed payment status cannot downgrade or unlock a paid order", () => {
  const { order } = createSecuredOrder({
    amountCents: 5000,
    item: {
      id: "download-1",
      type: "downloads",
      slug: "support-template",
      title: "Support Template",
      quantity: 1,
      unitAmountCents: 5000,
      amountCents: 5000,
      fileUrl: "https://example.com/support-template.pdf"
    }
  });

  markOrderPaid(order.id, { pfPaymentId: "PF-2", amountGross: "50.00" });
  markOrderFailed(order.id, { status: "FAILED" });

  const confirmedOrder = getConfirmedOrder(order.id);
  const publicOrder = toPublicOrder(confirmedOrder, { includeDownloads: true });

  assert.equal(confirmedOrder?.status, "paid");
  assert.match(publicOrder.items[0].downloadUrl, /^\/api\/downloads\?/);
  assert.doesNotMatch(JSON.stringify(publicOrder), /support-template\.pdf/);
});

test("order IDs use cryptographically strong UUIDs", () => {
  const { order } = createSecuredOrder();

  assert.match(order.id, /^ER-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("order API rejects an order ID without its access token", async () => {
  const { order } = createPaidOrder();
  const response = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(order.id)}`
  });

  assert.equal(response.statusCode, 401);
});

test("order API rejects invalid access tokens", async () => {
  const { order } = createPaidOrder();
  const response = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(order.id)}`,
    headers: {
      "x-order-access-token": "not-the-token"
    }
  });

  assert.equal(response.statusCode, 403);
});

test("order API returns only safe public fields for a valid token", async () => {
  const { order, token } = createPaidOrder();
  const response = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(order.id)}`,
    headers: {
      "x-order-access-token": token
    }
  });
  const payloadText = JSON.stringify(response.payload);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.order.id, order.id);
  assert.equal("customer" in response.payload.order, false);
  assert.equal("payment" in response.payload.order, false);
  assert.match(response.payload.order.items[0].downloadUrl, /^\/api\/downloads\?/);
  assert.doesNotMatch(payloadText, /buyer@example\.com/);
  assert.doesNotMatch(payloadText, /PF-SECURE/);
  assert.doesNotMatch(payloadText, /private-paid-guide\.pdf/);
});

test("pending and failed orders never return download access", async () => {
  const pending = createSecuredOrder();
  const pendingResponse = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(pending.order.id)}`,
    headers: {
      "x-order-access-token": pending.token
    }
  });

  assert.equal(pendingResponse.statusCode, 200);
  assert.equal(pendingResponse.payload.order.status, "pending");
  assert.equal(pendingResponse.payload.order.items[0].downloadUrl, "");

  markOrderFailed(pending.order.id, { status: "FAILED" });

  const failedResponse = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(pending.order.id)}`,
    headers: {
      "x-order-access-token": pending.token
    }
  });

  assert.equal(failedResponse.statusCode, 200);
  assert.equal(failedResponse.payload.order.status, "failed");
  assert.equal(failedResponse.payload.order.items[0].downloadUrl, "");
});

test("paid downloads require a valid order token", async () => {
  const { order, token } = createPaidOrder();
  const orderResponse = await callHandler(ordersHandler, {
    method: "GET",
    url: `/api/orders?orderId=${encodeURIComponent(order.id)}`,
    headers: {
      "x-order-access-token": token
    }
  });
  const downloadUrl = orderResponse.payload.order.items[0].downloadUrl;

  const missingToken = await callHandler(downloadHandler, {
    method: "GET",
    url: downloadUrl
  });
  assert.equal(missingToken.statusCode, 401);

  const invalidToken = await callHandler(downloadHandler, {
    method: "GET",
    url: downloadUrl,
    headers: {
      "x-order-access-token": "invalid-token"
    }
  });
  assert.equal(invalidToken.statusCode, 403);

  const validToken = await callHandler(downloadHandler, {
    method: "GET",
    url: downloadUrl,
    headers: {
      accept: "application/json",
      "x-order-access-token": token
    }
  });
  assert.equal(validToken.statusCode, 200);
  assert.equal(validToken.payload.downloadUrl, "https://example.com/private-paid-guide.pdf");
});

test("production CMS debug and status responses do not expose Wix internals", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.EDUREACH_ADMIN_DEBUG_SECRET;

  try {
    process.env.NODE_ENV = "production";
    delete process.env.EDUREACH_ADMIN_DEBUG_SECRET;

    const response = await callHandler(wixContentHandler, {
      method: "GET",
      url: "/api/wix-content?type=articles&status=1&debug=1"
    });
    const payloadText = JSON.stringify(response.payload);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.ok, true);
    assert.match(response.payload.status, /^(healthy|unavailable)$/);
    assert.equal("types" in response.payload, false);
    assert.equal("wix" in response.payload, false);
    assert.doesNotMatch(payloadText, /WIX_/);
    assert.doesNotMatch(payloadText, /collection/i);
    assert.doesNotMatch(payloadText, /missing/i);
  } finally {
    if (previousNodeEnv == null) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousSecret == null) {
      delete process.env.EDUREACH_ADMIN_DEBUG_SECRET;
    } else {
      process.env.EDUREACH_ADMIN_DEBUG_SECRET = previousSecret;
    }
  }
});

test("oversized JSON API bodies are rejected before processing", async () => {
  const restore = withEnv({
    GOOGLE_APPS_SCRIPT_URL: "https://example.com/apps-script",
    EDUREACH_BACKEND_SECRET: "test-secret"
  });

  try {
    const response = await callHandler(contactHandler, {
      method: "POST",
      url: "/api/contact",
      headers: {
        "content-type": "application/json",
        "content-length": String(16 * 1024 + 1)
      },
      body: {
        name: "Test User",
        email: "test@example.com",
        message: "Hello"
      }
    });

    assert.equal(response.statusCode, 413);

    const parsedObjectResponse = await callHandler(contactHandler, {
      method: "POST",
      url: "/api/contact",
      headers: {
        "content-type": "application/json"
      },
      body: {
        name: "Test User",
        email: "test@example.com",
        message: "x".repeat(20 * 1024)
      }
    });

    assert.equal(parsedObjectResponse.statusCode, 413);
  } finally {
    restore();
  }
});

test("contact API requires JSON content type", async () => {
  const restore = withEnv({
    GOOGLE_APPS_SCRIPT_URL: "https://example.com/apps-script",
    EDUREACH_BACKEND_SECRET: "test-secret"
  });

  try {
    const response = await callHandler(contactHandler, {
      method: "POST",
      url: "/api/contact",
      headers: {
        "content-type": "text/plain"
      },
      body: "hello"
    });

    assert.equal(response.statusCode, 415);
  } finally {
    restore();
  }
});

test("checkout API requires JSON content type and enforces body size", async () => {
  const unsupportedType = await callHandler(checkoutHandler, {
    method: "POST",
    url: "/api/payfast/create-payment",
    headers: {
      "content-type": "text/plain"
    },
    body: "hello"
  });

  assert.equal(unsupportedType.statusCode, 415);

  const oversized = await callHandler(checkoutHandler, {
    method: "POST",
    url: "/api/payfast/create-payment",
    headers: {
      "content-type": "application/json",
      "content-length": String(32 * 1024 + 1)
    },
    body: {
      customer: { name: "Test", surname: "Buyer", email: "buyer@example.com" },
      items: [{ type: "ebooks", slug: "inclusive-classroom-guide", quantity: 1 }]
    }
  });

  assert.equal(oversized.statusCode, 413);
});

test("unsupported API methods return 405", async () => {
  const response = await callHandler(ordersHandler, {
    method: "POST",
    url: "/api/orders"
  });

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, "GET");
});

test("parses formatted paid resource prices into cents", () => {
  assert.equal(parsePriceToCents("R1,250.00"), 125000);
  assert.equal(parsePriceToCents("R 75"), 7500);
  assert.equal(parsePriceToCents("75.50"), 7550);
});

function createPaidOrder(options = {}) {
  const { order, token } = createSecuredOrder(options);
  markOrderPaid(order.id, {
    pfPaymentId: "PF-SECURE",
    amountGross: "125.00",
    amountFee: "0.00",
    amountNet: "125.00"
  });

  return {
    order: getConfirmedOrder(order.id),
    token
  };
}

function createSecuredOrder(options = {}) {
  const token = createOrderAccessToken();
  const amountCents = options.amountCents || 12500;
  const item = options.item || {
    id: "ebook-1",
    type: "ebooks",
    slug: "inclusive-classroom-guide",
    title: "Inclusive Classroom Guide",
    quantity: 1,
    unitAmountCents: amountCents,
    amountCents,
    fileUrl: "https://example.com/private-paid-guide.pdf",
    fileType: "PDF"
  };
  const order = createOrder({
    customer: { name: "Test", surname: "Buyer", email: "buyer@example.com" },
    amountCents,
    items: [item],
    accessTokenHash: hashOrderAccessToken(token)
  });

  return { order, token };
}

async function callHandler(handler, requestOptions = {}) {
  const response = createMockResponse();
  await handler(createMockRequest(requestOptions), response);
  return response;
}

function createMockRequest(options = {}) {
  return {
    method: options.method || "GET",
    url: options.url || "/",
    headers: {
      host: "edureach.network",
      ...(options.headers || {})
    },
    body: options.body
  };
}

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    payload: undefined,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.payload = payload;
      this.body = JSON.stringify(payload);
      return this;
    },
    end(body = "") {
      this.body = body || "";

      if (typeof this.body === "string" && this.headers["content-type"]?.includes("application/json")) {
        try {
          this.payload = JSON.parse(this.body);
        } catch {
          this.payload = undefined;
        }
      }
    }
  };
}

function withEnv(values) {
  const previous = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    process.env[key] = values[key];
  }

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
