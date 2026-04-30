# Changelog

## [Unreleased]

### Added

- 7 globally declared tags (`Items`, `ASN`, `Deliveries`, `Delivery Notes`, `Shipments`, `Inventory`, `Utility`) with descriptive content for sidebar navigation in the API reference.
- Note in `info.description` clarifying that the documented endpoint is the public sandbox; production URLs are tenant-specific and provided by Restore during onboarding.

### Changed

- Spec format upgraded to OpenAPI **3.1.0** (from 3.0.2), aligning with JSON Schema 2020-12 and native webhooks.
- Spec serialized as YAML (single file `openapi/magware.yaml`); previously distributed as JSON via Stoplight.
- Tag order in the sidebar is now logical-by-warehouse-flow: `Items` → `ASN` → `Deliveries` → `Delivery Notes` → `Shipments` → `Inventory` → `Utility` (previously alphabetical).
- `info.description` rewritten to be concise and tool-agnostic: removed external image dependency, decorative emoji, ASCII flow diagrams, duplicated sections, and the polling-vs-push comparison table. Kept and tightened: overview, authentication, "List → Details" polling pattern, webhook alternative, reporting issues. Length reduced from ~310 to ~76 lines.

### Fixed

- `info.license.url` now uses an absolute URI scheme (`https://`).
- `paths./delivery_notes/{id}.get.operationId` is now unique (previously duplicated with `/deliveries/prepared/{id}`).
- `delivery_note_details` schema: removed the non-existent `date` property at the root level. The actual backend exposes `preparation_date` (root) and `delivery_note.date` (nested).

### Removed

- Tag `Models` from the global tag declarations: it was declared but not used by any operation.

### Known issues

- The `Prepared delivery` example for `GET /delivery_notes/{id}` includes some root-level fields not declared in the `delivery_note_details` schema (`preparation_date`, `cancelled`, `channel`, nested `delivery_note` object); conversely the schema declares `destination` and `tracking` which are not present in the example. This is a residual spec ↔ backend divergence inherited from the previous Stoplight edition; reconciliation is planned for a future release.
