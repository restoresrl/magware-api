# Changelog

## [Unreleased]

## [1.2.0] - 2026-05-26

### Added

- `item.expedition_days` is now active. The backend reads it on
  `POST /items` and `PUT /items/{item_code}`, and returns it on
  `GET /items/{item_code}` when set. The field is optional; when
  provided it must be `>= 1`. Specifies the number of days for
  expedition date calculation from the item's expiration date.

### Changed

- `PUT /items/{item_code}` description now documents the **merge
  semantics** of the operation explicitly: only fields included in
  the request body are updated, fields omitted from the body are
  left unchanged on the existing record, and to clear a field you
  must send it explicitly (e.g. `"note": ""`). The same rule applies
  to `variants[]`: only entries listed in the body are upserted,
  existing variants not in the body remain unchanged. This documents
  a behaviour that was already in place — the previous wording
  ("full item representation") was misleading. No wire change for
  integrators who were sending full payloads; integrators relying on
  partial bodies now have an explicit contract.

### Removed

- Deprecation marker on `item.expedition_days` — the field is no
  longer marked `deprecated`, as the backend now implements it on
  POST/PUT/GET.

## [1.1.0] - 2026-05-25

### Added

- **Multi-warehouse support.** New optional `warehouse_code` field
  (string, max 15 characters) on ASN, Deliveries, Shipments, Adjustments
  and Stocks flows, both in request payloads (where applicable) and in
  response payloads. When omitted on input, the operation targets the
  default warehouse configured for the owner. Single-warehouse
  integrators are not affected: the field can be omitted in requests
  and safely ignored if present in responses — no payload changes
  required.
- New schema `stock_item` for `stock_snapshot.items`. Identical to the
  existing `item_stock` schema but with an additional `warehouse_code`
  field. Stock quantities are warehouse-specific by nature, so each
  entry in the `stock_snapshot.items` array now carries its own
  `warehouse_code` — one snapshot can describe stocks across multiple
  physical warehouses. The existing `item_stock` schema is unchanged
  and still used by `adjustment.items` (where `warehouse_code` lives
  at the root of `adjustment`, not per item).
- New **Multi-warehouse** section in the API overview, covering request
  fallback behaviour, response semantics, validation, and the
  coexistence with the existing `stock_type` field (logical warehouse:
  `AVAIL`, `FLAWED`, `WS`) — the two are orthogonal. Items master data
  is intentionally **not** warehouse-scoped: an item is unique per
  owner regardless of warehouse.
- Examples in the response payloads of `GET /asn/received/{id}`,
  `GET /deliveries/prepared/{id}`, `GET /shipments/{id}`,
  `GET /adjustments/{id}`, `GET /stocks` and `GET /stocks/{item_code}`
  updated to include `warehouse_code`, reflecting real sandbox
  payloads.

### Validation

- Requests supplying a `warehouse_code` that does not exist in Magware
  return `400 Bad Request` with the standard error envelope. Currently
  applies to `POST /asn` and `POST /deliveries`.

### Known issues

- `POST /shipments`: the `warehouse_code` field on `shipment_creation`
  is currently **accepted but ignored** by the backend — shipments are
  always registered against the owner's default warehouse, regardless
  of the value supplied. Full support is planned in a future release.
- `GET /deliveries/cancelled/{id}`: the `warehouse_code` field on
  `delivery_cancelled_details` is **not currently emitted** by the
  backend. Clients should not expect it in the response. Full support
  is planned in a future release.

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
