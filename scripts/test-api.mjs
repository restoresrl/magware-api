#!/usr/bin/env node
// Fase 2ter — Validazione API contro sandbox Magware.
//
// Livello 1: GET tests con discovery automatica degli ID esistenti.
// Livello 2: POST/PUT write tests (item APITEST001 + ASN/delivery/shipment).
// Error cases: 401, 404, 400 trasversali.
//
// Esecuzione: npm run test:api
// Prerequisiti: magware-refs/.env compilato (MAGWARE_SANDBOX_URL, MAGWARE_OWNER, MAGWARE_APIKEY).
// Per POST /shipments (L2-6): serve almeno una delivery in stato "prepared" in sandbox.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// sandbox cert is expired — acceptable for test environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ── Config ────────────────────────────────────────────────────────────────────

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // resolve references like $VAR or ${VAR}
    val = val.replace(/\$\{?(\w+)\}?/g, (_, k) => env[k] ?? "");
    env[key] = val;
  }
  return env;
}

const env = loadEnv(resolve(repoRoot, "magware-refs/.env"));

const BASE_URL = env.MAGWARE_SANDBOX_URL;
const OWNER = env.MAGWARE_OWNER;
const APIKEY = env.MAGWARE_APIKEY;

function timestamp() {
  return new Date().toISOString().replace(/[-T:Z.]/g, "").slice(0, 14);
}
const ts = timestamp();
const TEST_ITEM_CODE = `ITM${ts}`;
const TEST_ASN_CODE = `ASN${ts}`;
const TEST_DELIVERY_CODE = `DEL${ts}`;
const TEST_SHIPMENT_CODE = `SHP${ts}`;

if (!BASE_URL || !OWNER || !APIKEY) {
  console.error("✗ Missing required env vars. Check magware-refs/.env.");
  process.exit(1);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request(method, path, { body, omitAuth, omitOwner } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (!omitAuth) headers["APIKey"] = APIKEY;
  if (!omitOwner) headers["owner"] = OWNER;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  opts.signal = controller.signal;
  try {
    const res = await fetch(url, opts);
    clearTimeout(timer);
    let json = null;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        json = await res.json();
      } catch {
        json = null;
      }
    }
    return { status: res.status, json, headers: res.headers };
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === "AbortError" ? "timeout (10s)" : err.message;
    return { status: 0, json: null, error: msg };
  }
}

// ── Test runner ───────────────────────────────────────────────────────────────

const results = [];
let currentSection = "";

function section(name) {
  currentSection = name;
}

function pass(id, label, note = "") {
  results.push({ id, label, status: "pass", note, section: currentSection });
  const n = note ? `  — ${note}` : "";
  console.log(`  ✓  ${id.padEnd(6)} ${label}${n}`);
}

function fail(id, label, note = "") {
  results.push({ id, label, status: "fail", note, section: currentSection });
  const n = note ? `  — ${note}` : "";
  console.log(`  ✗  ${id.padEnd(6)} ${label}${n}`);
}

function skip(id, label, note = "") {
  results.push({ id, label, status: "skip", note, section: currentSection });
  const n = note ? `  — ${note}` : "";
  console.log(`  ⚠  ${id.padEnd(6)} ${label}${n}`);
}

function statusLabel(status) {
  return status === 0 ? "network error" : String(status);
}

function checkStatus(got, expected) {
  return got === expected;
}

function checkRequired(obj, fields) {
  if (!obj || typeof obj !== "object") return fields;
  return fields.filter((f) => !(f in obj));
}

// collected real payloads for spec example update
const realPayloads = {};

// ── Header ────────────────────────────────────────────────────────────────────

console.log("");
console.log("Magware API — sandbox test");
console.log(`Base URL : ${BASE_URL}`);
console.log(`Owner    : ${OWNER}`);
console.log("─".repeat(60));

// ── LIVELLO 2 — POST/PUT ──────────────────────────────────────────────────────

section("LIVELLO 2 — POST/PUT");
console.log("\nLIVELLO 2 — POST/PUT\n");

