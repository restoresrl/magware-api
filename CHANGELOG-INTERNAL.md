# Changelog

Tutte le modifiche rilevanti alla **spec OpenAPI** (`openapi/magware.yaml`) sono documentate in questo file.

Il formato è basato su [Keep a Changelog 1.1.0](https://keepachangelog.com/it/1.1.0/) e il progetto aderisce al [Semantic Versioning](https://semver.org/lang/it/), allineato al campo `info.version` della spec.

## Scope

Questo changelog documenta **solo le modifiche al contratto pubblico delle API** — cioè cambi visibili a chi consuma `openapi/magware.yaml` o naviga la reference su `api.magware.it`: nuovi endpoint, modifiche a schema/parametri/response, deprecation, breaking change, fix di esempi o testi user-facing.

I cambi a tooling, configurazione del repo, CI, `CLAUDE.md` e altre attività interne **non rientrano** in questo file: restano tracciati nel `git log` e, per le scelte strutturali, nella sezione "Storia delle decisioni" di `CLAUDE.md`.

## [Unreleased]

> Tutto il lavoro fatto dall'inizio del repo è in `[Unreleased]` finché non si rilascia la prima release pubblica (al termine della revisione della spec). A quel punto l'intero contenuto qui sotto verrà consolidato in inglese in `CHANGELOG.md`, taggato con il primo `vX.Y.Z` e promosso a sezione versionata anche qui.

### Added

- Importata la spec attuale di Magware API da Stoplight (bundled reference, 20 endpoint, 8 tag, 18 schema). Sostituito integralmente lo skeleton placeholder che era in `openapi/magware.yaml`.
- Aggiunto il tag globale `Delivery Notes` (era usato da 2 operation ma mancava nella dichiarazione `tags:` globale).
- Aggiunte description significative a tutti i 7 tag (prima erano placeholder identici al nome).
- Aggiunta nota su `info.description` che chiarisce: la reference documenta il sandbox pubblico (`https://sandbox.magware.it:9999`); gli URL di produzione sono per-tenant e comunicati da Restore in fase di onboarding.

### Changed

- Migrata la spec da OpenAPI **3.0.2** a **3.1.0** (allineamento a JSON Schema 2020-12 e webhook nativi). Cambio sintattico applicato: `nullable: true` → `type: [<tipo>, "null"]` (1 occorrenza). Nessuna altra incompatibilità rilevata.
- Convertita la spec dal formato JSON (export Stoplight) al formato YAML (file unico `openapi/magware.yaml`, decisione strutturale del repo).
- `info.version` (e `package.json` version) riportato a **`0.1.0`** durante la fase di revisione (semver "pre-1.0, in sviluppo"). La spec importata da Stoplight aveva `"21.11"` (calver interno Magware): non viene mantenuto qui perché le due numerazioni resteranno separate. Sarà bumpato a `1.0.0` al primo rilascio pubblico (quando faremo bump semver + tag git + entry consolidata sul `CHANGELOG.md` pubblico).
- Riordinati i tag globali rispetto all'ordine alfabetico ereditato da Stoplight. Iterazione: prima passaggio a un ordine logico-per-flusso `ASN → Items → Deliveries → Delivery Notes → Shipments → Inventory → Utility`; poi affinamento mettendo `Items` prima di `ASN` (master data prima del flusso operativo inbound). Sequenza finale: `Items → ASN → Deliveries → Delivery Notes → Shipments → Inventory → Utility`. Su Scalar i tag diventano la sidebar di navigazione, quindi l'ordine influenza l'esperienza dell'integratore.
- Riscritta `info.description`: rimossa immagine `i.imgur.com` (link rot esterno + branding altrui), rimosse emoji decorative (🎯 🏗️ 📊 🔄 ✅), rimossa sezione `Core Operational Flow` con ASCII diagram (informazioni già presenti nei singoli endpoint), rimossa sezione `Pattern Benefits` duplicata (bug Stoplight, era ripetuta due volte), rimossa table `Polling vs Push` (concetto già coperto nel paragrafo precedente). Mantenuto e snellito il contenuto distintivo: Overview, Authentication, polling pattern "List → Details", Webhook alternative, reporting issues. Riduzione: ~310 → ~76 righe.

### Fixed

- `info.license.url`: aggiunto schema `https://` mancante (era `www.re-store.it`, ora `https://www.re-store.it`).
- `paths./delivery_notes/{id}.get.operationId`: era duplicato (`get-deliveries-prepared-id`, lo stesso usato da `/deliveries/prepared/{id}`); rinominato in `get-delivery-notes-id` per coerenza col path.
- Schema `delivery_note_details`: rimossa la property `date` (e la sua dichiarazione come `required`) al root — non esiste nel backend reale, l'oggetto reale ha `preparation_date` (al root) e `delivery_note.date` (annidato). Risolta così l'inconsistenza che bloccava il lint Spectral su `oas3-valid-media-example` per l'esempio `Prepared delivery`. Rimosso di conseguenza l'override temporaneo in `.spectral.yaml`.

### Removed

- Tag globale `Models`: era dichiarato in `tags:` ma non usato da nessuna operation.

### Known issues

- L'esempio `Prepared delivery` di `GET /delivery_notes/{id}` ha al root campi NON dichiarati nello schema `delivery_note_details`: `preparation_date`, `cancelled`, `channel`, `delivery_note` (sotto-oggetto). Viceversa lo schema dichiara `destination` e `tracking` che non sono nell'esempio. Tecnicamente non è errore Spectral (OpenAPI 3.1 default `additionalProperties: true`), ma è un disallineamento spec ↔ backend reale. Da affrontare in una futura fase di allineamento, fuori dallo scope di Fase 0/0bis.
