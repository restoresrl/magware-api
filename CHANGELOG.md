# Changelog

## [1.0.0] - 2026-05-05

First stable public release of the Magware API reference. This version documents
the API as currently implemented and available on the public sandbox.

### Added

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
- Note clarifying that the documented server is the public sandbox; production
  URLs are tenant-specific and provided by Restore during onboarding.

### Changed

- **Authentication model**: `APIKey` and `owner` are now declared as a combined
  security scheme applied globally (previously `owner` was a per-operation
  parameter). Most API tools expose them in a single "Authorize" panel.
- **Error envelope standardized**: all error responses use
  `{ "status": "error", "description": "..." }`. `409` and `422` are not used —
  duplicates and validation errors are signalled as `400`.
- `401 Unauthorized` and `500 Internal Server Error` applied globally to all 23
  operations; `404 Not Found` added to the 7 detail-by-id endpoints.

### Fixed

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

### Known issues

- `GET /stocks/{item_code}`: the backend returns `200` with only `date` and
  `time` (no `items` field) when the item has no stock, rather than
  `{ date, time, items: [] }`. Treat a missing `items` field as an empty array.
- `item.variants[].quantity`, `volume`, `weight` and `item_stock.reserved_quantity`
  are declared as `number` in the schema but the backend serializes them as
  decimal strings in GET responses (e.g. `"1.000"`, `"0"`). Parse accordingly.
- `GET /delivery_notes/prepared` and `GET /delivery_notes/{id}` are not yet
  implemented in the backend and currently return `400`.
