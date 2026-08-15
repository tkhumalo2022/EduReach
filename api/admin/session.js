import { getAdminSession, publicAdminSession } from "../../src/lib/adminAuth.js";
import { methodNotAllowed, sendJson } from "../../src/lib/security.js";

export default async function handler(request, response) {
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
