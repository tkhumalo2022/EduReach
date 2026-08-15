import {
  AdminAuthError,
  clearAdminCookie,
  getAdminSession,
  requireValidCsrf,
  revokeAdminSession
} from "../../src/lib/adminAuth.js";
import { methodNotAllowed, sendJson } from "../../src/lib/security.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  try {
    const session = await getAdminSession(request);
    if (session) requireValidCsrf(request, session);
    await revokeAdminSession(request);
    response.setHeader("Set-Cookie", clearAdminCookie());
    return sendJson(response, 200, { ok: true });
  } catch (error) {
    return sendJson(response, error instanceof AdminAuthError ? error.statusCode : 503, {
      ok: false,
      message: error instanceof AdminAuthError
        ? error.message
        : "Sign out could not be completed right now."
    });
  }
}
