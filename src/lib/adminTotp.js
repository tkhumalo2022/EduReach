import crypto from "node:crypto";

// RFC 6238 TOTP: read from an authenticator app, never from a URL or email.
export function verifyAdminTotp(code, secret, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  const clean = String(secret || "").toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (!/^[A-Z2-7]{16,128}$/.test(clean)) return false;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const character of clean) {
    value = (value << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 255);
    }
  }
  if (bytes.length < 10) return false;
  const key = Buffer.from(bytes);
  const step = Math.floor(now / 30000);
  for (const drift of [-1, 0, 1]) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step + drift));
    const mac = crypto.createHmac("sha1", key).update(counter).digest();
    const index = mac[mac.length - 1] & 15;
    const number = (mac.readUInt32BE(index) & 0x7fffffff) % 1000000;
    const expected = Buffer.from(String(number).padStart(6, "0"));
    const supplied = Buffer.from(String(code));
    if (crypto.timingSafeEqual(expected, supplied)) return true;
  }
  return false;
}
