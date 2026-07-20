import {
  ApiRequestError,
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sendJson
} from "../src/lib/security.js";

const CHAT_BODY_LIMIT_BYTES = 24 * 1024;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;

const SYSTEM_PROMPT = `You are the EduReach website assistant for a South African inclusive education consultancy.

Your role:
- Explain EduReach services clearly and warmly.
- Help schools, educators, parents, caregivers and community organisations understand possible next steps.
- Answer questions about inclusive education, learner support, educator workshops, parent workshops, school support systems, SIAS, curriculum differentiation, autism support, cerebral palsy support and consultation bookings.
- Keep answers practical, concise and easy to understand.
- Encourage users to contact EduReach for personalised support when appropriate.

Important boundaries:
- Do not diagnose medical, psychological, developmental or learning conditions.
- Do not claim that EduReach provides emergency services.
- For emergencies or immediate danger, tell the user to contact local emergency services or a qualified professional.
- Do not invent prices, accreditation, staff qualifications, partnerships, availability or guarantees.
- When information is uncertain, say so and direct the user to EduReach through the website contact form, WhatsApp, phone or email.
- Protect privacy. Do not ask users to share ID numbers, medical records, passwords, payment details or sensitive information in chat.

EduReach contact details:
- Phone and WhatsApp: +27 81 214 8384
- Email: edureach70@gmail.com
- Website: edureach.network`;

function cleanMessage(message) {
  if (!message || !["user", "assistant"].includes(message.role)) return null;
  const content = String(message.content ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  return content ? { role: message.role, content } : null;
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text.trim();
      }
    }
  }

  return "";
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return sendJson(response, 200, { ok: true, service: "EduReach AI assistant" });
  }

  if (request.method !== "POST") {
    return methodNotAllowed(response, ["GET", "POST"]);
  }

  if (!(await enforceRateLimit(request, response, {
    name: "ai-chat",
    limit: 12,
    windowSeconds: 60
  }))) {
    return undefined;
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(response, 503, {
      ok: false,
      message: "The EduReach assistant is not configured yet."
    });
  }

  let body;
  try {
    body = await readJsonBody(request, { maxBytes: CHAT_BODY_LIMIT_BYTES });
  } catch (error) {
    return sendJson(response, error instanceof ApiRequestError ? error.statusCode : 400, {
      ok: false,
      message: error instanceof ApiRequestError ? error.message : "Invalid chat request."
    });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-MAX_MESSAGES).map(cleanMessage).filter(Boolean)
    : [];

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return sendJson(response, 400, {
      ok: false,
      message: "Please enter a question for the EduReach assistant."
    });
  }

  try {
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions: SYSTEM_PROMPT,
        input: messages,
        max_output_tokens: 500
      })
    });

    const data = await openAIResponse.json().catch(() => null);

    if (!openAIResponse.ok) {
      console.error("OpenAI rejected EduReach chat request.", {
        status: openAIResponse.status,
        error: data?.error?.message
      });
      return sendJson(response, 502, {
        ok: false,
        message: "The assistant is temporarily unavailable. Please contact EduReach directly."
      });
    }

    const reply = extractOutputText(data);
    if (!reply) {
      throw new Error("OpenAI response did not contain output text.");
    }

    return sendJson(response, 200, { ok: true, reply });
  } catch (error) {
    console.error("EduReach AI assistant failed.", error);
    return sendJson(response, 502, {
      ok: false,
      message: "The assistant is temporarily unavailable. Please try again later."
    });
  }
}
