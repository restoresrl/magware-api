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
- `POST /items` ora documenta esplicitamente la **bulk creation**: il request body accetta `oneOf` un singolo item oppure un array di items (min 1, max 100). Allineamento al backend reale (`magware-refs/n_post_items.sru` linee 258-300) che già supportava entrambi i formati ma la spec esponeva solo il singolo. Aggiunti esempi sia `single` sia `bulk`.
- `POST /items` response: aggiunta `200 OK` per il caso bulk con schema dedicato (array di `bulk_item_result` — un'entry per item input con `position`, `item_code`, `status`, `description`). La `201 Created` resta per il caso singolo. Il backend ritorna `200` anche se alcuni item nell'array hanno fallito; l'integratore deve scorrere l'array e leggere `status` per ogni entry. Comportamento documentato nella `description` dell'operation.
- Nuovi schemi in `components.schemas`: `success` (envelope per response 2xx single-resource, prima inline-only in `components.responses.success`) e `bulk_item_result` (outcome per item nella bulk creation).

### Changed

- Migrata la spec da OpenAPI **3.0.2** a **3.1.0** (allineamento a JSON Schema 2020-12 e webhook nativi). Cambio sintattico applicato: `nullable: true` → `type: [<tipo>, "null"]` (1 occorrenza). Nessuna altra incompatibilità rilevata.
- Convertita la spec dal formato JSON (export Stoplight) al formato YAML (file unico `openapi/magware.yaml`, decisione strutturale del repo).
- `info.version` (e `package.json` version) riportato a **`0.1.0`** durante la fase di revisione (semver "pre-1.0, in sviluppo"). La spec importata da Stoplight aveva `"21.11"` (calver interno Magware): non viene mantenuto qui perché le due numerazioni resteranno separate. Sarà bumpato a `1.0.0` al primo rilascio pubblico (quando faremo bump semver + tag git + entry consolidata sul `CHANGELOG.md` pubblico).
- Riordinati i tag globali rispetto all'ordine alfabetico ereditato da Stoplight. Iterazione: prima passaggio a un ordine logico-per-flusso `ASN → Items → Deliveries → Delivery Notes → Shipments → Inventory → Utility`; poi affinamento mettendo `Items` prima di `ASN` (master data prima del flusso operativo inbound). Sequenza finale: `Items → ASN → Deliveries → Delivery Notes → Shipments → Inventory → Utility`. Su Scalar i tag diventano la sidebar di navigazione, quindi l'ordine influenza l'esperienza dell'integratore.
- Riscritta `info.description`: rimossa immagine `i.imgur.com` (link rot esterno + branding altrui), rimosse emoji decorative (🎯 🏗️ 📊 🔄 ✅), rimossa sezione `Core Operational Flow` con ASCII diagram (informazioni già presenti nei singoli endpoint), rimossa sezione `Pattern Benefits` duplicata (bug Stoplight, era ripetuta due volte), rimossa table `Polling vs Push` (concetto già coperto nel paragrafo precedente). Mantenuto e snellito il contenuto distintivo: Overview, Authentication, polling pattern "List → Details", Webhook alternative, reporting issues. Riduzione: ~310 → ~76 righe.
- `POST /items` summary: da "Create a new item" a "Create one or more items" per riflettere il supporto bulk.
- Schema `item`: rimosso `description` (root) dall'array `required`. Il backend (`magware-refs/n_post_items.sru:134`) lo legge solo `if HasMember`, quindi è opzionale a livello backend; la spec era più restrittiva del backend. Restano required: `code`, `um`, `variants`.
- L'header `owner` (tenant code) è stato promosso da parameter a `securityScheme`. Prima era dichiarato in `components.parameters.owner` e referenziato 22 volte nelle operation; ora è uno scheme di tipo `apiKey` accanto a `APIKey`, applicato globalmente via il blocco `security: [{ APIKey: [], Owner: [] }]` (AND, entrambi obbligatori). Motivo: una `APIKey` è legata 1:1 a un `owner`, quindi sono semanticamente una credenziale composita; la nuova forma è più ergonomica nella reference (pannello "Authorize" unico) e nei client SDK generati (configurati una volta, niente parameter ripetuto). **Zero impatto wire**: gli header HTTP inviati dai client restano `APIKey: ...` + `owner: ...`, esattamente come prima. Possibile impatto solo per chi rigenera SDK dalla spec (struttura diversa nel codice generato, comportamento HTTP identico).
- Modello errori riallineato al backend reale (verificato in `magware-refs/w_server_mw_ws.srw:485-599` + tutti gli `n_*.sru`). Schema errore ora estratto come `components.schemas.error_response` (envelope `{status, description}`, niente `error_code` perché il backend non ne emette). Aggiunte response standard `unauthorized` (401), `not_found` (404), `internal_server_error` (500) in `components.responses` con esempi diversificati (es. 401 distingue missing APIKey / missing owner / wrong APIKey). Le response esistenti `success` e `error` (400) sono state ridefinite per usare gli schemi condivisi (`success` / `error_response`) anziché schema inline.
- Applicate `401` e `500` a **tutte** le 23 operation (via `$ref` alle responses standard). Applicato `404` ai 7 endpoint detail-by-id (`PUT/GET /items/{item_code}`, `GET /asn/received/{id}`, `GET /deliveries/prepared/{id}`, `GET /deliveries/cancelled/{id}`, `GET /shipments/{id}`, `GET /adjustments/{id}`, `GET /delivery_notes/{id}`) — il backend emette `n_ex_ws_404` quando l'id non esiste o quando una delivery prepared non ha packages/rows. `HEAD /items/{item_code}` ha 404 senza body (semantica HEAD).
- `info.description` — sezione **Authentication** riscritta per riflettere il security scheme combinato; aggiunta sezione **Errors** che documenta envelope, mappa degli HTTP status e dichiara esplicitamente che `409` e `422` non sono usati (duplicati e validazioni passano per `400`).
- `POST /items` — corretta la response status code: il backend ritorna **`200`** sia per il caso single sia per il caso bulk (verificato in `n_post_items.sru:294,287` — entrambi i rami lanciano `n_ex_ws_200`). Nel commit precedente avevo erroneamente dichiarato `201` per il single. Ora la response è un'unica `200` con schema `oneOf: [success_envelope, array_of_bulk_item_result]`. Gli esempi `single` e `bulk_mixed` sono entrambi sotto la stessa response `200`.
- Sistemate due inconsistenze locali: `GET /adjustments` 400 ora usa `$ref` alla response `error` (era `description: "Bad Request"` senza schema); `GET /items/{item_code}` 404 ora usa `$ref: not_found` (era `description: "Not Found"` senza schema).
- `POST /items/exists` — la 500 inline (`description: "Internal Server Error"` senza schema) sostituita con `$ref` alla response standard, e response code riordinati (400/401/500 in ordine canonico).
- **Track 7 — riallineamento spec ↔ backend** (verificato con tutti i sorgenti PB in `magware-refs/`).
  - **Items**:
    - `item.expedition_days` marcato `deprecated: true` con nota "Not yet implemented; reserved for future use" — il backend non lo gestisce in nessuna direzione (`n_post_items.sru`, `n_put_items.sru`, `n_get_items.sru`).
    - `PUT /items/{item_code}` description estesa: `variants[i].quantity` è immutabile dopo la creazione della variante (un valore diverso fa scattare `400` con messaggio specifico, verificato in `n_put_items.sru:86-88`).
  - **Items/exists**:
    - `requestBody` ora dichiara `minItems: 1` e `maxItems: 10000` (limite hard-coded backend in `n_post_items_exists.sru:40-41`).
    - description aggiornata con nota: il backend richiede di fatto entrambi `code` e `variant` (la query joina su entrambi); senza `variant` la risposta è sempre `exists: false`.
  - **ASN**:
    - `asn_creation.required` esteso con `delivery_note` e `arrival_date` (entrambi con throw esplicito nel backend `n_post_asn.sru:42,74`).
    - `asn_creation.date` rimosso (mai letto dal backend; date semantiche sono `arrival_date`, `stock_date`, `delivery_note.date`).
    - `asn_received_details.channel` aggiunto allo schema (backend lo emette `n_get_asn_received.sru:37`, spec non lo dichiarava).
  - **Address**:
    - rimossi `address.vat` e `address.tax_id` (mai letti né emessi da nessun endpoint; gestione fiscale non è in scope di questa API).
  - **Deliveries**:
    - `delivery_creation.required` riallineato: rimossi `priority` e `partial_allowed` (hanno default backend, non sono required); aggiunti `movement_type` e `items` (entrambi con throw esplicito in `n_post_delivery.sru:35,118`).
    - `delivery_creation.destination.title` aggiunto (backend lo legge in `n_post_delivery.sru:225`).
    - `delivery_creation.billing` arricchito con `first_name`, `last_name`, `middle_name`, `formal_salutation`, `informal_salutation` (backend li legge in `n_post_delivery.sru:273-277`, spec non li dichiarava per il billing pur dichiarandoli per destination).
    - rimosso `row_type: standard` dall'esempio di `delivery_creation` (era nell'esempio ma non nello schema, e il backend non lo legge).
  - **Inventory**:
    - `adjustment.code` rimosso `maxLength: 15` (vincolo arbitrario senza supporto nel backend).
    - `adjustment.date` rimosso `maxLength: 15` (su `format: date` non ha senso, le date ISO sono sempre 10 caratteri).
    - `GET /stocks/{item_code}` description estesa: l'endpoint non emette 404 se l'item non esiste, ritorna `200` con `items: []`. Suggerisce `HEAD /items/{item_code}` o `POST /items/exists` per distinguere i casi.

