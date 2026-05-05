# CLAUDE.md

> Documento di handoff per Claude Code. Lo trovi automaticamente all'avvio nella root del repo. Aggiornarlo quando cambia qualcosa di strutturale.

---

## Contesto del progetto

### Scopo primario — leggere prima di tutto

`magware-api` è il repository in cui Restore S.r.l. **cura la specifica OpenAPI delle API REST di Magware** (il WMS di [Restore](https://www.re-store.it)) come prodotto a sé stante. Lo scopo primario di questo repo, e del coinvolgimento di Claude Code, **non è la pubblicazione tecnica** della reference — pure necessaria — **ma il lavoro continuo di miglioramento qualitativo della spec e la sua evoluzione** quando l'API si arricchisce di nuove funzioni.

Concretamente, "miglioramento qualitativo" significa: struttura e tassonomia coerenti, descrizioni chiare e utili agli integratori, esempi completi e veritieri, naming uniforme, `required`/`nullable`/default corretti, gestione errori coerente, individuazione e risoluzione di incongruenze e disallineamenti spec ↔ backend reale.

La pubblicazione finale su **`api.magware.it`** (Scalar self-hosted, in sostituzione del precedente Stoplight) è il **canale di consumo** di questo lavoro per gli integratori esterni — un effetto, non lo scopo. Le fasi 0-6 della Roadmap (import, CI, preview, sito, DNS, redirect, dismissione Stoplight) sono lavoro infrastrutturale **al servizio** dello scopo primario; la Fase 2bis (revisione qualitativa della spec) è invece la **prima espressione concreta** dello scopo primario stesso.

**Stella polare per ogni decisione sulla spec**: chiarezza e fruibilità per chi integra. Non basta che sia OpenAPI valido (lo verifica Spectral); deve essere comprensibile, completo, coerente.

### Inquadramento tecnico

L'unica fonte di verità è `openapi/magware.yaml` — un file OpenAPI 3.1 in YAML. Da qui parte sia il lint/validazione automatica (Spectral) sia la pubblicazione finale come API reference interattiva su `api.magware.it` (rendering tramite Scalar).

### Storia delle decisioni

- **2026-04-30**: deciso di **abbandonare Stoplight** sia come hosting della reference pubblica sia come editor della spec. Costo annuale alto, valore non più giustificato per un team in cui un solo manutentore (Carlo) cura attivamente le API. Editor di scrittura: Claude Code + un editor di testo qualunque. Hosting: Scalar.
- **2026-04-30**: scelto di pubblicare la reference su **`api.magware.it`** (sottodominio del dominio prodotto, di proprietà Restore) anziché su `api.re-store.it/docs/...` come oggi. Motivo: separare il dominio del prodotto dal dominio aziendale, e rendere chiaro che le API appartengono a Magware.
- **2026-04-30**: scelto di tenere la spec in un **repo dedicato (`magware-api`)** anziché in una sottocartella di `restore-site`. Motivo: la spec ha un suo ciclo di vita (versioning, contributi futuri, eventualmente CI separata, repo pubblicabile a terze parti) e merita un repository proprio.
- **2026-04-30**: scelto **OpenAPI 3.1** (e non 3.0) per allineamento a JSON Schema 2020-12 e webhook nativi.
- **2026-04-30**: file unico (`openapi/magware.yaml`) anziché split multi-file in stile Stoplight. Un solo manutentore + Claude Code lavorano meglio su file unico, diff git puliti.
- **2026-04-30**: per la pubblicazione su `api.magware.it` (Fase 3) scelta **Opzione A** — sito Astro + `@scalar/api-reference` **dentro questo stesso repo `magware-api`**, deploy autonomo su Cloudflare Workers. Scartata Opzione B (rendering ospitato in `restore-site` con Worker Route). Motivi: spec/rendering/deploy convivono nello stesso ciclo di vita (un push = aggiorna tutto, niente sync cross-repo); isolamento dei deploy (un cambio al sito istituzionale non rompe la API reference e viceversa); coerenza con la decisione strutturale di tenere `magware-api` come repo dedicato e auto-contenuto. Il "Worker Cloudflare in più" da gestire è un costo operativo trascurabile rispetto al coupling cross-repo che B avrebbe introdotto.
- **2026-05-01**: cristallizzato lo **scopo primario** del progetto (vedi sezione "Scopo primario" in cima): **revisione qualitativa ed evoluzione della spec OpenAPI**, non semplicemente "uscire da Stoplight". Le fasi 0-2 e 3-6 della roadmap sono lavoro infrastrutturale al servizio di questo scopo. Aggiunta in roadmap la **Fase 2bis — Revisione qualitativa della spec** come fase a sé stante (iterativa, dialogica, si chiude quando Carlo dichiara "soddisfatto"), prima espressione concreta dello scopo primario. Da qui in poi ogni decisione di prodotto sulla spec (modifiche di struttura, naming, esempi, descrizioni, breaking change) viene presa avendo come stella polare la qualità e fruibilità per gli integratori — non solo "is it valid OpenAPI".
- **2026-05-04**: scelto **`snake_case`** come convenzione di naming definitiva per path e nomi di property dello schema (es. `/delivery_notes`, `arrival_date`, `warehouse_category`); `UPPER_SNAKE_CASE` per gli enum di dominio; `kebab-case` per gli `operationId`. Scartato l'iniziale piano "path in kebab-case + property in camelCase" (ereditato da convenzioni REST generiche): il backend Magware è in PowerBuilder e parsa il JSON cercando letteralmente le chiavi snake_case (verificato in `n_post_items.sru` — chiamate tipo `json_item.StringOf("warehouse_category.code")` o `json_item.HasMember("supplier.item.description")`). Convertire la spec a camelCase avrebbe imposto uno strato di traduzione runtime camelCase ↔ snake_case sul backend o un breaking MAJOR per tutti gli integratori esistenti, senza beneficio concreto (camelCase è una convenzione JSON, non uno standard REST). La spec era già di fatto allineata a snake_case: la decisione qui non muove nulla nel YAML, sancisce la convenzione e aggiorna le linee guida operative di `CLAUDE.md` (punto 5).
- **2026-04-30**: `api.magware.it` resta dedicato **esclusivamente** alla spec pubblica di Magware. Niente multi-tenancy, niente portale unificato di clienti custom. I 5 progetti API custom oggi presenti su Stoplight sono "morti" e moriranno con Stoplight in Fase 6 (no migrazione). Per **progetti custom futuri**: ogni cliente avrà un sottodominio dedicato `clienteX-api.re-store.it` (single-level, non `api.clienteX.re-store.it` per evitare complicazioni con cert wildcard di secondo livello), con repo privato dedicato `magware-clienteX-api` clonato dal template di questo repo. Auth per-cliente (Cloudflare Access se serve gating, oppure pubblico) decisa caso per caso. Scartate: piattaforme SaaS dedicate (ReadMe/Mintlify/nuovo Stoplight) per evitare lock-in vendor analogo a quello da cui usciamo oggi; portale unificato `customers.magware.it/clienteX/` per non mescolare il branding Magware con API non-Magware. Il pattern scala a costo marginale ~0 (clone repo + deploy Worker + CNAME) anche per più clienti, e si attiverà quando arriverà il primo progetto custom reale.

### Stack

- **Spec**: OpenAPI 3.1 in YAML, file unico (`openapi/magware.yaml`).
- **Lint**: [Spectral](https://stoplight.io/open-source/spectral) (sì, paradossalmente è di Stoplight, ma è OSS e standard di fatto). Ruleset base `spectral:oas`, estensibile in `.spectral.yaml`.
- **Format**: Prettier (yaml + md + json).
- **Markdown lint**: markdownlint-cli, allineato a `magware-doc` per coerenza.
- **CI**: GitHub Actions (`.github/workflows/lint.yml`) — esegue `npm run check` su ogni push e PR.
- **Hosting target**: `api.magware.it` (Cloudflare Workers — piattaforma già in uso da Restore per `restore-site`).

---

## Workflow operativo

### Editare la spec

1. Modifica `openapi/magware.yaml` in qualsiasi editor (consigliato VS Code con estensione OpenAPI).
2. Lancia `npm run lint:api` durante il lavoro per validare in tempo reale.
3. Prima del commit: `npm run check` (lint api + lint md + format check).
4. Commit con messaggio chiaro (es. `feat(api): aggiunto endpoint POST /shipments`).

### Aggiungere/cambiare endpoint

- Mantenere coerenza con i pattern esistenti (naming path, schema dei response, codici di errore).
- Ogni endpoint deve avere: `summary`, `description`, almeno una `tag`, esempio di response in `examples`.
- Errori standardizzati: definire una sola volta `components/responses/Error*` e referenziare con `$ref`.
- **Niente endpoint inventati**: se non hai informazioni concrete sull'implementazione lato Magware, chiedi a Carlo prima di scrivere.

### Versionare

- La spec ha un campo `info.version` (semver). Bump al merge di breaking changes.
- Branch model: `main` = spec corrente in produzione. Feature branch + PR per ogni modifica significativa quando ci saranno collaboratori esterni (oggi: si lavora direttamente su `main`).
- Tag git per ogni release (`vX.Y.Z`) — utile per consumatori che vogliono pinnare a una versione.
- **Changelog (due file distinti)**:
  - **`CHANGELOG-INTERNAL.md`** (italiano, contributor-facing): aggiornato **ad ogni commit** che tocca `openapi/magware.yaml`. Sotto `## [Unreleased]` si accumulano tutte le modifiche granulari per-commit, con dettagli operativi (motivazioni, alternative scartate, scoperte collaterali). Audience: tu/manutentore/Claude.
  - **`CHANGELOG.md`** (inglese, public-facing): contiene **solo entries di release** (formato Keep a Changelog), niente testo introduttivo o di "scope" (le spiegazioni vivono qui in CLAUDE.md). Le entries partono da `### Added / Changed / Deprecated / Removed / Fixed / Security / Known issues` (h3), raggruppate sotto `## [X.Y.Z] - YYYY-MM-DD` (h2) per ogni release. Mentre la prossima release è in lavorazione si usa `## [Unreleased]` in alto, che al rilascio viene rinominato nella versione semver definitiva (`## [X.Y.Z] - YYYY-MM-DD`). Le voci sono **consolidate in inglese**, asciutte, release-level: descrivono lo stato finale del contratto, non lo storico delle iterazioni intermedie (quello sta nell'internal). Audience: integratori esterni che consumano la spec.
  - **Quando bumpare semver**: la decisione MAJOR/MINOR/PATCH si prende caso per caso al momento del rilascio in base al contenuto di `[Unreleased]`. Il rilascio comprende: bump `info.version` + bump `package.json.version` + rinomina `## [Unreleased]` in `## [X.Y.Z] - YYYY-MM-DD` nel public, tag git annotato `vX.Y.Z` + GitHub release.
  - **Iniezione nel sito**: `scripts/inject-changelog.mjs` appende il contenuto del public CHANGELOG.md alla `info.description` come sezione `## Changelog`, così la reference su `api.magware.it` mostra il changelog come ultima parte della homepage. Il CHANGELOG-INTERNAL non viene mai mostrato pubblicamente.
  - In entrambi i file: **solo cambi al contratto pubblico** (endpoint, schema, parametri, response, esempi/description). Tooling/CI/CLAUDE.md/slash command restano fuori, tracciati solo nel `git log`.

### Build step: iniezione del CHANGELOG nella reference

`scripts/inject-changelog.mjs` legge `CHANGELOG.md` (public, EN) e lo inietta come `description` di un tag fittizio `Changelog` nella spec, scrivendo il risultato in `preview/magware.yaml` (file derivato, gitignored). La spec sorgente `openapi/magware.yaml` resta pulita: la fonte di verità del changelog è `CHANGELOG.md`.

Lo script viene invocato automaticamente da `npm run preview` tramite l'hook `prepreview` di npm. In Fase 3 (sito Astro) lo stesso script sarà riusato dal build del sito.

### Slash command

Due comandi custom in `.claude/commands/` per allinearsi rapidamente all'inizio di una sessione:

- **`/avvia-fase [Fase N]`** — apre una nuova fase della Roadmap. Riallineamento (CLAUDE.md auto, `git log`/`status`, rilettura Roadmap, segnalazione decisioni aperte), peek leggero alla spec quando esiste, brief 5-10 righe su cosa farò + cosa serve da te + mini-Q&A su decisioni puntuali. Aspetta OK prima di toccare file. Se l'argomento è omesso, propone la prossima Fase non chiusa.
- **`/riprendi [note opzionali]`** — riprende lavoro a metà di una fase già in corso. Riallineamento più rapido (`git log`/`status`/`branch`, lettura file modificati di recente), brief 3-5 righe su dove eravamo + cosa sto per fare + dubbi bloccanti, poi prosegue senza Q&A ampie.

### Materiale di riferimento del backend (`magware-refs/`)

Cartella locale (gitignored) in cui Carlo deposita estratti di sorgente del backend Magware o materiale interno utile per verificare la coerenza spec ↔ implementazione (Track 7 della Fase 2bis): codice PowerBuilder, schemi DB, sample payload reali, log, ecc. È **codice proprietario di Restore** e non deve finire nel repo pubblico — `.gitignore` esclude tutto il contenuto eccetto `.gitkeep`. Quando Carlo segnala un file qui, leggilo direttamente e usalo come fonte autorevole per dirimere dubbi che la sola spec non risolve (es. "il backend si aspetta `description` o `decription`?").

---

## Comandi utili

```bash
npm install              # installa devDependencies

npm run lint:api         # spectral lint su openapi/magware.yaml
npm run lint:md          # markdownlint sui .md
npm run format           # prettier --write su yaml/md/json
npm run format:check     # prettier --check
npm run check            # tutti i check sopra (eseguito in CI)
```

Prima di ogni commit: `npm run check` deve passare pulito.

---

## Linee guida operative per Claude Code

1. **Niente push automatici**. Mostra sempre i diff e attendi conferma prima di `git commit`. Non `git push` senza richiesta diretta.
2. **Branching**. In questa fase iniziale (un solo manutentore) si lavora direttamente su `main`. Quando si aggiungeranno collaboratori esterni, passare a feature branch + PR.
3. **Spec valida prima del commit**. Mai committare se `npm run lint:api` segnala errori. I warning si possono valutare caso per caso.
4. **Niente endpoint inventati**. Se manca informazione su un endpoint (path, schema, esempi), inserisci un `TODO` esplicito nel YAML e segnalalo a Carlo. Non riempire con dati plausibili-ma-falsi.
5. **Coerenza dei nomi**. Path e nomi di property degli schema in `snake_case` (es. `/delivery_notes`, `arrival_date`, `warehouse_category`); enum in `UPPER_SNAKE_CASE` quando rappresentano costanti di dominio (es. `AVAIL`, `FLAWED`, `WS`); `operationId` in `kebab-case` (es. `get-items-item_code`, `post-deliveries`). La convenzione `snake_case` è allineata al backend Magware (PowerBuilder), che parsa il JSON cercando letteralmente le chiavi con quel formato; non viene introdotta traduzione runtime camelCase ↔ snake_case. Decisione presa il 2026-05-04 — vedi "Storia delle decisioni".
6. **Aggiorna `CHANGELOG-INTERNAL.md` ad ogni modifica della spec**. Qualsiasi modifica a `openapi/magware.yaml` va riflessa in `CHANGELOG-INTERNAL.md` (italiano) sotto `## [Unreleased]`, nello stesso commit, con le categorie standard (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`). Solo cambi al contratto pubblico. Modifiche a tooling/repo/CI/CLAUDE.md non vanno qui (restano nel `git log`). Il `CHANGELOG.md` (inglese, public) si aggiorna in modo consolidato sotto `## [Unreleased]` quando il cambio è user-facing significativo (le iterazioni minori restano solo nell'internal); al rilascio `[Unreleased]` viene rinominato nella versione semver definitiva.
7. **Mantieni questo file aggiornato**. Se vengono prese decisioni strutturali (es. split multi-file, cambio di tooling, attivazione di un generatore client SDK), aggiorna `CLAUDE.md` nello stesso commit.

---

## Roadmap

- [x] **Fase 0 — Import da Stoplight + migrazione OpenAPI 3.1**. Spec importata da Stoplight (bundled reference, 20 endpoint, 8 tag, 18 schema), convertita JSON → YAML, migrata 3.0.2 → 3.1.0, fix di 3 errori Spectral (license URL, operationId duplicato, tag mancante). Chiusa con commit `60ccf4a` il 2026-04-30.
- [x] **Fase 0bis — Decisioni editoriali sulla spec importata**. Lingua mantenuta inglese; tag descriptions riscritte + tag `Models` inutilizzato rimosso; `info.description` ridotta da ~310 a ~76 righe (rimosse imgur image, emoji, ASCII diagram, sezioni duplicate); server URL invariato (sandbox `:9999` unico, nota onboarding production aggiunta); fix esempio `Prepared delivery` con rimozione property `date` dallo schema (chiarito che backend ha `preparation_date` non `date` al root). Tutto il lavoro è in `[Unreleased]` del `CHANGELOG-INTERNAL.md`; nessuna release pubblica ancora — il primo bump semver + tag git `vX.Y.Z` + entry consolidata sul `CHANGELOG.md` pubblico avverrà al termine della revisione complessiva della spec.
- [x] **Fase 1 — CI verde**. Workflow `.github/workflows/lint.yml` verde su tutti i push da `afc0dc6` in poi.
- [x] **Fase 2 — Preview locale Scalar**. Aggiunto `preview/index.html` con Scalar via CDN (`@scalar/api-reference`) + script `npm run preview` che serve la root del repo via `npx serve` su porta 3000. Reference accessibile su `http://localhost:3000/preview/`, fa fetch della spec da `/openapi/magware.yaml`. Sanity check OK.
- [ ] **Fase 2bis — Revisione qualitativa della spec** (prima espressione concreta dello scopo primario del progetto — vedi sezione "Scopo primario"). Lavoro **iterativo e dialogico** su `openapi/magware.yaml` per migliorare qualità, chiarezza, coerenza e fruibilità per gli integratori. Non è un check meccanico (quello lo fa già Spectral): è il giudizio di prodotto di Carlo in dialogo con Claude. Si chiude quando Carlo dichiara "soddisfatto" della qualità raggiunta. Track espliciti che la compongono (non si spuntano singolarmente, sono solo guida per non dimenticare aree):

  **Track chiusi**:
  - [x] **Track 0 — Pulizia meccanica** (commit `110d877`, 2026-05-03): rimossi 53 `x-stoplight`, 16 `x-internal`, 20 blocchi vuoti, 9 content-type spuri; convertite 15 description con `\r\n` letterali in YAML literal block; fixati 7 typo prosa e 7 `operationId`. Spec da 2520 a 2397 righe.
  - [x] **Track 6 — Errori e sicurezza** (commit `aba6356`, `6506fcd`, 2026-05-03/04): `owner` promosso da parameter a `securityScheme` combinato con `APIKey` (binding 1:1); schema errore standardizzato (`{status, description}`, niente `error_code` perché backend non ne emette); response `unauthorized`/`not_found`/`internal_server_error` aggiunte; 401+500 globali su tutte le 23 operation, 404 sui 7 detail-by-id; `info.description` Authentication+Errors riscritte.
  - [x] **Track 2 — Naming** (commit `4a35787`, 2026-05-04): sancito `snake_case` come convenzione definitiva per path e property (allineato al backend PowerBuilder che parsa il JSON cercando letteralmente le chiavi snake_case); `UPPER_SNAKE_CASE` per enum di dominio; `kebab-case` per `operationId`. Nessuna modifica strutturale alla spec (era già allineata), solo sancita formalmente in CLAUDE.md.
  - [x] **Track 7 — Coerenza spec ↔ backend reale** (commit `9aa4d18`, `5e23501`, 2026-05-03/04): verificato sistematicamente con i sorgenti PB caricati in `magware-refs/`. Allineamento POST /items (bulk + 200 corretto), `item.description` opzionale, items/exists maxItems 10000, ASN required corretti + `channel` aggiunto, `address.vat`/`tax_id` rimossi, deliveries required + `destination.title` + `billing` arricchito, adjustment maxLength rimossi, `/stocks/{item_code}` no-404 documentato, `expedition_days` deprecated. **11 fix backend pendenti** tracciati nelle Known issues del CHANGELOG-INTERNAL.
  - [x] **Track 4 — Mandatory / nullable / default** (commit `3449f5b`, `4749f57`, 2026-05-04): audit sistematico dei 31 `default:` originariamente presenti nella spec, verificati contro sorgenti PB (`magware-refs/n_*.sru`, `n_impexp.sru`) e DDL (`mw21r2.sql`). Rimossi 12 default obsoleti (3 su schema response, 1 example accidentale `123.45`, 4 saluti italiani, 2 non applicati dal backend, 2 ridondanti su `cash_on_delivery.currency` già `required`); esteso `item.variants[].required` con `quantity`. Restano in spec 19 default reali validi (allineati al backend, alcuni confermati anche da DB DEFAULT constraint). Valutati ma non aggiunti i default impliciti backend per `high_priority` (campo `deprecated`) e `freight_term` (sovrascritto incondizionatamente da `checkandset` con stringa vuota quando il JSON omette il campo — la definizione di `checkandset` in `n_impexp.sru:321-400` chiarisce che la validazione fa solo throw, l'assegnazione è incondizionata). Nessuna modifica a `nullable` (0 occorrenze, spec già su union types 3.1).
  - [x] **Track 4bis — maxLength audit globale** (commit corrente, 2026-05-04): audit DDL-driven di tutte le 68 occorrenze di `maxLength` nella spec, organizzato per gruppo logico (Items, ASN, Deliveries, Address, Delivery Notes, Inventory, schemi condivisi). Mappatura JSON property → tabella DB ricavata dai sorgenti PB in `magware-refs/n_*.sru`; larghezze fisiche da `magware-refs/mw21r2.sql`. **8 discrepanze fixate** (5 su `lot_number` 15 → 100 — pattern uniforme; `barcodes[]` 50 → 100; `destination.title` 100 → 500; `delivery.reference` 255 → 250; `adjustment.reason_code` 5 → 50). **1 ripristino**: `adjustment.code maxLength: 15` (rimosso erroneamente in Track 7 con motivazione "vincolo arbitrario", la colonna `movimento_diverso.ci varchar(15)` lo conferma reale). 60 maxLength già allineate, 2 lasciate ⚠️ semantiche (`address.country: 2` ISO 3166-1 alpha-2, `international_shipment.currency: 3` ISO 4217). Scoperto bug latente backend (`destination.code` composto eccede `cliente.ci varchar(50)` quando `delivery_code` è vicino al massimo) — annotato come Known issue.

  **Track chiusi (continuazione)**:
  - [x] **Track 3 — Descrizioni** (commit `f9e4036`, `c920cc5`, `b083b31`, 2026-05-04; completato 2026-05-05): stile boolean uniforme (`Indicates whether`); description aggiunte a 32 property mancanti (passo 3) + 10 property array/`$ref` rimaste (passo 3 completamento); asimmetrie request/response `maxLength` risolte (passo 2); YAML quoting difensivo per `time`/`sign` nei valori enum e negli esempi.
  - [x] **Track 5 — Esempi e response** (commit `01fcbe2`, 2026-05-04; completato 2026-05-05): rimossi 8 blocchi `x-examples` Stoplight non-standard; aggiunti `examples:` nei requestBody di `POST /asn`, `POST /deliveries`, `POST /shipments`; ricostruito esempio `GET /adjustments/{id}` (placeholder → valori reali); quotati `time: 14:15:22Z` (4 occorrenze) e `sign: +`/enum `"+"`.

  - [x] **Track 1 — Struttura e tassonomia** (2026-05-05): `/asn` confermato corretto (acronimo, non si pluralizza); `/delivery_notes/{id}` confermato entità propria — path invariato; endpoint Delivery Notes marcati `Planned` (non ancora implementati nel backend) con tag globale dedicato e nota in description; schema wrapper `{ date, time, items[] }` estratto come `stock_snapshot` in `components/schemas` ed eliminata la duplicazione inline su `GET /stocks` e `GET /stocks/{item_code}`; corretto bug esempio `item` → `items` su `GET /stocks/{item_code}`.

  **Fase 2bis completata.** Tutti i 9 track chiusi. La spec è pronta per il primo rilascio pubblico (bump semver + tag git + `CHANGELOG.md` consolidato).

  L'output di ogni track va in `CHANGELOG-INTERNAL.md` (per-commit, IT) e — al rilascio finale — consolidato in `CHANGELOG.md` (release-level, EN). La Fase 2bis non blocca la Fase 3: si può lavorare in parallelo sul sito Astro mentre la spec viene revisionata.

- [ ] **Fase 3 — Sito di pubblicazione su `api.magware.it`**. Aggiungere a questo stesso repo un piccolo sito **Astro + `@scalar/api-reference`** (o Astro Starlight con plug-in OpenAPI) che renderizza `openapi/magware.yaml` e lo pubblica su `api.magware.it` via Cloudflare Workers (deploy autonomo, repo auto-contenuto). Decisione presa il 2026-04-30 — vedi "Storia delle decisioni".
- [ ] **Fase 4 — DNS `api.magware.it`**. Configurare il record DNS (Cloudflare) per puntare al Worker. Verificare TLS e cache headers.
- [ ] **Fase 5 — Redirect dal vecchio Stoplight**. Aggiornare `api.re-store.it/docs/magware-api` per fare 301 verso `api.magware.it/...` corrispondenti. Sostituire i link nel sito `restore-site` (oggi presenti in `src/pages/magware.astro` e `docs/02-magware/04-architettura-tecnica.md`).
- [ ] **Fase 6 — Disattivazione Stoplight**. Cancellare l'abbonamento a fine ciclo di fatturazione, dopo aver verificato che `api.magware.it` funziona e i 301 sono attivi.

### Decisioni rinviate

- Generazione automatica di **client SDK** (TypeScript, Python, ecc.) da `magware.yaml` — utile per integratori, ma da valutare quando ci sarà domanda concreta. Stack candidato: `openapi-generator-cli` o `@hey-api/openapi-ts`.
- Contract testing automatizzato (es. Schemathesis) contro un'istanza dev di Magware — interessante ma fuori scope iniziale.
- Eventuale **mock server** generato dalla spec (Prism CLI) per dare agli integratori un endpoint contro cui testare prima di avere accesso a un'istanza reale.
