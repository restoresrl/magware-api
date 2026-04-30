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
- **Changelog**: ogni modifica alla spec va annotata in `CHANGELOG.md` (formato Keep a Changelog) sotto `## [Unreleased]`, nello stesso commit della modifica. Al momento del bump di `info.version` e del tag git `vX.Y.Z`, le voci `[Unreleased]` vengono promosse a una nuova sezione versionata. Documenta solo cambi al contratto pubblico (endpoint, schema, parametri, response, esempi); tooling/CI/CLAUDE.md restano fuori.

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
6. **Aggiorna `CHANGELOG.md` ad ogni modifica della spec**. Qualsiasi modifica a `openapi/magware.yaml` deve essere riflessa in `CHANGELOG.md` sotto `## [Unreleased]`, nello stesso commit, usando le categorie standard (`Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security`). Solo cambi al contratto pubblico — modifiche a tooling/repo/CI/CLAUDE.md non vanno qui (restano nel `git log`).
7. **Mantieni questo file aggiornato**. Se vengono prese decisioni strutturali (es. split multi-file, cambio di tooling, attivazione di un generatore client SDK), aggiorna `CLAUDE.md` nello stesso commit.

---

## Roadmap

- [ ] **Fase 0 — Import da Stoplight**. Esportare la spec attuale (`api.re-store.it/docs/magware-api`) come singolo file YAML e sostituire `openapi/magware.yaml`. Verificare che `npm run lint:api` passi pulito.
- [ ] **Fase 1 — CI verde**. Push iniziale su GitHub, verificare che il workflow `lint.yml` passi.
- [ ] **Fase 2 — Preview locale Scalar**. Aggiungere `preview/index.html` con CDN Scalar + script `npm run preview` che serve la cartella. Provare il rendering su tutta la spec.
- [ ] **Fase 3 — Sito di pubblicazione su `api.magware.it`**. Decidere fra due opzioni e implementare:
  - **Opzione A** (consigliata): aggiungere a questo stesso repo un piccolo sito Astro + `@scalar/api-reference` (o Astro Starlight con plug-in OpenAPI) che renderizza `openapi/magware.yaml` e lo pubblica su `api.magware.it` via Cloudflare Workers. Tutto in un repo solo, deploy autonomo.
  - **Opzione B**: integrare il rendering Scalar in `restore-site` e usare un Worker Route `api.magware.it/*` per servire la pagina dedicata da lì. Meno isolamento ma un Worker in meno da gestire.
- [ ] **Fase 4 — DNS `api.magware.it`**. Configurare il record DNS (Cloudflare) per puntare al Worker. Verificare TLS e cache headers.
- [ ] **Fase 5 — Redirect dal vecchio Stoplight**. Aggiornare `api.re-store.it/docs/magware-api` per fare 301 verso `api.magware.it/...` corrispondenti. Sostituire i link nel sito `restore-site` (oggi presenti in `src/pages/magware.astro` e `docs/02-magware/04-architettura-tecnica.md`).
- [ ] **Fase 6 — Disattivazione Stoplight**. Cancellare l'abbonamento a fine ciclo di fatturazione, dopo aver verificato che `api.magware.it` funziona e i 301 sono attivi.

### Decisioni rinviate

- Generazione automatica di **client SDK** (TypeScript, Python, ecc.) da `magware.yaml` — utile per integratori, ma da valutare quando ci sarà domanda concreta. Stack candidato: `openapi-generator-cli` o `@hey-api/openapi-ts`.
- Contract testing automatizzato (es. Schemathesis) contro un'istanza dev di Magware — interessante ma fuori scope iniziale.
- Eventuale **mock server** generato dalla spec (Prism CLI) per dare agli integratori un endpoint contro cui testare prima di avere accesso a un'istanza reale.
