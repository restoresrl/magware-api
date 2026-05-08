# magware-api

[![Lint](https://github.com/restoresrl/magware-api/actions/workflows/lint.yml/badge.svg)](https://github.com/restoresrl/magware-api/actions/workflows/lint.yml)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-85EA2D?logo=openapiinitiative&logoColor=white)](openapi/magware.yaml)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](LICENSE)

Repository in cui [Restore S.r.l.](https://www.re-store.it) **cura la specifica OpenAPI delle API REST di Magware** (WMS) come prodotto a sé stante.

Lo scopo primario non è la pubblicazione tecnica — pure necessaria — ma il lavoro continuo di **miglioramento qualitativo della spec** (struttura, descrizioni, esempi, naming, coerenza spec ↔ backend) e la **sua evoluzione** quando l'API si arricchisce di nuove funzioni.

La spec è scritta in **OpenAPI 3.1** (YAML, file unico `openapi/magware.yaml`) ed è la fonte di verità unica. La reference è pubblicata su **[api.magware.it](https://api.magware.it)** come API reference interattiva renderizzata con [**Scalar**](https://scalar.com); ha sostituito la precedente edizione [Stoplight](https://stoplight.io), dismessa a maggio 2026.

## Stato

Spec stabile, prima release pubblica `v1.0.0` (2026-05-05) live su `api.magware.it`. Da qui in avanti il lavoro è continuativo: miglioramenti qualitativi, evoluzione della spec quando l'API si arricchisce di nuove funzioni, manutenzione. Per il dettaglio operativo e le decisioni storiche vedere `CLAUDE.md`.

## Struttura

```text
magware-api/
├── openapi/
│   └── magware.yaml             # spec OpenAPI 3.1 (sorgente unica)
├── scripts/
│   ├── inject-changelog.mjs     # inietta CHANGELOG.md nella info.description per la pubblicazione
│   ├── notify-release.mjs       # email di notifica release agli iscritti
│   └── test-api.mjs             # smoke test contro il sandbox
├── site/                        # sito di pubblicazione (HTML statico + Scalar via CDN + CNAME)
├── preview/                     # preview locale (server dev)
├── .spectral.yaml               # ruleset di lint per la spec
├── .markdownlint.json           # ruleset di lint per la documentazione
├── .github/workflows/
│   ├── lint.yml                 # CI: spectral + markdownlint sui PR e push
│   └── deploy.yml               # deploy su GitHub Pages al push su main
├── CHANGELOG.md                 # release-level, EN, public-facing
├── CHANGELOG-INTERNAL.md        # per-commit, IT, contributor-facing
├── CLAUDE.md                    # handoff per sessioni Claude Code
├── package.json                 # script di sviluppo
└── README.md
```

## Workflow di sviluppo

```bash
npm install              # installa toolchain (spectral, prettier, markdownlint)

npm run lint:api         # spectral su openapi/magware.yaml
npm run lint:md          # markdownlint sui .md
npm run format           # prettier su yaml/md/json
npm run format:check     # prettier in modalità verifica
npm run check            # tutti i check (lint + format) — usato in CI
```

### Preview locale

```bash
npm run preview          # genera preview/magware.yaml (CHANGELOG iniettato) e serve la root su :3000
```

Reference accessibile su `http://localhost:3000/preview/`.

### Notifiche release

Alla pubblicazione di una nuova versione è possibile inviare una mail di notifica
a tutti gli iscritti in `magware-refs/notify-release.json` (file locale, non versionato).

```bash
npm run notify-release -- --dry-run      # anteprima in console (no invio)
npm run notify-release -- --preview-html # apre l'HTML nel browser (no invio)
npm run notify-release                   # invio reale
```

Lo script legge la versione corrente da `package.json` e il changelog della release
corrispondente da `CHANGELOG.md`, quindi invia sempre la **versione più recente**.

**Prerequisiti**: compilare `magware-refs/notify-release.json` con le credenziali SMTP
e la lista destinatari. Ogni destinatario ha un campo `lang` (`"it"` o `"en"`) che
seleziona il template di lingua; il changelog è sempre in inglese.

### Test API

Smoke test end-to-end contro il sandbox (`https://sandbox.magware.it`).
Verifica che tutti gli endpoint documentati in `openapi/magware.yaml` rispondano
correttamente, sia in lettura sia in scrittura.

```bash
npm run test:api
```

Lo script (`scripts/test-api.mjs`) esegue tre blocchi:

- **Livello 1 — GET con discovery automatica** dei codici esistenti (sola lettura, sicuro).
- **Livello 2 — POST/PUT** per creare un item di test, ASN, delivery e shipment con codici univoci basati su timestamp.
- **Error cases** — verifica risposte 401/404/400 attese.

Output: report pass/fail per ciascun endpoint + dump dei payload JSON reali —
utili per aggiornare gli `examples:` nella spec con valori veri.

**Prerequisiti**: compilare `magware-refs/.env` (file locale, gitignored) con
`MAGWARE_API_URL`, `MAGWARE_API_KEY`, `MAGWARE_OWNER` e il codice item di test
(credenziali dedicate fornite dal team Restore).

**Nota operativa**: il Livello 2 scrive dati reali nel sandbox. Le esecuzioni
vanno concordate con Restore per evitare sovrapposizioni con sessioni di altri
integratori. La pulizia dei dati di test residui è gestita lato sandbox.

## Pubblicazione

La reference è live su **[api.magware.it](https://api.magware.it)**.
Stack: HTML statico + [Scalar](https://scalar.com) via CDN per il rendering,
hosting su **GitHub Pages**. Pipeline (vedi `.github/workflows/deploy.yml`):

1. `scripts/inject-changelog.mjs` legge `CHANGELOG.md` e lo inietta nella `info.description` della spec, scrivendo il risultato in `_site/magware.yaml`.
2. Vengono copiati `site/index.html` (loader Scalar) e `site/CNAME` (binding al dominio) in `_site/`.
3. Deploy automatico via `actions/deploy-pages` ad ogni push su `main`.

## Licenza

© Restore S.r.l. — Tutti i diritti riservati. Repository ad uso interno e collaboratori autorizzati.
