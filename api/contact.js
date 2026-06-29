const LIMITS = Object.freeze({
  name: 120,
  email: 254,
  phone: 40,
  organisation: 180,
  service: 120,
  message: 4000
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export function GET() {
  return json({ ok: true, service: "EduReach contact endpoint" });
}

export async function POST(request) {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const backendSecret = process.env.EDUREACH_BACKEND_SECRET;

  if (!appsScriptUrl || !backendSecret) {
    console.error("EduReach backend environment variables are missing.");
    return json(
      { ok: false, message: "The contact service is not configured yet." },
      500
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request body." }, 400);
  }

  if (clean(body.website, 200)) {
    return json({ ok: true });
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
    return json(
      { ok: false, message: "Name, email and message are required." },
      400
    );
  }

  if (!EMAIL_PATTERN.test(enquiry.email)) {
    return json({ ok: false, message: "Enter a valid email address." }, 400);
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
        source: "EduReach website"
      }),
      redirect: "follow"
    });

    const responseText = await upstreamResponse.text();
    let upstreamData = null;

    try {
      upstreamData = JSON.parse(responseText);
    } catch {
      // A non-JSON reply is treated as an upstream failure below.
    }

    if (!upstreamResponse.ok || upstreamData?.ok !== true) {
      console.error("Google Apps Script rejected the enquiry.", {
        status: upstreamResponse.status,
        responseText
      });
      return json(
        { ok: false, message: "The enquiry could not be saved right now." },
        502
      );
    }

    return json({
      ok: true,
      message: "Thank you. Your message has been sent."
    });
  } catch (error) {
    console.error("EduReach contact endpoint failed.", error);
    return json(
      { ok: false, message: "The enquiry service is temporarily unavailable." },
      502
    );
  }
}