### Removed

- Tag globale `Models`: era dichiarato in `tags:` ma non usato da nessuna operation.
- Rimossi tutti i blocchi `x-stoplight: { id: ... }` (53 occorrenze) — retaggio Stoplight, identificatori opachi senza valore semantico per gli integratori.
- Rimossi tutti gli `x-internal: false` (16 occorrenze) — retaggio Stoplight, in OpenAPI standard non ha effetto.
- Rimossi `x-examples: {}` vuoti (8) e `parameters: []` vuoti a livello path (9) e `examples: {}` vuoti su request body (3) e a livello components — solo rumore.
- Rimossi blocchi response `application/xml`, `multipart/form-data`, `text/html` con `schema: { type: object, properties: {} }` su `/deliveries/prepared/{id}`, `/deliveries/cancelled/{id}`, `/delivery_notes/{id}` (9 blocchi totali) — content-type fittizi senza contenuto reale, ereditati da Stoplight.
- Rimossi `description: ""` esplicitamente vuoti (2 occorrenze).

### Fixed

- `info.license.url`: aggiunto schema `https://` mancante (era `www.re-store.it`, ora `https://www.re-store.it`).
- `paths./delivery_notes/{id}.get.operationId`: era duplicato (`get-deliveries-prepared-id`, lo stesso usato da `/deliveries/prepared/{id}`); rinominato in `get-delivery-notes-id` per coerenza col path.
- Schema `delivery_note_details`: rimossa la property `date` (e la sua dichiarazione come `required`) al root — non esiste nel backend reale, l'oggetto reale ha `preparation_date` (al root) e `delivery_note.date` (annidato). Risolta così l'inconsistenza che bloccava il lint Spectral su `oas3-valid-media-example` per l'esempio `Prepared delivery`. Rimosso di conseguenza l'override temporaneo in `.spectral.yaml`.
- Typo `decription` → `description` nello schema `item.supplier.item` (sia property name sia in `required`). Verificato con backend (`magware-refs/n_post_items.sru:164`): il backend legge correttamente `supplier.item.description`, quindi il typo era solo nella spec esportata da Stoplight, non nell'implementazione. Fix sicuro, nessun breaking lato backend.
- Typo prosa: `Usefull` → `Useful` (`/version`), `tipically` → `typically` (`item.um`), `phisical` → `physical` (`item.variants[].quantity`), `contry` → `country` (`address.country`), `wich` → `which` + riformulato (`delivery_creation.items[].stock_type`), `warahouse` → `warehouse` (`delivery_creation.print_delivery`).
- Typo / incoerenze in `operationId`: `updateitem` → `put-items-item_code`, `post-orders` → `post-deliveries`, `get-shippments` → `get-shipments`, `get-shipments-shipment_code` → `get-shipments-id`, `get-adjiustments` → `get-adjustments`, `get-stock` → `get-stocks`, `get-stocks-id` → `get-stocks-item_code` (allineato al nome del path-param). I client SDK generati dalla spec saranno impattati dai nuovi nomi: trattare come breaking per chi rigenera dal contratto.
- Convertite 15 `description` da stringa quoted single-line con `\r\n` letterali a YAML literal block scalar (`|-`). Stesso testo, leggibile sia da chi consulta lo YAML sia da chi lo edita.

