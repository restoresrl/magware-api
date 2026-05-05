# Changelog

## [1.0.0] - 2026-05-05

### Added

- 7 globally declared tags (`Items`, `ASN`, `Deliveries`, `Delivery Notes`,
  `Shipments`, `Inventory`, `Utility`) with descriptive content for sidebar
  navigation in the API reference.
- Note in `info.description` clarifying that the documented endpoint is the
  public sandbox; production URLs are tenant-specific and provided by Restore
  during onboarding.
- `POST /items` now documents **bulk creation**: the request body accepts either
  a single item object or an array of up to 100 items. Bulk response is an array
  of per-item results (each with `position`, `item_code`, `status`,
  `description`); HTTP status is always `200` even when some items fail.
- `GET /deliveries/prepared/{id}`, `GET /asn/received/{id}`: documented that
  calling the detail endpoint marks the record as acquired and removes it from
  the list returned by the corresponding collection endpoint (polling pattern).
- `Delivery Notes` endpoints (`GET /delivery_notes/prepared`,
  `GET /delivery_notes/{id}`) tagged as **Planned** — not yet implemented in the
  backend. Calling them currently returns `400`.
- `stock_snapshot` extracted as a named schema in `components/schemas` and reused
  by both `GET /stocks` and `GET /stocks/{item_code}`.
- `GET /items/{item_code}`: added response example with real sandbox payload.

### Changed

- Spec format upgraded to OpenAPI **3.1.0** (from 3.0.2), aligning with
  JSON Schema 2020-12 and native webhooks.
- Spec serialized as YAML (single file `openapi/magware.yaml`); previously
  distributed as JSON via Stoplight.
- Tag order in the sidebar is now logical-by-warehouse-flow: `Items` → `ASN` →
  `Deliveries` → `Delivery Notes` → `Shipments` → `Inventory` → `Utility`
  (previously alphabetical).
- `info.description` rewritten to be concise and tool-agnostic: removed external
  image dependency, decorative emoji, ASCII flow diagrams, duplicated sections,
  and the polling-vs-push comparison table. Kept and tightened: overview,
  authentication, error model, "List → Details" polling pattern.
- **Authentication model**: `APIKey` and `owner` are now declared as a combined
  security scheme applied globally (previously `owner` was a per-operation
  parameter). Most API tools expose them in a single "Authorize" panel.
- **Error envelope standardized**: all error responses use
  `{ "status": "error", "description": "..." }`. `409` and `422` are not used —
  duplicates and validation errors are signalled as `400`.
- `401 Unauthorized` and `500 Internal Server Error` applied globally to all 23
  operations; `404 Not Found` added to the 7 detail-by-id endpoints.
- Response examples for 7 endpoints updated with real payloads collected against
  the sandbox: `GET /asn/received/{id}`, `GET /deliveries/prepared/{id}`,
  `GET /deliveries/cancelled/{id}`, `GET /shipments/{id}`,
  `GET /adjustments/{id}`, `GET /stocks`, `GET /stocks/{item_code}`.
- `GET /version` example updated to reflect current server version.
- `GET /stocks/{item_code}`: added second example showing the no-stock response
  (only `date` and `time` fields; `items` is absent rather than an empty array).

### Fixed

- `info.license.url` now uses an absolute URI scheme (`https://`).
- `paths./delivery_notes/{id}.get.operationId` is now unique (previously
  duplicated with `/deliveries/prepared/{id}`).
- `delivery_note_details` schema: removed the non-existent `date` property at
  the root level. The actual backend exposes `preparation_date` (root) and
  `delivery_note.date` (nested).
- `delivery_prepared_details.preparation_date`: corrected format from
  `date-time` to `date` (backend serializes as date only).
- `shipment_details.deliveries[].tracking_id`: corrected type from `integer` to
  `string` (backend returns empty string `""` when no tracking ID is assigned).
- `row_number` in `asn_received_details.items`, `delivery_prepared_details`
  package items, and `package_item`: now accepts `null` — the backend does not
  always assign a row number in responses.
- `item.variants[].barcodes[]`: items now accept `null` — the backend returns
  `[null]` for variants with no barcode configured.
- Several `maxLength` values aligned to actual database column widths
  (e.g. `lot_number` 15 → 100, `barcodes[]` 50 → 100,
  `destination.title` 100 → 500, `delivery.reference` 255 → 250,
  `adjustment.reason_code` 5 → 50).
- `expedition_days` marked as `deprecated`.

### Removed

- Tag `Models` from the global tag declarations: it was declared but not used
  by any operation.
- All Stoplight-specific extensions (`x-stoplight-*`, `x-internal`, `x-examples`)
  removed from the spec.

### Known issues

- `GET /stocks/{item_code}`: the backend returns `200` with only `date` and
  `time` (no `items` field) when the item has no stock, rather than
  `{ date, time, items: [] }`. Treat a missing `items` field as an empty array.
- `item.variants[].quantity`, `volume`, `weight` and `item_stock.reserved_quantity`
  are declared as `number` in the schema but the backend serializes them as
  decimal strings in GET responses (e.g. `"1.000"`, `"0"`). Parse accordingly.
- `GET /delivery_notes/prepared` and `GET /delivery_notes/{id}` are not yet
  implemented in the backend and currently return `400`.
