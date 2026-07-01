import {
  createNotificationSignature,
  entriesToObject,
  formatPayFastAmount,
  parseFormEncoded,
  parsePayFastAmountToCents,
  readPayFastConfig,
  validatePayFastNotification,
  verifyPayFastSignature
} from "../../src/lib/payfast.js";
import {
  getOrder,
  markOrderFailed,
  markOrderPaid
} from "../../src/lib/orders.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendText(response, 405, "Method not allowed");
  }

  const config = readPayFastConfig();
  const rawBody = await readRawBody(request);
  const entries = Array.isArray(request.body) ? request.body : parseFormEncoded(rawBody);
  const data = entriesToObject(entries);
  const submittedSignature = String(data.signature || "").trim();
  const expectedSignature = createNotificationSignature(entries, config.passphrase);

  if (!submittedSignature || !verifyPayFastSignature(submittedSignature, expectedSignature)) {
    console.error("PayFast ITN signature validation failed.", {
      orderId: data.m_payment_id || data.custom_str1
    });
    return sendText(response, 400, "Invalid signature");
  }

  const validation = await validatePayFastNotification(entries, config);
  if (!validation.ok) {
    console.error("PayFast ITN server validation failed.", {
      orderId: data.m_payment_id || data.custom_str1,
      statusCode: validation.statusCode,
      responseText: validation.responseText,
      endpoint: validation.endpoint
    });
    return sendText(response, 400, "Invalid PayFast confirmation");
  }

  if (String(data.merchant_id || "") !== config.merchantId) {
    console.error("PayFast ITN merchant mismatch.", {
      received: data.merchant_id
    });
    return sendText(response, 400, "Invalid merchant");
  }

  const orderId = String(data.m_payment_id || data.custom_str1 || "").trim();
  const order = getOrder(orderId);

  if (!order) {
    console.error("PayFast ITN order not found.", { orderId });
    return sendText(response, 404, "Order not found");
  }

  const expectedAmount = formatPayFastAmount(order.amountCents);

  if (parsePayFastAmountToCents(data.amount_gross) !== order.amountCents) {
    console.error("PayFast ITN amount mismatch.", {
      orderId,
      expectedAmount,
      receivedAmount: data.amount_gross
    });
    return sendText(response, 400, "Invalid amount");
  }

  const paymentStatus = String(data.payment_status || "").trim().toUpperCase();
  const isConfirmed = paymentStatus === "COMPLETE";

  if (isConfirmed) {
    markOrderPaid(orderId, {
      pfPaymentId: data.pf_payment_id,
      status: paymentStatus,
      amountGross: data.amount_gross,
      amountFee: data.amount_fee,
      amountNet: data.amount_net
    });
  } else {
    markOrderFailed(orderId, {
      status: paymentStatus
    });
  }

  return sendText(response, 200, "OK");
}

async function readRawBody(request) {
  if (typeof request.body === "string") return request.body;

  if (request.body && typeof request.body === "object") {
    return new URLSearchParams(request.body).toString();
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function sendText(response, statusCode, body) {
  response.setHeader("Cache-Control", "no-store");
  response.statusCode = statusCode;
  response.end(body);
}
