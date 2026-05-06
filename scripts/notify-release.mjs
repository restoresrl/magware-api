#!/usr/bin/env node
// Invia la mail di notifica release agli iscritti in magware-refs/recipients.json.
// Prerequisiti: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
//               compilati in magware-refs/.env
// Esecuzione:   npm run notify-release
//               npm run notify-release -- --dry-run   (stampa senza inviare)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

const dryRun = process.argv.includes("--dry-run");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    val = val.replace(/\$\{?(\w+)\}?/g, (_, k) => env[k] ?? "");
    env[key] = val;
  }
  return env;
}

function extractChangelog(content, version) {
  const start = content.indexOf(`## [${version}]`);
  if (start === -1) throw new Error(`Version ${version} not found in CHANGELOG.md`);
  const end = content.indexOf("\n## [", start + 1);
  const section = end === -1 ? content.slice(start) : content.slice(start, end);
  // Remove the "## [X.Y.Z] - YYYY-MM-DD" heading — it goes in the subject
  return section.replace(/^## \[.*?\].*\n\n?/, "").trim();
}

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(s) {
  return htmlEscape(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`(.+?)`/g,
      '<code style="font-family:monospace;background:#f5f5f5;padding:1px 4px;border-radius:3px">$1</code>',
    );
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:20px">${htmlEscape(line.slice(4))}</h3>`,
      );
    } else if (line.startsWith("- ")) {
      if (!inList) {
        out.push('<ul style="margin:4px 0;padding-left:20px">');
        inList = true;
      }
      out.push(`<li style="margin:3px 0">${inlineFormat(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p style="margin:6px 0">${inlineFormat(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

// ── Load data ─────────────────────────────────────────────────────────────────

const env = loadEnv(resolve(repoRoot, "magware-refs/.env"));
const { version } = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);
const changelogMd = extractChangelog(
  readFileSync(resolve(repoRoot, "CHANGELOG.md"), "utf8"),
  version,
);
const recipients = JSON.parse(
  readFileSync(resolve(repoRoot, "magware-refs/recipients.json"), "utf8"),
);

// ── Build email ───────────────────────────────────────────────────────────────

const subject = `Magware API v${version} released!`;

function buildText(name) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `${greeting}

A new version of the Magware API reference has been published.

Magware API v${version}
${"─".repeat(40)}

${changelogMd}

${"─".repeat(40)}
Full API reference: https://api.magware.it
Changelog: https://api.magware.it/#changelog
`;
}

function buildHtml(name) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#333;max-width:680px;margin:0 auto;padding:24px">
  <p>${htmlEscape(greeting)}</p>
  <p>A new version of the Magware API reference has been published.</p>
  <h2 style="color:#222;margin-bottom:0">Magware API v${version}</h2>
  <hr style="border:none;border-top:1px solid #eee;margin:12px 0 20px">
  ${mdToHtml(changelogMd)}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px">
  <p style="margin:4px 0">
    Full API reference: <a href="https://api.magware.it">api.magware.it</a>
  </p>
  <p style="margin:4px 0">
    Changelog: <a href="https://api.magware.it/#changelog">api.magware.it/#changelog</a>
  </p>
  <p style="color:#999;font-size:12px;margin-top:20px">
    You are receiving this because you are on the Magware API release notification list.
  </p>
</body>
</html>`;
}

// ── Send ──────────────────────────────────────────────────────────────────────

if (dryRun) {
  const { name, email } = recipients[0] ?? { name: "Test", email: "test@example.com" };
  console.log("=== DRY RUN — first recipient preview ===\n");
  console.log(`To:      ${email}`);
  console.log(`Subject: ${subject}\n`);
  console.log("--- plain text ---");
  console.log(buildText(name));
  console.log("--- html (truncated) ---");
  console.log(buildHtml(name).slice(0, 400) + "\n...");
  process.exit(0);
}

for (const v of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]) {
  if (!env[v]) throw new Error(`Missing ${v} in magware-refs/.env`);
}

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT ?? 587),
  secure: env.SMTP_SECURE === "true",
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

console.log(`Sending: Magware API v${version} → ${recipients.length} recipient(s)\n`);

for (const { name, email } of recipients) {
  try {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject,
      text: buildText(name),
      html: buildHtml(name),
    });
    console.log(`  ✓ ${email}`);
  } catch (err) {
    console.error(`  ✗ ${email}: ${err.message}`);
  }
}

transport.close();
console.log("\nDone.");