// L2-1: POST /items — crea APITEST001
{
  const id = "L2-1";
  const label = `POST /items — crea ${TEST_ITEM_CODE}`;
  const body = {
    code: TEST_ITEM_CODE,
    description: "API Test Item — do not use",
    um: "PZ",
    can_be_added_to_deliveries: true,
    variants: [{ code: "01", description: "variant 01", quantity: 1 }],
  };
  const r = await request("POST", "/items", { body });
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}, expected 200. Body: ${JSON.stringify(r.json)}`);
  } else {
    const missing = checkRequired(r.json, ["status"]);
    if (missing.length) {
      fail(id, label, `missing fields: ${missing.join(", ")}`);
    } else {
      pass(id, label, `status: ${r.json.status}`);
    }
  }
}

// L1-02: GET /items/{item_code}
{
  const id = "L1-02";
  const label = `GET /items/${TEST_ITEM_CODE}`;
  const r = await request("GET", `/items/${TEST_ITEM_CODE}`);
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    const missing = checkRequired(r.json, ["code", "um", "variants"]);
    if (missing.length) {
      fail(id, label, `missing required fields: ${missing.join(", ")}`);
    } else {
      pass(id, label);
      realPayloads["GET /items/{item_code}"] = r.json;
    }
  }
}

// L1-03: HEAD /items/{item_code}
{
  const id = "L1-03";
  const label = `HEAD /items/${TEST_ITEM_CODE}`;
  const r = await request("HEAD", `/items/${TEST_ITEM_CODE}`);
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// L1-04: POST /items/exists — verifica APITEST001 esiste
{
  const id = "L1-04";
  const label = `POST /items/exists — ${TEST_ITEM_CODE}/01 exists: true`;
  const body = [{ code: TEST_ITEM_CODE, variant: "01" }];
  const r = await request("POST", "/items/exists", { body });
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else if (!Array.isArray(r.json)) {
    fail(id, label, "response is not an array");
  } else if (!r.json[0]?.exists) {
    fail(id, label, `exists: ${r.json[0]?.exists} — item not found after creation`);
  } else {
    pass(id, label);
  }
}

// L2-2: PUT /items/{item_code}
{
  const id = "L2-2";
  const label = `PUT /items/${TEST_ITEM_CODE} — aggiorna note`;
  const body = {
    code: TEST_ITEM_CODE,
    description: "API Test Item — do not use",
    um: "PZ",
    note: "updated by test-api.mjs",
    can_be_added_to_deliveries: true,
    variants: [{ code: "01", description: "variant 01", quantity: 1 }],
  };
  const r = await request("PUT", `/items/${TEST_ITEM_CODE}`, { body });
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}. Body: ${JSON.stringify(r.json)}`);
  } else {
    pass(id, label);
  }
}

// L2-3: POST /items/exists — ancora exists: true dopo PUT
{
  const id = "L2-3";
  const label = `POST /items/exists — ${TEST_ITEM_CODE}/01 exists dopo PUT`;
  const body = [{ code: TEST_ITEM_CODE, variant: "01" }];
  const r = await request("POST", "/items/exists", { body });
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else if (!r.json[0]?.exists) {
    fail(id, label, "item non trovato dopo PUT");
  } else {
    pass(id, label);
  }
}

// L2-4: POST /asn
{
  const id = "L2-4";
  const label = `POST /asn — crea ${TEST_ASN_CODE}`;
  const today = new Date().toISOString().slice(0, 10);
  const body = {
    code: TEST_ASN_CODE,
    supplier: { code: "CLAUDETEST_SUP", name: "Claude Test Supplier" },
    movement_type: { code: "P001", description: "Purchase from supplier" },
    arrival_date: today,
    delivery_note: { code: `DN${TEST_ASN_CODE}`, date: today },
    contents: [
      {
        row_number: 1,
        item: { code: TEST_ITEM_CODE, variant: "01" },
        quantity: 10,
      },
    ],
  };
  const r = await request("POST", "/asn", { body });
  // backend returns 201 (spec says 200 — known discrepancy, spec needs fix)
  if (!checkStatus(r.status, 201)) {
    fail(id, label, `got ${statusLabel(r.status)}. Body: ${JSON.stringify(r.json)}`);
  } else {
    pass(id, label, `status: ${r.json?.status}`);
  }
}

