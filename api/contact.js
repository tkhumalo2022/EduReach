const LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 40,
  organisation: 180,
  service: 120,
  message: 4000
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sendJson(response, statusCode, data) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(statusCode).json(data);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return sendJson(response, 200, {
      ok: true,
      service: "EduReach contact endpoint"
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return sendJson(response, 405, {
      ok: false,
      message: "Method not allowed."
    });
  }

  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const backendSecret = process.env.EDUREACH_BACKEND_SECRET;

  if (!appsScriptUrl || !backendSecret) {
    console.error("EduReach backend environment variables are missing.");
    return sendJson(response, 500, {
      ok: false,
      message: "The contact service is not configured yet."
    });
  }

  const body = request.body || {};

  // Honeypot field. Humans will not fill this field, but spam bots often do.
  if (clean(body.website, 200)) {
    return sendJson(response, 200, { ok: true });
  }

  const enquiry = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email).toLowerCase(),
    phone: clean(body.phone, LIMITS.phone),
    organisation: clean(body.organisation, LIMITS.organisation),
    service: clean(body.service, LIMITS.service),
    message: clean(body.message, LIMITS.message)
  };

  if (!enquiry.name || !enquiry.email || !enquiry.message) {
    return sendJson(response, 400, {
      ok: false,
      message: "Name, email and message are required."
    });
  }

  if (!EMAIL_PATTERN.test(enquiry.email)) {
    return sendJson(response, 400, {
      ok: false,
      message: "Enter a valid email address."
    });
  }

  try {
    const upstreamResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...enquiry,
        secret: backendSecret,
        source: "EduReach website",
        submittedAt: new Date().toISOString()
      }),
      redirect: "follow"
    });

    const responseText = await upstreamResponse.text();
    let upstreamData = null;

    try {
      upstreamData = JSON.parse(responseText);
    } catch {
      // Google Apps Script should return JSON. Non-JSON means something is wrong upstream.
    }

    if (!upstreamResponse.ok || upstreamData?.ok !== true) {
      console.error("Google Apps Script rejected the enquiry.", {
        status: upstreamResponse.status,
        responseText
      });

      return sendJson(response, 502, {
        ok: false,
        message: "The enquiry could not be saved right now."
      });
    }

    return sendJson(response, 200, {
      ok: true,
      message: "Thank you. Your message has been sent."
    });
  } catch (error) {
    console.error("EduReach contact endpoint failed.", error);

    return sendJson(response, 502, {
      ok: false,
      message: "The enquiry service is temporarily unavailable."
    });
  }
}
