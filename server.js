const crypto = require("crypto");
const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const { Resend } = require("resend");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "Bine Philippines <contact@binephils.com>";
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "bine1@binephils.com";
const QUOTE_TO_EMAIL = process.env.QUOTE_TO_EMAIL || "bine1@binephils.com";
const COMPANY_NAME = process.env.COMPANY_NAME || "Bine Philippines Inc.";
const COMPANY_WEBSITE = process.env.COMPANY_WEBSITE || "https://binephils.com";
const COMPANY_LOGO_URL =
  process.env.COMPANY_LOGO_URL || "https://binephils.com/images/Logo.png";
const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS ||
  "Lot 11 Blk 13 Golden Mile Avenue, Golden Mile Business Park, Carmona, Philippines 4116";
const COMPANY_PHONE = process.env.COMPANY_PHONE || "+63 2 8584 4474";

/**
 * Origins allowed to call POST /api/contact and POST /api/quote (browser sends Origin).
 * Includes localhost, COMPANY_WEBSITE, optional ALLOWED_ORIGINS (comma-separated),
 * and RENDER_EXTERNAL_URL when running on Render (e.g. https://your-app.onrender.com).
 */
function normalizeOriginUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.startsWith("http") ? trimmed : null;
}

function buildAllowedOrigins() {
  const set = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  const add = (raw) => {
    const n = normalizeOriginUrl(raw);
    if (n) set.add(n);
  };
  add(COMPANY_WEBSITE);
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .forEach((part) => add(part));
  add(process.env.RENDER_EXTERNAL_URL);
  // Vercel sets VERCEL_URL (per-deployment) and VERCEL_PROJECT_PRODUCTION_URL (stable production)
  if (process.env.VERCEL_URL) {
    set.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    set.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return set;
}

const ALLOWED_ORIGINS_SET = buildAllowedOrigins();

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const EMAIL_SEND_TIMEOUT_MS = 12000;
const rateLimitMap = new Map();
const RATE_LIMIT_CLEANUP_MS = 5 * 60 * 1000;
const RATE_LIMIT_MIN_RECORD_TTL_MS = 2 * RATE_LIMIT_WINDOW_MS;

const ALLOWED_CONTACT_SUBJECTS = new Set([
  "industrial",
  "construction",
  "products",
  "general",
]);
const ALLOWED_QUOTE_SERVICES = new Set([
  "construction",
  "traffic-safety",
  "aluminum-panels",
  "products",
  "industrial",
  "other",
]);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(express.json({ limit: "200kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "200kb" }));
// Prevent accidental exposure of sensitive files on public hosts.
app.use((req, res, next) => {
  const p = req.path || "";
  const isDotfile = p.startsWith("/.");
  const isNodeModules = p.startsWith("/node_modules");
  const sensitiveExact = new Set([
    "/server.js",
    "/package.json",
    "/package-lock.json",
    "/.env",
    "/.env.example",
  ]);

  if (isDotfile || isNodeModules || sensitiveExact.has(p)) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(__dirname));

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now - value.lastSeenAt > RATE_LIMIT_MIN_RECORD_TTL_MS) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_CLEANUP_MS).unref();

function log(level, message, meta = {}) {
  const base = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  console.log(JSON.stringify(base));
}

function getClientIp(req) {
  return req.ip || req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || "unknown";
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/+$/, "");
  return ALLOWED_ORIGINS_SET.has(normalized);
}

function assertAllowedOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return; // same-origin or non-browser request
  if (isAllowedOrigin(origin)) return;
  // Allow same-origin: origin host matches the request Host header
  const host = req.get("host");
  if (host && origin.replace(/^https?:\/\//, "") === host) return;
  const err = new Error("origin is not allowed");
  err.statusCode = 403;
  throw err;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeText(value, maxLength = 5000) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .trim()
    .replace(/[ \t]+/g, " ");
  return text.slice(0, maxLength);
}

function sanitizeMultilineText(value, maxLength = 5000) {
  const text = String(value ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();
  return text.slice(0, maxLength);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phoneRaw) {
  const digits = String(phoneRaw ?? "").replace(/\D/g, "");
  return digits.length === 10 ? digits : "";
}

function parseConsent(value) {
  return value === true || value === "true" || value === "1" || value === "on";
}

function formatPhoneLocal(phoneDigits) {
  return phoneDigits ? `0${phoneDigits}` : "";
}

function formatPhoneInternational(phoneDigits) {
  return phoneDigits ? `+63 ${phoneDigits}` : "";
}

function isSameEmail(a, b) {
  return sanitizeText(a, 200).toLowerCase() === sanitizeText(b, 200).toLowerCase();
}

function assertNotRateLimited(req, routeName) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${routeName}:${ip}`;
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      lastSeenAt: now,
    });
    return;
  }

  existing.count += 1;
  existing.lastSeenAt = now;
  rateLimitMap.set(key, existing);

  if (existing.count > RATE_LIMIT_MAX_REQUESTS) {
    const err = new Error("Too many requests. Please try again in a few minutes.");
    err.statusCode = 429;
    throw err;
  }
}

function collectValidationErrors(payload, fields) {
  const errors = [];
  fields.forEach((field) => {
    const value = payload[field];
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${field} is required`);
    }
  });
  return errors;
}

