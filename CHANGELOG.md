# Changelog

Tutte le modifiche rilevanti alla **spec OpenAPI** (`openapi/magware.yaml`) sono documentate in questo file.

Il formato è basato su [Keep a Changelog 1.1.0](https://keepachangelog.com/it/1.1.0/) e il progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/), allineato al campo `info.version` della spec.

## Scope

Questo changelog documenta **solo le modifiche al contratto pubblico delle API** — cioè cambi visibili a chi consuma `openapi/magware.yaml` o naviga la reference su `api.magware.it`: nuovi endpoint, modifiche a schema/parametri/response, deprecation, breaking change, fix di esempi o testi user-facing.

I cambi a tooling, configurazione del repo, CI, `CLAUDE.md` e altre attività interne **non rientrano** in questo file: restano tracciati nel `git log` e, per le scelte strutturali, nella sezione "Storia delle decisioni" di `CLAUDE.md`.

## [Unreleased]

## [1.0.0] - 2026-04-30

Prima release ufficiale del repo `magware-api` come progetto a sé stante. La spec è stata importata dall'edizione Stoplight (versione interna Magware `21.11`, calendar versioning del backend) e ribaseata a semver `1.0.0` per il contratto pubblico documentato qui. Le due numerazioni rimangono separate: il calver `21.11` continua a identificare la versione del backend, `1.0.0` identifica il contratto API pubblicato in questo repo.

### Added

- Importata la spec attuale di Magware API da Stoplight (bundled reference, 20 endpoint, 8 tag, 18 schema). Sostituito integralmente lo skeleton placeholder che era in `openapi/magware.yaml`.
- Aggiunto il tag globale `Delivery Notes` (era usato da 2 operation ma mancava nella dichiarazione `tags:` globale).
- Aggiunte description significative a tutti i 7 tag (prima erano placeholder identici al nome).
- Aggiunta nota su `info.description` che chiarisce: la reference documenta il sandbox pubblico (`https://sandbox.magware.it:9999`); gli URL di produzione sono per-tenant e comunicati da Restore in fase di onboarding.

### Changed

- Migrata la spec da OpenAPI **3.0.2** a **3.1.0** (allineamento a JSON Schema 2020-12 e webhook nativi). Cambio sintattico applicato: `nullable: true` → `type: [<tipo>, "null"]` (1 occorrenza). Nessuna altra incompatibilità rilevata.
- Convertita la spec dal formato JSON (export Stoplight) al formato YAML (file unico `openapi/magware.yaml`, decisione strutturale del repo).
- `info.version`: `"21.11"` → `"1.0.0"` (mapping da calver interno Magware a semver del repo pubblico — vedi nota in cima).
- Riordinati i tag globali da alfabetico a ordine logico per flusso warehouse: `ASN` (inbound) → `Items` (master data) → `Deliveries` → `Delivery Notes` → `Shipments` (outbound chain) → `Inventory` → `Utility`. Su Scalar i tag diventano la sidebar di navigazione: l'ordine logico aiuta gli integratori a leggere la reference nell'ordine operativo.
- Riscritta `info.description`: rimossa immagine `i.imgur.com` (link rot esterno + branding altrui), rimosse emoji decorative (🎯 🏗️ 📊 🔄 ✅), rimossa sezione `Core Operational Flow` con ASCII diagram (informazioni già presenti nei singoli endpoint), rimossa sezione `Pattern Benefits` duplicata (bug Stoplight, era ripetuta due volte), rimossa table `Polling vs Push` (concetto già coperto nel paragrafo precedente). Mantenuto e snellito il contenuto distintivo: Overview, Authentication, polling pattern "List → Details", Webhook alternative, reporting issues. Riduzione: ~310 → ~76 righe.

### Fixed

- `info.license.url`: aggiunto schema `https://` mancante (era `www.re-store.it`, ora `https://www.re-store.it`).
- `paths./delivery_notes/{id}.get.operationId`: era duplicato (`get-deliveries-prepared-id`, lo stesso usato da `/deliveries/prepared/{id}`); rinominato in `get-delivery-notes-id` per coerenza col path.
- Schema `delivery_note_details`: rimossa la property `date` (e la sua dichiarazione come `required`) al root — non esiste nel backend reale, l'oggetto reale ha `preparation_date` (al root) e `delivery_note.date` (annidato). Risolta così l'inconsistenza che bloccava il lint Spectral su `oas3-valid-media-example` per l'esempio `Prepared delivery`. Rimosso di conseguenza l'override temporaneo in `.spectral.yaml`.

### Removed

- Tag globale `Models`: era dichiarato in `tags:` ma non usato da nessuna operation.

### Known issues

- L'esempio `Prepared delivery` di `GET /delivery_notes/{id}` ha al root campi NON dichiarati nello schema `delivery_note_details`: `preparation_date`, `cancelled`, `channel`, `delivery_note` (sotto-oggetto). Viceversa lo schema dichiara `destination` e `tracking` che non sono nell'esempio. Tecnicamente non è errore Spectral (OpenAPI 3.1 default `additionalProperties: true`), ma è un disallineamento spec ↔ backend reale. Da affrontare in una futura fase di allineamento, fuori dallo scope di Fase 0/0bis.
