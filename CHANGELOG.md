# Changelog

Tutte le modifiche rilevanti alla **spec OpenAPI** (`openapi/magware.yaml`) sono documentate in questo file.

Il formato è basato su [Keep a Changelog 1.1.0](https://keepachangelog.com/it/1.1.0/) e il progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/), allineato al campo `info.version` della spec.

## Scope

Questo changelog documenta **solo le modifiche al contratto pubblico delle API** — cioè cambi visibili a chi consuma `openapi/magware.yaml` o naviga la reference su `api.magware.it`: nuovi endpoint, modifiche a schema/parametri/response, deprecation, breaking change, fix di esempi o testi user-facing.

I cambi a tooling, configurazione del repo, CI, `CLAUDE.md` e altre attività interne **non rientrano** in questo file: restano tracciati nel `git log` e, per le scelte strutturali, nella sezione "Storia delle decisioni" di `CLAUDE.md`.

## [Unreleased]

### Added

- Importata la spec attuale di Magware API da Stoplight (bundled reference, 20 endpoint, 7 tag, 18 schema). Sostituito integralmente lo skeleton placeholder che era in `openapi/magware.yaml`.
- Aggiunto il tag globale `Delivery Notes` (era usato da 2 operation ma mancava nella dichiarazione `tags:` globale).

### Changed

- Migrata la spec da OpenAPI **3.0.2** a **3.1.0** (allineamento a JSON Schema 2020-12 e webhook nativi). Cambio sintattico applicato: `nullable: true` → `type: [<tipo>, "null"]` (1 occorrenza). Nessuna altra incompatibilità rilevata.
- Convertita la spec dal formato JSON (export Stoplight) al formato YAML (file unico `openapi/magware.yaml`, decisione strutturale del repo).

### Fixed

- `info.license.url`: aggiunto schema `https://` mancante (era `www.re-store.it`, ora `https://www.re-store.it`).
- `paths./delivery_notes/{id}.get.operationId`: era duplicato (`get-deliveries-prepared-id`, lo stesso usato da `/deliveries/prepared/{id}`); rinominato in `get-delivery-notes-id` per coerenza col path.

### Known issues

- L'esempio `Prepared delivery` di `GET /delivery_notes/{id}` non rispetta lo schema `delivery_note_details` (manca la property `date` richiesta al root). Override Spectral temporaneo in `.spectral.yaml` per non bloccare la CI; risoluzione richiede decisione di dominio (vedi Roadmap → Fase 0bis).