function makeEmailLayout({ title, subtitle, bodyRows }) {
  const brandPrimary = "#0f6a3a";
  const brandPrimaryDark = "#0b4e2b";
  const brandSoft = "#eaf7f0";
  const borderSoft = "#cfe9da";
  const textPrimary = "#0f172a";
  const textMuted = "#334155";

  const logoBlock = COMPANY_LOGO_URL
    ? `<img src="${escapeHtml(COMPANY_LOGO_URL)}" alt="${escapeHtml(COMPANY_NAME)} logo" width="138" style="display:block;margin:0 auto 14px auto;max-width:138px;height:auto;" />`
    : `<div style="display:inline-block;margin:0 auto 14px auto;padding:8px 14px;border-radius:999px;background:${brandSoft};color:${brandPrimaryDark};font-weight:700;font-size:13px;letter-spacing:.3px;">${escapeHtml(COMPANY_NAME)}</div>`;

  return `
  <div style="background:${brandSoft};padding:28px 14px;font-family:Arial,Helvetica,sans-serif;color:${textPrimary};">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${borderSoft};">
      <tr>
        <td style="background:linear-gradient(145deg, ${brandPrimary} 0%, ${brandPrimaryDark} 100%);padding:26px 20px;text-align:center;">
          ${logoBlock}
          <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(title)}</h1>
          <p style="margin:8px 0 0 0;color:#d1fae5;font-size:14px;line-height:1.4;">${escapeHtml(subtitle)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;">
            ${bodyRows}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 20px;background:#f8fffb;border-top:1px solid ${borderSoft};">
          <p style="margin:0 0 6px 0;font-weight:700;color:${textPrimary};">${escapeHtml(COMPANY_NAME)}</p>
          <p style="margin:0 0 6px 0;color:${textMuted};font-size:13px;">${escapeHtml(COMPANY_ADDRESS)}</p>
          <p style="margin:0;color:${textMuted};font-size:13px;">Phone: ${escapeHtml(COMPANY_PHONE)} | Website: <a href="${escapeHtml(COMPANY_WEBSITE)}" style="color:${brandPrimary};font-weight:600;">${escapeHtml(COMPANY_WEBSITE)}</a></p>
        </td>
      </tr>
    </table>
  </div>`;
}

function makeRow(label, value) {
  const rowBorder = "#dbe7df";
  const labelBg = "#f2fbf6";
  const labelText = "#14532d";
  const valueText = "#1f2937";
  return `
  <tr>
    <td style="width:185px;padding:10px 12px;border:1px solid ${rowBorder};background:${labelBg};color:${labelText};font-weight:700;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border:1px solid ${rowBorder};font-size:13px;line-height:1.5;color:${valueText};white-space:pre-wrap;">${escapeHtml(value)}</td>
  </tr>`;
}

