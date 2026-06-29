const CONFIG = Object.freeze({
  sheetName: "Enquiries",
  businessName: "EduReach Inclusive Education Consultancy",
  businessEmail: "edureach70@gmail.com",
  businessPhone: "081 218 1963"
});

function doGet() {
  return respond({ ok: true, service: "EduReach Google Sheets endpoint" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty("EDUREACH_BACKEND_SECRET");

    if (!expectedSecret) {
      throw new Error("EDUREACH_BACKEND_SECRET is not configured.");
    }

    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (String(data.secret || "") !== expectedSecret) {
      return respond({ ok: false, error: "Unauthorized" });
    }

    const enquiry = normalizeEnquiry(data);
    validateEnquiry(enquiry);

    lock.waitLock(10000);
    lockAcquired = true;

    const sheet = getOrCreateSheet();
    const receivedAt = new Date();

    sheet.appendRow([
      receivedAt,
      safeSheetValue(enquiry.name),
      safeSheetValue(enquiry.email),
      safeSheetValue(enquiry.phone),
      safeSheetValue(enquiry.organisation),
      safeSheetValue(enquiry.service),
      safeSheetValue(enquiry.message),
      safeSheetValue(enquiry.source),
      "New"
    ]);

    lock.releaseLock();
    lockAcquired = false;

    let emailWarning = "";

    try {
      sendClientConfirmation(enquiry);
      sendAdminNotification(enquiry, receivedAt);
    } catch (emailError) {
      console.error("Enquiry saved, but email sending failed:", emailError);
      emailWarning = "Enquiry saved, but an email notification could not be sent.";
    }

    return respond({ ok: true, warning: emailWarning });
  } catch (error) {
    if (lockAcquired) {
      try {
        lock.releaseLock();
      } catch (releaseError) {
        console.error("Could not release script lock:", releaseError);
      }
    }

    console.error("EduReach enquiry failed:", error);
    return respond({ ok: false, error: "Could not process enquiry." });
  }
}

function normalizeEnquiry(data) {
  return {
    name: clean(data.name, 120),
    email: clean(data.email, 254).toLowerCase(),
    phone: clean(data.phone, 40),
    organisation: clean(data.organisation, 180),
    service: clean(data.service, 120),
    message: clean(data.message, 4000),
    source: clean(data.source, 100) || "EduReach website"
  };
}

function validateEnquiry(enquiry) {
  if (!enquiry.name || !enquiry.email || !enquiry.message) {
    throw new Error("Name, email and message are required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiry.email)) {
    throw new Error("Invalid email address.");
  }
}

function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("This Apps Script project must be attached to a Google Sheet.");
  }

  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 9).setValues([[
      "Received At",
      "Full Name",
      "Email",
      "Phone",
      "School or Organisation",
      "Service",
      "Message",
      "Source",
      "Status"
    ]]);
    sheet.setFrozenRows(1);
    sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  }

  return sheet;
}

function sendClientConfirmation(enquiry) {
  const subject = "We received your EduReach enquiry";
  const plainBody = [
    `Hello ${enquiry.name},`,
    "",
    "Thank you for contacting EduReach Inclusive Education Consultancy.",
    "We have received your enquiry and will respond as soon as possible.",
    "",
    `Email: ${CONFIG.businessEmail}`,
    `Phone/WhatsApp: ${CONFIG.businessPhone}`,
    "",
    "Kind regards,",
    "EduReach Inclusive Education Consultancy"
  ].join("\n");

  const htmlBody = `
    <p>Hello ${escapeHtml(enquiry.name)},</p>
    <p>Thank you for contacting <strong>EduReach Inclusive Education Consultancy</strong>.</p>
    <p>We have received your enquiry and will respond as soon as possible.</p>
    <p>
      <strong>Email:</strong> ${escapeHtml(CONFIG.businessEmail)}<br>
      <strong>Phone/WhatsApp:</strong> ${escapeHtml(CONFIG.businessPhone)}
    </p>
    <p>Kind regards,<br>EduReach Inclusive Education Consultancy</p>
  `;

  MailApp.sendEmail({
    to: enquiry.email,
    subject,
    body: plainBody,
    htmlBody,
    name: CONFIG.businessName,
    replyTo: CONFIG.businessEmail
  });
}

function sendAdminNotification(enquiry, receivedAt) {
  const subject = `New EduReach website enquiry from ${enquiry.name}`;
  const rows = [
    ["Received", Utilities.formatDate(receivedAt, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")],
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone || "Not provided"],
    ["School or organisation", enquiry.organisation || "Not provided"],
    ["Service", enquiry.service || "Not selected"],
    ["Message", enquiry.message]
  ];

  const plainBody = rows.map(function(row) {
    return `${row[0]}: ${row[1]}`;
  }).join("\n\n");

  const htmlRows = rows.map(function(row) {
    return `<tr>
      <th align="left" valign="top" style="padding:6px 12px 6px 0;">${escapeHtml(row[0])}</th>
      <td style="padding:6px 0;white-space:pre-wrap;">${escapeHtml(row[1])}</td>
    </tr>`;
  }).join("");

  MailApp.sendEmail({
    to: CONFIG.businessEmail,
    subject,
    body: plainBody,
    htmlBody: `<h2>New website enquiry</h2><table>${htmlRows}</table>`,
    name: "EduReach Website",
    replyTo: enquiry.email
  });
}

function clean(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function safeSheetValue(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
