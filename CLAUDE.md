# CLAUDE.md

> Documento di handoff per Claude Code. Lo trovi automaticamente all'avvio nella root del repo. Aggiornarlo quando cambia qualcosa di strutturale.

---

## Contesto del progetto

**magware-api** è il repository sorgente delle **API REST di Magware**, il WMS di [Restore S.r.l.](https://www.re-store.it).

L'unica fonte di verità è `openapi/magware.yaml` — un file OpenAPI 3.1 in YAML. Da qui parte sia il lint/validazione automatica (Spectral) sia la pubblicazione finale come API reference interattiva su **`api.magware.it`** (rendering tramite Scalar).

### Storia delle decisioni

- **2026-04-30**: deciso di **abbandonare Stoplight** sia come hosting della reference pubblica sia come editor della spec. Costo annuale alto, valore non più giustificato per un team in cui un solo manutentore (Carlo) cura attivamente le API. Editor di scrittura: Claude Code + un editor di testo qualunque. Hosting: Scalar.
- **2026-04-30**: scelto di pubblicare la reference su **`api.magware.it`** (sottodominio del dominio prodotto, di proprietà Restore) anziché su `api.re-store.it/docs/...` come oggi. Motivo: separare il dominio del prodotto dal dominio aziendale, e rendere chiaro che le API appartengono a Magware.
- **2026-04-30**: scelto di tenere la spec in un **repo dedicato (`magware-api`)** anziché in una sottocartella di `restore-site`. Motivo: la spec ha un suo ciclo di vita (versioning, contributi futuri, eventualmente CI separata, repo pubblicabile a terze parti) e merita un repository proprio.
- **2026-04-30**: scelto **OpenAPI 3.1** (e non 3.0) per allineamento a JSON Schema 2020-12 e webhook nativi.
- **2026-04-30**: file unico (`openapi/magware.yaml`) anziché split multi-file in stile Stoplight. Un solo manutentore + Claude Code lavorano meglio su file unico, diff git puliti.
- **2026-04-30**: per la pubblicazione su `api.magware.it` (Fase 3) scelta **Opzione A** — sito Astro + `@scalar/api-reference` **dentro questo stesso repo `magware-api`**, deploy autonomo su Cloudflare Workers. Scartata Opzione B (rendering ospitato in `restore-site` con Worker Route). Motivi: spec/rendering/deploy convivono nello stesso ciclo di vita (un push = aggiorna tutto, niente sync cross-repo); isolamento dei deploy (un cambio al sito istituzionale non rompe la API reference e viceversa); coerenza con la decisione strutturale di tenere `magware-api` come repo dedicato e auto-contenuto. Il "Worker Cloudflare in più" da gestire è un costo operativo trascurabile rispetto al coupling cross-repo che B avrebbe introdotto.

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
  - **`CHANGELOG.md`** (inglese, public-facing): aggiornato **solo al rilascio di una nuova release**. Al bump di `info.version` (decisione MAJOR/MINOR/PATCH presa di volta in volta in base alle modifiche) si crea una nuova entry `## [X.Y.Z] - YYYY-MM-DD` consolidata in inglese, riassumendo lo stato finale del contratto e ignorando lo storico delle iterazioni intermedie. Subito dopo: tag git annotato `vX.Y.Z` + GitHub release. Niente `[Unreleased]` su questo file. Audience: integratori esterni che consumano la spec.
  - In entrambi i file: **solo cambi al contratto pubblico** (endpoint, schema, parametri, response, esempi/description). Tooling/CI/CLAUDE.md/slash command restano fuori, tracciati solo nel `git log`.

### Slash command

Due comandi custom in `.claude/commands/` per allinearsi rapidamente all'inizio di una sessione:

- **`/avvia-fase [Fase N]`** — apre una nuova fase della Roadmap. Riallineamento (CLAUDE.md auto, `git log`/`status`, rilettura Roadmap, segnalazione decisioni aperte), peek leggero alla spec quando esiste, brief 5-10 righe su cosa farò + cosa serve da te + mini-Q&A su decisioni puntuali. Aspetta OK prima di toccare file. Se l'argomento è omesso, propone la prossima Fase non chiusa.
- **`/riprendi [note opzionali]`** — riprende lavoro a metà di una fase già in corso. Riallineamento più rapido (`git log`/`status`/`branch`, lettura file modificati di recente), brief 3-5 righe su dove eravamo + cosa sto per fare + dubbi bloccanti, poi prosegue senza Q&A ampie.

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
5. **Coerenza dei nomi**. Path in kebab-case (`/shipping-orders`), proprietà degli schema in camelCase (`createdAt`), enum in UPPER_SNAKE_CASE quando rappresentano costanti di dominio.
6. **Aggiorna `CHANGELOG-INTERNAL.md` ad ogni modifica della spec**. Qualsiasi modifica a `openapi/magware.yaml` va riflessa in `CHANGELOG-INTERNAL.md` (italiano) sotto `## [Unreleased]`, nello stesso commit, con le categorie standard (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`). Solo cambi al contratto pubblico. Modifiche a tooling/repo/CI/CLAUDE.md non vanno qui (restano nel `git log`). Il `CHANGELOG.md` (inglese, public) **non si tocca per-commit**: viene aggiornato solo al rilascio di una nuova release con bump semver e tag git.
7. **Mantieni questo file aggiornato**. Se vengono prese decisioni strutturali (es. split multi-file, cambio di tooling, attivazione di un generatore client SDK), aggiorna `CLAUDE.md` nello stesso commit.

---

## Roadmap

- [x] **Fase 0 — Import da Stoplight + migrazione OpenAPI 3.1**. Spec importata da Stoplight (bundled reference, 20 endpoint, 8 tag, 18 schema), convertita JSON → YAML, migrata 3.0.2 → 3.1.0, fix di 3 errori Spectral (license URL, operationId duplicato, tag mancante). Chiusa con commit `60ccf4a` il 2026-04-30.
- [x] **Fase 0bis — Decisioni editoriali sulla spec importata**. Lingua mantenuta inglese; tag descriptions riscritte + tag `Models` inutilizzato rimosso; `info.description` ridotta da ~310 a ~76 righe (rimosse imgur image, emoji, ASCII diagram, sezioni duplicate); server URL invariato (sandbox `:9999` unico, nota onboarding production aggiunta); fix esempio `Prepared delivery` con rimozione property `date` dallo schema (chiarito che backend ha `preparation_date` non `date` al root). Tutto il lavoro è in `[Unreleased]` del `CHANGELOG-INTERNAL.md`; nessuna release pubblica ancora — il primo bump semver + tag git `vX.Y.Z` + entry consolidata sul `CHANGELOG.md` pubblico avverrà al termine della revisione complessiva della spec.
- [x] **Fase 1 — CI verde**. Workflow `.github/workflows/lint.yml` verde su tutti i push da `afc0dc6` in poi.
- [x] **Fase 2 — Preview locale Scalar**. Aggiunto `preview/index.html` con Scalar via CDN (`@scalar/api-reference`) + script `npm run preview` che serve la root del repo via `npx serve` su porta 3000. Reference accessibile su `http://localhost:3000/preview/`, fa fetch della spec da `/openapi/magware.yaml`. Sanity check OK.
- [ ] **Fase 3 — Sito di pubblicazione su `api.magware.it`**. Aggiungere a questo stesso repo un piccolo sito **Astro + `@scalar/api-reference`** (o Astro Starlight con plug-in OpenAPI) che renderizza `openapi/magware.yaml` e lo pubblica su `api.magware.it` via Cloudflare Workers (deploy autonomo, repo auto-contenuto). Decisione presa il 2026-04-30 — vedi "Storia delle decisioni".
- [ ] **Fase 4 — DNS `api.magware.it`**. Configurare il record DNS (Cloudflare) per puntare al Worker. Verificare TLS e cache headers.
- [ ] **Fase 5 — Redirect dal vecchio Stoplight**. Aggiornare `api.re-store.it/docs/magware-api` per fare 301 verso `api.magware.it/...` corrispondenti. Sostituire i link nel sito `restore-site` (oggi presenti in `src/pages/magware.astro` e `docs/02-magware/04-architettura-tecnica.md`).
- [ ] **Fase 6 — Disattivazione Stoplight**. Cancellare l'abbonamento a fine ciclo di fatturazione, dopo aver verificato che `api.magware.it` funziona e i 301 sono attivi.

### Decisioni rinviate

- Generazione automatica di **client SDK** (TypeScript, Python, ecc.) da `magware.yaml` — utile per integratori, ma da valutare quando ci sarà domanda concreta. Stack candidato: `openapi-generator-cli` o `@hey-api/openapi-ts`.
- Contract testing automatizzato (es. Schemathesis) contro un'istanza dev di Magware — interessante ma fuori scope iniziale.
- Eventuale **mock server** generato dalla spec (Prism CLI) per dare agli integratori un endpoint contro cui testare prima di avere accesso a un'istanza reale.