async function withTimeout(promise, timeoutMs) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Email provider timeout"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function sendEmail(message) {
  if (!resend) {
    const err = new Error("Email service is not configured. Please set RESEND_API_KEY in .env.");
    err.statusCode = 500;
    throw err;
  }

  const result = await withTimeout(resend.emails.send(message), EMAIL_SEND_TIMEOUT_MS);
  if (result?.error) {
    const err = new Error("Email provider returned an error.");
    err.providerError = result.error;
    throw err;
  }
}

async function sendContactEmails(contact) {
  const phoneLocal = formatPhoneLocal(contact.phone);
  const phoneIntl = formatPhoneInternational(contact.phone);
  const internalRows = [
    makeRow("Name", contact.name),
    makeRow("Email", contact.email),
    makeRow("Contact Number", `${phoneLocal} (${phoneIntl})`),
    makeRow("Address", contact.address),
    makeRow("City", contact.city),
    makeRow("Province", contact.province || "N/A"),
    makeRow("Subject", contact.subjectLabel),
    makeRow("Message", contact.message),
  ].join("");

  const internalHtml = makeEmailLayout({
    title: "New Contact Form Submission",
    subtitle: "A visitor submitted a contact request from your website.",
    bodyRows: internalRows,
  });

  const internalText = [
    "New Contact Form Submission",
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Contact Number: ${phoneLocal} (${phoneIntl})`,
    `Address: ${contact.address}`,
    `City: ${contact.city}`,
    `Province: ${contact.province || "N/A"}`,
    `Subject: ${contact.subjectLabel}`,
    `Message: ${contact.message}`,
  ].join("\n");

  await sendEmail({
    from: FROM_EMAIL,
    to: [CONTACT_TO_EMAIL],
    subject: `New Contact Request - ${COMPANY_NAME} - ${contact.name}`,
    html: internalHtml,
    text: internalText,
    reply_to: [contact.email],
  });

  if (isSameEmail(contact.email, CONTACT_TO_EMAIL)) {
    return;
  }

  const acknowledgmentHtml = makeEmailLayout({
    title: "We Received Your Message",
    subtitle: "Thank you for contacting Bine Philippines Inc.",
    bodyRows: [
      makeRow("Name", contact.name),
      makeRow("Email", contact.email),
      makeRow("Contact Number", phoneLocal),
      makeRow("Subject", contact.subjectLabel),
      makeRow("Status", "Received successfully"),
      makeRow("Next Step", "Our team will review your message and respond within 24 hours."),
    ].join(""),
  });

  const acknowledgmentText = [
    `Hello ${contact.name},`,
    "",
    "Thank you for contacting Bine Philippines Inc.",
    "We have received your message and our team will get back to you within 24 hours.",
    "",
    `Email: ${contact.email}`,
    `Contact Number: ${phoneLocal}`,
    `Subject: ${contact.subjectLabel}`,
    `Status: Received successfully`,
  ].join("\n");

  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: [contact.email],
      subject: `We received your contact request - ${COMPANY_NAME}`,
      html: acknowledgmentHtml,
      text: acknowledgmentText,
      reply_to: [CONTACT_TO_EMAIL],
    });
  } catch (error) {
    // Keep the form submission successful if customer acknowledgment is blocked
    // by provider sandbox rules before domain verification.
    log("warn", "Contact acknowledgment email skipped", {
      endpoint: "contact",
      reason: error?.message || "unknown",
      providerError: error?.providerError || undefined,
    });
  }
}

async function sendQuoteEmails(quote) {
  const phoneLocal = formatPhoneLocal(quote.phone);
  const phoneIntl = formatPhoneInternational(quote.phone);
  const internalRows = [
    makeRow("Name", quote.name),
    makeRow("Email", quote.email),
    makeRow("Contact Number", `${phoneLocal} (${phoneIntl})`),
    makeRow("Address", quote.address),
    makeRow("Province", quote.province),
    makeRow("City", quote.city),
    makeRow("Service", quote.serviceLabel),
    makeRow("Timeline", quote.timeline || "Not specified"),
    makeRow("Project Details", quote.message),
  ].join("");

  const internalHtml = makeEmailLayout({
    title: "New Quote Request",
    subtitle: "A new quote request was submitted from your website.",
    bodyRows: internalRows,
  });

  const internalText = [
    "New Quote Request",
    `Name: ${quote.name}`,
    `Email: ${quote.email}`,
    `Contact Number: ${phoneLocal} (${phoneIntl})`,
    `Address: ${quote.address}`,
    `Province: ${quote.province}`,
    `City: ${quote.city}`,
    `Service: ${quote.serviceLabel}`,
    `Timeline: ${quote.timeline || "Not specified"}`,
    `Project Details: ${quote.message}`,
  ].join("\n");

  await sendEmail({
    from: FROM_EMAIL,
    to: [QUOTE_TO_EMAIL],
    subject: `New Quote Request - ${COMPANY_NAME} - ${quote.name}`,
    html: internalHtml,
    text: internalText,
    reply_to: [quote.email],
  });

  if (isSameEmail(quote.email, QUOTE_TO_EMAIL)) {
    return;
  }

  const acknowledgmentHtml = makeEmailLayout({
    title: "We Received Your Quote Request",
    subtitle: "Thank you for choosing Bine Philippines Inc.",
    bodyRows: [
      makeRow("Name", quote.name),
      makeRow("Email", quote.email),
      makeRow("Contact Number", phoneLocal),
      makeRow("Address", quote.address),
      makeRow("Province", quote.province),
      makeRow("City", quote.city),
      makeRow("Service", quote.serviceLabel),
      makeRow("Timeline", quote.timeline || "Not specified"),
      makeRow("Project Details", quote.message),
      makeRow("Status", "Quote request received"),
      makeRow("Next Step", "Our team will review your details and respond within 24 hours."),
    ].join(""),
  });

  const acknowledgmentText = [
    `Hello ${quote.name},`,
    "",
    "Thank you for your quote request.",
    "We have received your details and our team will get back to you within 24 hours.",
    "",
    `Email: ${quote.email}`,
    `Contact Number: ${phoneLocal}`,
    `Address: ${quote.address}`,
    `Province: ${quote.province}`,
    `City: ${quote.city}`,
    `Service: ${quote.serviceLabel}`,
    `Timeline: ${quote.timeline || "Not specified"}`,
    `Project Details: ${quote.message}`,
    "Status: Quote request received",
  ].join("\n");

  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: [quote.email],
      subject: `We received your quote request - ${COMPANY_NAME}`,
      html: acknowledgmentHtml,
      text: acknowledgmentText,
      reply_to: [QUOTE_TO_EMAIL],
    });
  } catch (error) {
    // Keep the form submission successful if customer acknowledgment is blocked
    // by provider sandbox rules before domain verification.
    log("warn", "Quote acknowledgment email skipped", {
      endpoint: "quote",
      reason: error?.message || "unknown",
      providerError: error?.providerError || undefined,
    });
  }
}

function buildContactPayload(body) {
  return {
    name: sanitizeText(body?.name, 120),
    address: sanitizeText(body?.address, 250),
    phone: normalizePhone(body?.phone),
    city: sanitizeText(body?.city, 120),
    province: sanitizeText(body?.province, 120),
    email: sanitizeText(body?.email, 160).toLowerCase(),
    subject: sanitizeText(body?.subject, 120),
    message: sanitizeMultilineText(body?.message, 3000),
    privacyConsent: parseConsent(body?.privacy_consent),
  };
}

function buildQuotePayload(body) {
  return {
    name: sanitizeText(body?.name, 120),
    email: sanitizeText(body?.email, 160).toLowerCase(),
    phone: normalizePhone(body?.phone),
    address: sanitizeText(body?.address, 250),
    province: sanitizeText(body?.province, 120),
    city: sanitizeText(body?.city, 120),
    service: sanitizeText(body?.service, 120),
    timeline: sanitizeText(body?.timeline, 200),
    message: sanitizeMultilineText(body?.message, 3000),
    privacyConsent: parseConsent(body?.privacy_consent),
  };
}

function validateContactPayload(contact) {
  const errors = collectValidationErrors(contact, [
    "name",
    "address",
    "city",
    "email",
    "subject",
    "message",
  ]);
  if (!contact.phone) errors.push("phone is invalid");
  if (contact.email && !isValidEmail(contact.email)) errors.push("email is invalid");
  if (!ALLOWED_CONTACT_SUBJECTS.has(contact.subject)) errors.push("subject is invalid");
  if (!contact.privacyConsent) errors.push("privacy consent is required");
  return errors;
}

function validateQuotePayload(quote) {
  const errors = collectValidationErrors(quote, [
    "name",
    "email",
    "address",
    "province",
    "city",
    "service",
    "message",
  ]);
  if (!quote.phone) errors.push("phone is invalid");
  if (quote.email && !isValidEmail(quote.email)) errors.push("email is invalid");
  if (!ALLOWED_QUOTE_SERVICES.has(quote.service)) errors.push("service is invalid");
  if (!quote.privacyConsent) errors.push("privacy consent is required");
  return errors;
}

function ensureNotBotTrap(body) {
  if (sanitizeText(body?.company_website, 160)) {
    const err = new Error("bot form submission detected");
    err.statusCode = 200;
    err.isSilentBot = true;
    throw err;
  }
}

const CONTACT_SUBJECT_LABELS = {
  industrial: "Industrial / Electroplating",
  construction: "Construction / Traffic Safety",
  products: "Products & Installation",
  general: "General Inquiry",
};

const QUOTE_SERVICE_LABELS = {
  construction: "General Construction",
  "traffic-safety": "Traffic Safety Solutions",
  "aluminum-panels": "Aluminum Insulated Panels",
  products: "Products & Installation",
  industrial: "Industrial / Electroplating",
  other: "Other",
};

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "email-api",
    resendConfigured: Boolean(RESEND_API_KEY),
  });
});

app.post("/api/contact", async (req, res, next) => {
  try {
    assertAllowedOrigin(req);
    assertNotRateLimited(req, "contact");
    ensureNotBotTrap(req.body);

    const contact = buildContactPayload(req.body);
    const errors = validateContactPayload(contact);
    if (errors.length) {
      const err = new Error(errors[0]);
      err.statusCode = 400;
      throw err;
    }

    contact.subjectLabel = CONTACT_SUBJECT_LABELS[contact.subject] || contact.subject;
    await sendContactEmails(contact);
    log("info", "Contact form submitted", {
      requestId: req.requestId,
      endpoint: "contact",
    });
    res.status(200).json({ ok: true, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

app.post("/api/quote", async (req, res, next) => {
  try {
    assertAllowedOrigin(req);
    assertNotRateLimited(req, "quote");
    ensureNotBotTrap(req.body);

    const quote = buildQuotePayload(req.body);
    const errors = validateQuotePayload(quote);
    if (errors.length) {
      const err = new Error(errors[0]);
      err.statusCode = 400;
      throw err;
    }

    quote.serviceLabel = QUOTE_SERVICE_LABELS[quote.service] || quote.service;
    await sendQuoteEmails(quote);
    log("info", "Quote form submitted", {
      requestId: req.requestId,
      endpoint: "quote",
    });
    res.status(200).json({ ok: true, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use((error, req, res, _next) => {
  if (error?.isSilentBot) {
    return res.status(200).json({ ok: true, requestId: req.requestId });
  }

  const statusCode = Number(error?.statusCode) || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const safeMessage = isClientError
    ? error.message
    : "Unable to submit your request right now. Please try again.";

  log(isClientError ? "warn" : "error", "API request failed", {
    requestId: req.requestId,
    endpoint: req.originalUrl,
    method: req.method,
    statusCode,
    message: error?.message || "unknown server error",
    providerError: error?.providerError || undefined,
  });

  return res.status(statusCode).json({
    error: safeMessage,
    requestId: req.requestId,
  });
});

// Export for Vercel serverless
module.exports = app;

// Only listen when running locally (not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    log("info", "Bine site server started", {
      port: PORT,
      resendConfigured: Boolean(RESEND_API_KEY),
    });
  });
}
