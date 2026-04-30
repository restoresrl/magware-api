# magware-api

Spec sorgente delle **API REST di Magware** — il WMS di [Restore S.r.l.](https://www.re-store.it).

La spec è scritta in **OpenAPI 3.1** (YAML) e mantenuta in questo repository come unica fonte di verità. Sostituisce l'editing precedente su [Stoplight](https://stoplight.io), che viene dismesso.

La pubblicazione finale avverrà su **`api.magware.it`** come API reference interattiva, renderizzata con [**Scalar**](https://scalar.com).

## Stato

Repository **appena creato** (2026-04-30). Lo skeleton OpenAPI in `openapi/magware.yaml` è un placeholder valido — il primo step operativo è **esportare la spec attuale da Stoplight** (`api.re-store.it/docs/magware-api`) e sostituire il contenuto.

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

Verrà aggiunta in Step 2 della roadmap: una pagina `preview/index.html` che carica `openapi/magware.yaml` e lo renderizza con Scalar via CDN. Servita in locale con `npx http-server -p 4000` per avere un'anteprima fedele a quello che apparirà su `api.magware.it`.

## Pubblicazione

Pipeline pianificata (non ancora attiva):

1. **Edit** della spec in questo repo → push/PR → CI (`spectral lint` + format check)
2. **Merge** su `main`
3. **Deploy** su `api.magware.it` — soluzione candidata: piccolo sito Astro + Scalar in questo stesso repo, deployato su Cloudflare Workers. Decisione finale rinviata allo Step 3 della roadmap (vedi `CLAUDE.md`).

## Licenza

© Restore S.r.l. — Tutti i diritti riservati. Repository ad uso interno e collaboratori autorizzati.
