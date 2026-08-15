import {
  AdminAuthError,
  clearAdminCookie,
  createAdminCookie,
  createAdminSession,
  getAdminConfig,
  getAdminSession,
  publicAdminSession,
  requireValidCsrf,
  revokeAdminSession,
  verifyAdminCredentials
} from "./adminAuth.js";
import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "./security.js";

const LOGIN_BODY_LIMIT_BYTES = 8 * 1024;

export async function handleAdminApi(request, response, action) {
  switch (String(action || "").trim().toLowerCase()) {
    case "login":
      return handleLogin(request, response);
    case "session":
      return handleSession(request, response);
    case "logout":
      return handleLogout(request, response);
    default:
      return sendJson(response, 404, {
        ok: false,
        message: "Unknown admin request."
      });
  }
}

async function handleLogin(request, response) {
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

async function handleSession(request, response) {
  if (request.method !== "GET") {
    return methodNotAllowed(response, ["GET"]);
  }

  try {
    const session = await getAdminSession(request);
    if (!session) {
      return sendJson(response, 401, {
        ok: false,
        authenticated: false
      });
    }

    return sendJson(response, 200, {
      ok: true,
      authenticated: true,
      session: publicAdminSession(session)
    });
  } catch (error) {
    console.error("EduReach admin session lookup failed.", error);
    return sendJson(response, 503, {
      ok: false,
      authenticated: false,
      message: "The admin session could not be checked right now."
    });
  }
}

async function handleLogout(request, response) {
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