### Known issues

- L'esempio `Prepared delivery` di `GET /delivery_notes/{id}` ha al root campi NON dichiarati nello schema `delivery_note_details`: `preparation_date`, `cancelled`, `channel`, `delivery_note` (sotto-oggetto). Viceversa lo schema dichiara `destination` e `tracking` che non sono nell'esempio. Tecnicamente non è errore Spectral (OpenAPI 3.1 default `additionalProperties: true`), ma è un disallineamento spec ↔ backend reale. Da affrontare in una futura fase di allineamento, fuori dallo scope di Fase 0/0bis.
- **Backend 404 con body raw text** (`magware-refs/w_server_mw_ws.srw:559-561`): il `catch (n_ex_ws_404)` ritorna `getmessage()` raw invece di wrappare in `_error()` come fanno tutti gli altri catch. La spec dichiara per coerenza che il 404 ritorna l'envelope `{status, description}` (allineato agli altri codici); il backend va fixato in PowerBuilder con una riga: `result_data = _error(ex_404.getmessage())`. Fino al fix backend, gli integratori che ricevono un 404 troveranno nel body una stringa non-JSON (es. `"Item with code '1234567890AB' not found for owner 'RST'"`) anziché l'envelope JSON.
- **Backend routing per `/delivery_notes`** non implementato (`magware-refs/w_server_mw_ws.srw:51-237`): il `router()` non gestisce il path `delivery_notes`, quindi le chiamate a `GET /delivery_notes/prepared` e `GET /delivery_notes/{id}` cadono nel `throw "Not implemented"` (riga 549, → 400). La spec li dichiara comunque come endpoint pubblici; da chiarire se sono in roadmap o se vanno marcati come `deprecated` / rimossi.
- **`/stocks/{item_code}` non emette 404**: il backend (`magware-refs/n_get_stocks.sru:59-105`) ritorna sempre `200` con `items: []` se l'item code non esiste, anziché un `404`. Comportamento accettabile (l'endpoint è una query, non un fetch by id), e la spec ora lo documenta nella `description` dell'operation. **Risolto lato spec.**
- **GET /items/{item_code} ritorna `owner_category` errata** (`magware-refs/n_get_items.sru:48-51`): la query usa `id_cat_magazzino` invece di `id_cat_proprietario`, e il setter usa `cat_mag.get(...)` invece di `cat_pro.get(...)`. Risultato: l'endpoint ritorna `owner_category` sempre uguale a `warehouse_category` (o vuoto). Bug funzionale serio per integratori che leggono la categoria proprietario via API. Fix backend: 3 sostituzioni nelle righe 48-50.
- **GET /asn/received/{id} non emette `expedition_date`** (`magware-refs/n_get_asn_received.sru:57-58`): la riga 58 setta una seconda volta la chiave `expiration_date` (con valore di `dt_spedibilita`), sovrascrivendo il valore corretto e omettendo del tutto `expedition_date`. Fix backend (1 carattere): seconda occorrenza `expiration_date` → `expedition_date`.
- **GET /adjustments/{id} non emette `expedition_date`** (`magware-refs/n_get_adjustments.sru:81-82`): stesso pattern del precedente, stesso fix (riga 82).
- **GET /shipments/{id}.deliveries[].tracking_id ritornato come stringa** (`magware-refs/n_get_shipments.sru:74`): il backend usa `setstring$` su un campo che la spec dichiara `type: integer`. Risultato: il body JSON ha `"tracking_id": "1234567890"` (stringa) invece di `"tracking_id": 1234567890` (numero). Fix backend: usare `setint`/`setnumber` con gestione null appropriata.
- **GET /items/{item_code} omette 4 campi write-only** (`magware-refs/n_get_items.sru`): i campi `can_be_added_to_deliveries`, `variants[].default`, `variants[].quantity_per_package` e `custom_attributes` sono accettati e persistiti in POST/PUT ma non vengono ritornati dalla GET. Decisione di prodotto: sono **bug**, non feature — vanno serializzati nella GET. Fix backend: aggiungere ~10 righe in `n_get_items.sru` (4 blocchi `json.set...` analoghi a quelli già presenti, leggendo dalle stesse colonne DB usate in POST/PUT: `fl_can_be_added`, `fl_standard`, `qta_conf`, e tabella custom_attribute polimorfica).