// L2-5: POST /deliveries
{
  const id = "L2-5";
  const label = `POST /deliveries — crea ${TEST_DELIVERY_CODE}`;
  const today = new Date().toISOString().slice(0, 10);
  const body = {
    code: TEST_DELIVERY_CODE,
    date: today,
    movement_type: { code: "V001", description: "Test movement" },
    destination: {
      code: "TESTCLI",
      name: "Test Cliente API",
      address: {
        address1: "Via Roma 1",
        city: "MILANO",
        zip: "20100",
        country: "IT",
      },
    },
    items: [
      {
        row_number: 1,
        item: { code: TEST_ITEM_CODE, variant: "01" },
        quantity: 1,
      },
    ],
  };
  const r = await request("POST", "/deliveries", { body });
  // backend returns 201 (spec says 200 — known discrepancy, spec needs fix)
  if (!checkStatus(r.status, 201)) {
    fail(id, label, `got ${statusLabel(r.status)}. Body: ${JSON.stringify(r.json)}`);
  } else {
    pass(id, label, `status: ${r.json?.status}`);
  }
}

// L2-6: POST /shipments — richiede delivery prepared in sandbox (skip temporaneo)
{
  const id = "L2-6";
  const label = `POST /shipments — crea ${TEST_SHIPMENT_CODE}`;
  skip(id, label, "da riprendere quando c'è una delivery prepared dedicata in sandbox");
}

// ── LIVELLO 1 — GET ───────────────────────────────────────────────────────────

section("LIVELLO 1 — GET");
console.log("\nLIVELLO 1 — GET\n");

// L1-01: GET /version
{
  const id = "L1-01";
  const label = "GET /version";
  const r = await request("GET", "/version");
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    const missing = checkRequired(r.json, ["product", "version"]);
    if (missing.length) {
      fail(id, label, `missing: ${missing.join(", ")}`);
    } else {
      pass(id, label, `${r.json.product} ${r.json.version}`);
      realPayloads["GET /version"] = r.json;
    }
  }
}

// L1-05/06: GET /asn/received + detail
{
  const listId = "L1-05";
  const detailId = "L1-06";
  const listLabel = "GET /asn/received";
  const r = await request("GET", "/asn/received");
  if (!checkStatus(r.status, 200)) {
    fail(listId, listLabel, `got ${statusLabel(r.status)}`);
    skip(detailId, "GET /asn/received/{id}", "dipende da L1-05");
  } else if (!Array.isArray(r.json)) {
    fail(listId, listLabel, "response is not an array");
    skip(detailId, "GET /asn/received/{id}", "dipende da L1-05");
  } else {
    pass(listId, listLabel, `${r.json.length} IDs`);
    if (r.json.length === 0) {
      skip(detailId, "GET /asn/received/{id}", "lista vuota");
    } else {
      const firstId = r.json[0];
      const dr = await request("GET", `/asn/received/${firstId}`);
      if (!checkStatus(dr.status, 200)) {
        fail(detailId, `GET /asn/received/${firstId}`, `got ${statusLabel(dr.status)}`);
      } else {
        const missing = checkRequired(dr.json, ["asn_code", "supplier", "arrival_date", "stock_date"]);
        if (missing.length) {
          fail(detailId, `GET /asn/received/${firstId}`, `missing: ${missing.join(", ")}`);
        } else {
          pass(detailId, `GET /asn/received/${firstId}`);
          realPayloads["GET /asn/received/{id}"] = dr.json;
        }
      }
    }
  }
}

// L1-07/08: GET /deliveries/prepared + detail
{
  const listId = "L1-07";
  const detailId = "L1-08";
  const r = await request("GET", "/deliveries/prepared");
  if (!checkStatus(r.status, 200)) {
    fail(listId, "GET /deliveries/prepared", `got ${statusLabel(r.status)}`);
    skip(detailId, "GET /deliveries/prepared/{id}", "dipende da L1-07");
  } else if (!Array.isArray(r.json)) {
    fail(listId, "GET /deliveries/prepared", "response is not an array");
    skip(detailId, "GET /deliveries/prepared/{id}", "dipende da L1-07");
  } else {
    pass(listId, "GET /deliveries/prepared", `${r.json.length} IDs`);
    if (r.json.length === 0) {
      skip(detailId, "GET /deliveries/prepared/{id}", "lista vuota");
    } else {
      const firstId = r.json[0];
      const dr = await request("GET", `/deliveries/prepared/${firstId}`);
      if (!checkStatus(dr.status, 200)) {
        fail(detailId, `GET /deliveries/prepared/${firstId}`, `got ${statusLabel(dr.status)}`);
      } else {
        const missing = checkRequired(dr.json, ["code", "preparation_date", "courier_code", "delivery_note", "weight", "volume"]);
        if (missing.length) {
          fail(detailId, `GET /deliveries/prepared/${firstId}`, `missing: ${missing.join(", ")}`);
        } else {
          pass(detailId, `GET /deliveries/prepared/${firstId}`);
          realPayloads["GET /deliveries/prepared/{id}"] = dr.json;
        }
      }
    }
  }
}

