import crypto from "node:crypto";

export const PAYFAST_ENDPOINTS = Object.freeze({
  sandbox: "https://sandbox.payfast.co.za/eng/process",
  production: "https://www.payfast.co.za/eng/process"
});

const PAYMENT_FIELD_ORDER = Object.freeze([
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
  "payment_method",
  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles"
]);

export function readPayFastConfig(env = process.env) {
  const mode = String(env.PAYFAST_MODE || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";

  return {
    merchantId: trim(env.PAYFAST_MERCHANT_ID),
    merchantKey: trim(env.PAYFAST_MERCHANT_KEY),
    passphrase: trim(env.PAYFAST_PASSPHRASE),
    mode,
    endpoint: PAYFAST_ENDPOINTS[mode]
  };
}

export function getMissingPayFastConfig(config = readPayFastConfig()) {
  return [
    ["PAYFAST_MERCHANT_ID", config.merchantId],
    ["PAYFAST_MERCHANT_KEY", config.merchantKey],
    ["PAYFAST_PASSPHRASE", config.passphrase]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function createPaymentSignature(fields, passphrase = "") {
  const orderedKeys = [
    ...PAYMENT_FIELD_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(fields, key)),
    ...Object.keys(fields)
      .filter((key) => !PAYMENT_FIELD_ORDER.includes(key) && key !== "signature")
      .sort()
  ];

  return hashFields(
    orderedKeys.map((key) => [key, fields[key]]),
    passphrase
  );
}

export function createNotificationSignature(entries, passphrase = "") {
  return hashFields(
    entries.filter(([key]) => key !== "signature"),
    passphrase
  );
}

export function parseFormEncoded(rawBody = "") {
  return String(rawBody)
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const [rawKey, ...rawValue] = pair.split("=");
      return [
        decodeFormValue(rawKey),
        decodeFormValue(rawValue.join("="))
      ];
    });
}

export function entriesToObject(entries) {
  return Object.fromEntries(entries);
}

export function formatPayFastAmount(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export function getRequestOrigin(req) {
  if (process.env.EDUREACH_SITE_URL) {
    return process.env.EDUREACH_SITE_URL.replace(/\/$/, "");
  }

  const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost:3000";
  const proto = req.headers?.["x-forwarded-proto"] || (String(host).includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function hashFields(entries, passphrase) {
  const parts = entries
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${payFastEncode(String(value).trim())}`);

  if (passphrase) {
    parts.push(`passphrase=${payFastEncode(passphrase)}`);
  }

  return crypto.createHash("md5").update(parts.join("&")).digest("hex");
}

function decodeFormValue(value = "") {
  return decodeURIComponent(String(value).replace(/\+/g, " "));
}

function payFastEncode(value) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

function trim(value) {
  return String(value || "").trim();
}
