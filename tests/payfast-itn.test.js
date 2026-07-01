import assert from "node:assert/strict";
import test from "node:test";

import notifyHandler from "../api/payfast/notify.js";
import {
  createNotificationSignature,
  formatPayFastAmount,
  getMissingPayFastConfig,
  readPayFastConfig,
  validatePayFastNotification
} from "../src/lib/payfast.js";
import {
  createOrder,
  getConfirmedOrder,
  getOrder
} from "../src/lib/orders.js";

test("PayFast passphrase is optional in required config checks", () => {
  const missing = getMissingPayFastConfig(readPayFastConfig({
    PAYFAST_MERCHANT_ID: "10000100",
    PAYFAST_MERCHANT_KEY: "46f0cd694581a",
    PAYFAST_MODE: "sandbox"
  }));

  assert.deepEqual(missing, []);
});

test("validates ITN payload with PayFast before returning ok", async () => {
  const entries = [
    ["m_payment_id", "ER-VALIDATE"],
    ["pf_payment_id", "PF-VALIDATE"],
    ["payment_status", "COMPLETE"],
    ["amount_gross", "125.00"],
    ["merchant_id", "10000100"]
  ];
  entries.push(["signature", createNotificationSignature(entries, "secret")]);

  const validation = await validatePayFastNotification(
    entries,
    { validateEndpoint: "https://sandbox.payfast.co.za/eng/query/validate" },
    async (url, options) => {
      assert.equal(url, "https://sandbox.payfast.co.za/eng/query/validate");
      assert.equal(options.method, "POST");
      assert.match(options.body, /m_payment_id=ER-VALIDATE/);
      assert.doesNotMatch(options.body, /signature=/);
      return {
        ok: true,
        status: 200,
        text: async () => "VALID"
      };
    }
  );

  assert.equal(validation.ok, true);
});

test("ITN marks an order paid only after PayFast server validation succeeds", async () => {
  const restore = withPayFastEnv();
  const originalFetch = globalThis.fetch;

  try {
    const order = createDigitalOrder(15000);
    const request = createItnRequest(order, "COMPLETE");
    const response = createMockResponse();

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => "VALID"
    });

    await notifyHandler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, "OK");
    assert.equal(getConfirmedOrder(order.id)?.status, "paid");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("ITN does not unlock downloads when PayFast server validation fails", async () => {
  const restore = withPayFastEnv();
  const originalFetch = globalThis.fetch;
  const originalError = console.error;

  try {
    const order = createDigitalOrder(9900);
    const request = createItnRequest(order, "COMPLETE");
    const response = createMockResponse();

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => "INVALID"
    });
    console.error = () => {};

    await notifyHandler(request, response);

    assert.equal(response.statusCode, 400);
    assert.equal(getConfirmedOrder(order.id), null);
    assert.equal(getOrder(order.id)?.status, "pending");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    restore();
  }
});

test("ITN records non-complete PayFast statuses without granting access", async () => {
  const restore = withPayFastEnv();
  const originalFetch = globalThis.fetch;

  try {
    const order = createDigitalOrder(5000);
    const request = createItnRequest(order, "FAILED");
    const response = createMockResponse();

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => "VALID"
    });

    await notifyHandler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(getConfirmedOrder(order.id), null);
    assert.equal(getOrder(order.id)?.status, "failed");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

function createDigitalOrder(amountCents) {
  return createOrder({
    customer: { name: "PayFast", surname: "Tester", email: "payfast@example.com" },
    amountCents,
    items: [{
      id: `product-${amountCents}`,
      type: "ebooks",
      slug: `ebook-${amountCents}`,
      title: "PayFast Test Ebook",
      quantity: 1,
      unitAmountCents: amountCents,
      amountCents,
      fileUrl: "https://example.com/download.pdf"
    }]
  });
}

function createItnRequest(order, paymentStatus) {
  const entries = [
    ["m_payment_id", order.id],
    ["pf_payment_id", `PF-${order.id}`],
    ["payment_status", paymentStatus],
    ["item_name", `EduReach digital resources ${order.id}`],
    ["amount_gross", formatPayFastAmount(order.amountCents)],
    ["amount_fee", "0.00"],
    ["amount_net", formatPayFastAmount(order.amountCents)],
    ["custom_str1", order.id],
    ["merchant_id", "10000100"]
  ];
  entries.push(["signature", createNotificationSignature(entries, "secret")]);

  return {
    method: "POST",
    headers: {},
    body: new URLSearchParams(entries).toString()
  };
}

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: "",
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

function withPayFastEnv() {
  const previous = {
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID,
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY,
    PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE,
    PAYFAST_MODE: process.env.PAYFAST_MODE,
    PAYFAST_SANDBOX: process.env.PAYFAST_SANDBOX
  };

  process.env.PAYFAST_MERCHANT_ID = "10000100";
  process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";
  process.env.PAYFAST_PASSPHRASE = "secret";
  process.env.PAYFAST_MODE = "sandbox";
  delete process.env.PAYFAST_SANDBOX;

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