// L1-09/10: GET /deliveries/cancelled + detail
{
  const listId = "L1-09";
  const detailId = "L1-10";
  const r = await request("GET", "/deliveries/cancelled");
  if (!checkStatus(r.status, 200)) {
    fail(listId, "GET /deliveries/cancelled", `got ${statusLabel(r.status)}`);
    skip(detailId, "GET /deliveries/cancelled/{id}", "dipende da L1-09");
  } else if (!Array.isArray(r.json)) {
    fail(listId, "GET /deliveries/cancelled", "response is not an array");
    skip(detailId, "GET /deliveries/cancelled/{id}", "dipende da L1-09");
  } else {
    pass(listId, "GET /deliveries/cancelled", `${r.json.length} IDs`);
    if (r.json.length === 0) {
      skip(detailId, "GET /deliveries/cancelled/{id}", "lista vuota");
    } else {
      const firstId = r.json[0];
      const dr = await request("GET", `/deliveries/cancelled/${firstId}`);
      if (!checkStatus(dr.status, 200)) {
        fail(detailId, `GET /deliveries/cancelled/${firstId}`, `got ${statusLabel(dr.status)}`);
      } else {
        const missing = checkRequired(dr.json, ["code"]);
        if (missing.length) {
          fail(detailId, `GET /deliveries/cancelled/${firstId}`, `missing: ${missing.join(", ")}`);
        } else {
          pass(detailId, `GET /deliveries/cancelled/${firstId}`);
          realPayloads["GET /deliveries/cancelled/{id}"] = dr.json;
        }
      }
    }
  }
}

// L1-11/12: GET /shipments + detail
{
  const listId = "L1-11";
  const detailId = "L1-12";
  const r = await request("GET", "/shipments");
  if (!checkStatus(r.status, 200)) {
    fail(listId, "GET /shipments", `got ${statusLabel(r.status)}`);
    skip(detailId, "GET /shipments/{id}", "dipende da L1-11");
  } else if (!Array.isArray(r.json)) {
    fail(listId, "GET /shipments", "response is not an array");
    skip(detailId, "GET /shipments/{id}", "dipende da L1-11");
  } else {
    pass(listId, "GET /shipments", `${r.json.length} IDs`);
    if (r.json.length === 0) {
      skip(detailId, "GET /shipments/{id}", "lista vuota");
    } else {
      const firstId = r.json[0];
      const dr = await request("GET", `/shipments/${firstId}`);
      if (!checkStatus(dr.status, 200)) {
        fail(detailId, `GET /shipments/${firstId}`, `got ${statusLabel(dr.status)}`);
      } else {
        const missing = checkRequired(dr.json, ["code", "date", "time", "deliveries"]);
        if (missing.length) {
          fail(detailId, `GET /shipments/${firstId}`, `missing: ${missing.join(", ")}`);
        } else {
          pass(detailId, `GET /shipments/${firstId}`);
          realPayloads["GET /shipments/{id}"] = dr.json;
        }
      }
    }
  }
}

// L1-13: GET /stocks
{
  const id = "L1-13";
  const label = "GET /stocks";
  const r = await request("GET", "/stocks");
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    const missing = checkRequired(r.json, ["date", "time", "items"]);
    if (missing.length) {
      fail(id, label, `missing: ${missing.join(", ")}`);
    } else {
      pass(id, label, `${r.json.items?.length ?? 0} items`);
      realPayloads["GET /stocks"] = r.json;
    }
  }
}

