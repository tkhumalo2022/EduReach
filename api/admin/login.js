import {
  AdminAuthError,
  createAdminCookie,
  createAdminSession,
  getAdminConfig,
  publicAdminSession,
  verifyAdminCredentials
} from "../../src/lib/adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../../src/lib/security.js";

const LOGIN_BODY_LIMIT_BYTES = 8 * 1024;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "admin-login",
    limit: 5,
    windowSeconds: 10 * 60
  }))) {
    return undefined;
  }

  let body;

  try {
    body = await readJsonBody(request, { maxBytes: LOGIN_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid login request."
    });
  }

  const config = getAdminConfig();
  const authenticated = await verifyAdminCredentials(body.email, body.password, config);

  if (!authenticated) {
    return sendJson(response, 401, {
      ok: false,
      message: "The email or password is incorrect."
    });
  }

  try {
    const created = await createAdminSession({
      email: config.email,
      name: "EduReach Admin"
    }, { config });

    response.setHeader("Set-Cookie", createAdminCookie(created.token, created.maxAgeSeconds));
    return sendJson(response, 200, {
      ok: true,
      session: publicAdminSession(created.session)
    });
  } catch (error) {
    console.error("EduReach admin session creation failed.", error);
    return sendJson(response, error instanceof AdminAuthError ? error.statusCode : 503, {
      ok: false,
      message: "Admin sign-in is temporarily unavailable."
    });
  }
}
