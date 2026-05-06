# magware-api

[![Lint](https://github.com/restoresrl/magware-api/actions/workflows/lint.yml/badge.svg)](https://github.com/restoresrl/magware-api/actions/workflows/lint.yml)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1-85EA2D?logo=openapiinitiative&logoColor=white)](openapi/magware.yaml)
[![License](https://img.shields.io/badge/license-proprietary-lightgrey)](LICENSE)

Repository in cui [Restore S.r.l.](https://www.re-store.it) **cura la specifica OpenAPI delle API REST di Magware** (WMS) come prodotto a sé stante.

Lo scopo primario non è la pubblicazione tecnica — pure necessaria — ma il lavoro continuo di **miglioramento qualitativo della spec** (struttura, descrizioni, esempi, naming, coerenza spec ↔ backend) e la **sua evoluzione** quando l'API si arricchisce di nuove funzioni.

La spec è scritta in **OpenAPI 3.1** (YAML, file unico `openapi/magware.yaml`) ed è la fonte di verità unica. La pubblicazione finale avverrà su **`api.magware.it`** come API reference interattiva renderizzata con [**Scalar**](https://scalar.com), in sostituzione della precedente edizione [Stoplight](https://stoplight.io) che verrà dismessa.

## Stato

Spec importata da Stoplight, lint Spectral pulito, preview locale Scalar funzionante. La revisione qualitativa della spec (Fase 2bis della roadmap) è il prossimo grosso blocco di lavoro; in parallelo si svilupperà il sito di pubblicazione (Fase 3). Per il dettaglio operativo e le decisioni storiche vedere `CLAUDE.md`.

## Struttura

```text
magware-api/
├── openapi/
│   └── magware.yaml             # spec OpenAPI 3.1 (sorgente unica)
├── .spectral.yaml               # ruleset di lint per la spec
├── .markdownlint.json           # ruleset di lint per la documentazione
├── .github/workflows/lint.yml   # CI: spectral + markdownlint sui PR
├── package.json                 # script di sviluppo
├── CLAUDE.md                    # handoff per sessioni Claude Code
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

## Pubblicazione

Pipeline pianificata (vedi roadmap completa in `CLAUDE.md`): sito Astro + Scalar nello stesso repo, deploy su Cloudflare Workers, dominio `api.magware.it`.

## Licenza

© Restore S.r.l. — Tutti i diritti riservati. Repository ad uso interno e collaboratori autorizzati.