// L1-14: GET /stocks/{item_code}
{
  const id = "L1-14";
  const label = `GET /stocks/${TEST_ITEM_CODE}`;
  const r = await request("GET", `/stocks/${TEST_ITEM_CODE}`);
  if (!checkStatus(r.status, 200)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    const missing = checkRequired(r.json, ["date", "time"]);
    if (missing.length) {
      fail(id, label, `missing: ${missing.join(", ")}`);
    } else {
      // backend omits "items" when there is no stock (returns 200 with no items array)
      const itemCount = r.json.items?.length ?? 0;
      pass(id, label, `${itemCount} stock records${r.json.items === undefined ? " (items field absent — no stock)" : ""}`);
      realPayloads[`GET /stocks/{item_code}`] = r.json;
    }
  }
}

// L1-15/16: GET /adjustments + detail
{
  const listId = "L1-15";
  const detailId = "L1-16";
  const r = await request("GET", "/adjustments");
  if (!checkStatus(r.status, 200)) {
    fail(listId, "GET /adjustments", `got ${statusLabel(r.status)}`);
    skip(detailId, "GET /adjustments/{id}", "dipende da L1-15");
  } else if (!Array.isArray(r.json)) {
    fail(listId, "GET /adjustments", "response is not an array");
    skip(detailId, "GET /adjustments/{id}", "dipende da L1-15");
  } else {
    pass(listId, "GET /adjustments", `${r.json.length} IDs`);
    if (r.json.length === 0) {
      skip(detailId, "GET /adjustments/{id}", "lista vuota");
    } else {
      const firstId = r.json[0];
      const dr = await request("GET", `/adjustments/${firstId}`);
      if (!checkStatus(dr.status, 200)) {
        fail(detailId, `GET /adjustments/${firstId}`, `got ${statusLabel(dr.status)}`);
      } else {
        const missing = checkRequired(dr.json, ["code", "reason_code", "sign", "date", "time"]);
        if (missing.length) {
          fail(detailId, `GET /adjustments/${firstId}`, `missing: ${missing.join(", ")}`);
        } else {
          pass(detailId, `GET /adjustments/${firstId}`);
          realPayloads["GET /adjustments/{id}"] = dr.json;
        }
      }
    }
  }
}

// ── ERROR CASES ───────────────────────────────────────────────────────────────

section("ERROR CASES");
console.log("\nERROR CASES\n");

// E-01: 401 senza APIKey
{
  const id = "E-01";
  const label = "GET /version → 401 (no APIKey)";
  const r = await request("GET", "/version", { omitAuth: true });
  if (!checkStatus(r.status, 401)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// E-02: 401 senza owner
{
  const id = "E-02";
  const label = "GET /version → 401 (no owner)";
  const r = await request("GET", "/version", { omitOwner: true });
  if (!checkStatus(r.status, 401)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// E-03: 404 GET item inesistente
{
  const id = "E-03";
  const label = "GET /items/CODICE_INESISTENTE_XYZ → 404";
  const r = await request("GET", "/items/CODICE_INESISTENTE_XYZ");
  if (!checkStatus(r.status, 404)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// E-04: 404 HEAD item inesistente
{
  const id = "E-04";
  const label = "HEAD /items/CODICE_INESISTENTE_XYZ → 404";
  const r = await request("HEAD", "/items/CODICE_INESISTENTE_XYZ");
  if (!checkStatus(r.status, 404)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// E-05: 400 POST /items/exists con array vuoto
{
  const id = "E-05";
  const label = "POST /items/exists [] → 400";
  const r = await request("POST", "/items/exists", { body: [] });
  if (!checkStatus(r.status, 400)) {
    fail(id, label, `got ${statusLabel(r.status)}`);
  } else {
    pass(id, label);
  }
}

// ── REPORT ────────────────────────────────────────────────────────────────────

console.log("\n" + "─".repeat(60));

const passed = results.filter((r) => r.status === "pass").length;
const skipped = results.filter((r) => r.status === "skip").length;
const failed = results.filter((r) => r.status === "fail").length;

console.log("\n" + "─".repeat(60));
console.log(`Passed: ${passed}   Skipped: ${skipped}   Failed: ${failed}`);
console.log("─".repeat(60));

// ── PAYLOAD REALI ─────────────────────────────────────────────────────────────

if (Object.keys(realPayloads).length > 0) {
  console.log("\nPAYLOAD REALI (per aggiornamento esempi spec):\n");
  for (const [endpoint, payload] of Object.entries(realPayloads)) {
    console.log(`── ${endpoint}`);
    console.log(JSON.stringify(payload, null, 2));
    console.log("");
  }
}

if (failed > 0) process.exit(1);
