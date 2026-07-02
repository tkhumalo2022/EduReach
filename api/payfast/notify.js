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
  getStoredOrder,
  markStoredOrderFailed,
  markStoredOrderPaid
} from "../../src/lib/orders.js";
import {
  ApiRequestError,
  readRawBody,
  sendText
} from "../../src/lib/security.js";

const PAYFAST_NOTIFY_BODY_LIMIT_BYTES = 16 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendText(response, 405, "Method not allowed");
  }

  const config = readPayFastConfig();
  let rawBody;

  try {
    rawBody = await readRawBody(request, { maxBytes: PAYFAST_NOTIFY_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendText(
      response,
      error instanceof ApiRequestError ? error.statusCode : 400,
      error instanceof ApiRequestError ? error.message : "Invalid PayFast confirmation"
    );
  }

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
  const order = await getStoredOrder(orderId);

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
    await markStoredOrderPaid(orderId, {
      pfPaymentId: data.pf_payment_id,
      status: paymentStatus,
      amountGross: data.amount_gross,
      amountFee: data.amount_fee,
      amountNet: data.amount_net
    });
  } else {
    await markStoredOrderFailed(orderId, {
      status: paymentStatus
    });
  }

  return sendText(response, 200, "OK");
}
