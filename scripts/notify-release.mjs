#!/usr/bin/env node
// Invia la mail di notifica release agli iscritti in magware-refs/notify-release.json.
// Esecuzione:   npm run notify-release
//               npm run notify-release -- --dry-run        (stampa in console)
//               npm run notify-release -- --preview-html   (apre HTML nel browser)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import nodemailer from "nodemailer";

const dryRun = process.argv.includes("--dry-run");
const previewHtml = process.argv.includes("--preview-html");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractChangelog(content, version) {
  const match = content.match(new RegExp(`## \\[${version}\\] - (\\d{4}-\\d{2}-\\d{2})`));
  if (!match) throw new Error(`Version ${version} not found in CHANGELOG.md`);
  const releaseDate = match[1];
  const start = match.index;
  const end = content.indexOf("\n## [", start + 1);
  const section = end === -1 ? content.slice(start) : content.slice(start, end);
  // Strip the heading line — title is exposed via {{release_date}} placeholder
  const body = section.replace(/^## \[.*?\].*\n\n?/, "").trim();
  return { body, releaseDate };
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
    )
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" style="color:#0066cc">$1</a>',
    );
}

function mdToHtml(md) {
  const lines = md.split("\n");
  const out = [];
  let inList = false;
  let blankCount = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      blankCount = 0;
      out.push(
        `<h2 style="color:#222;border-bottom:2px solid #eee;padding-bottom:6px;margin-top:24px">${htmlEscape(line.slice(3))}</h2>`,
      );
    } else if (line.startsWith("### ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      blankCount = 0;
      out.push(
        `<h3 style="color:#333;border-bottom:1px solid #eee;padding-bottom:4px;margin-top:20px">${htmlEscape(line.slice(4))}</h3>`,
      );
    } else if (line.startsWith("- ")) {
      if (!inList) { out.push('<ul style="margin:4px 0;padding-left:20px">'); inList = true; }
      blankCount = 0;
      out.push(`<li style="margin:3px 0">${inlineFormat(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      blankCount++;
      if (blankCount === 2) out.push("<br>");
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      blankCount = 0;
      out.push(`<p style="margin:6px 0">${inlineFormat(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

// ── Load data ─────────────────────────────────────────────────────────────────

const { smtp, template, recipients } = JSON.parse(
  readFileSync(resolve(repoRoot, "magware-refs/notify-release.json"), "utf8"),
);
const { version } = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);
const { body: changelogMd, releaseDate } = extractChangelog(
  readFileSync(resolve(repoRoot, "CHANGELOG.md"), "utf8"),
  version,
);

// ── Build email ───────────────────────────────────────────────────────────────

function resolveTemplate(lang) {
  return template[lang] ?? template["en"];
}

function fill(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function buildEmail(name, lang) {
  const t = resolveTemplate(lang);
  const vars = { name, version, release_date: releaseDate, changelog: changelogMd };
  const subject = fill(t.subject, vars);
  const body = fill(t.body, vars);
  const html = `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#333;max-width:680px;margin:0 auto;padding:24px">
${mdToHtml(body)}
</body>
</html>`;
  return { subject, text: body, html };
}

// ── Send ──────────────────────────────────────────────────────────────────────

if (previewHtml) {
  const { name, lang } = recipients[0] ?? { name: "Test", lang: "en" };
  const { html } = buildEmail(name, lang);
  const tmpFile = resolve(repoRoot, "_site/notify-preview.html");
  writeFileSync(tmpFile, html, "utf8");
  console.log(`Preview saved to ${tmpFile}`);
  execSync(`open "${tmpFile}"`);
  process.exit(0);
}

if (dryRun) {
  const { name, email, lang } = recipients[0] ?? { name: "Test", email: "test@example.com", lang: "en" };
  const { subject, text } = buildEmail(name, lang);
  console.log("=== DRY RUN — first recipient preview ===\n");
  console.log(`To:      ${email}`);
  console.log(`Subject: ${subject}\n`);
  console.log("--- plain text ---");
  console.log(text);
  process.exit(0);
}

for (const k of ["host", "user", "pass", "from"]) {
  if (!smtp[k]) throw new Error(`Missing smtp.${k} in magware-refs/notify-release.json`);
}

const transport = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port ?? 587,
  secure: smtp.secure ?? false,
  auth: { user: smtp.user, pass: smtp.pass },
  tls: { rejectUnauthorized: false },
});

console.log(`Sending: Magware API v${version} → ${recipients.length} recipient(s)\n`);

for (const { name, email, lang } of recipients) {
  const { subject, text, html } = buildEmail(name, lang);
  try {
    await transport.sendMail({ from: smtp.from, to: email, subject, text, html });
    console.log(`  ✓ ${email}`);
  } catch (err) {
    console.error(`  ✗ ${email}: ${err.message}`);
  }
}

transport.close();
console.log("\nDone.");
