---
description: Avvia una fase del progetto magware-api (Fase 0, Fase 1, …)
argument-hint: "[Fase N]"
---

Lavoriamo sul progetto **magware-api** (spec OpenAPI 3.1 delle API REST di Magware, Restore S.r.l. — file unico `openapi/magware.yaml`, lint Spectral, pubblicazione finale su `api.magware.it` via Scalar).

Per riallinearti, in quest'ordine:

1. `CLAUDE.md` è già caricato automaticamente — contiene contesto, storia delle decisioni, workflow, linee guida operative e Roadmap.
2. Controlla `git log --oneline -20` e `git status` per vedere lo stato del repo.
3. Rileggi la sezione **Roadmap** in `CLAUDE.md` e verifica eventuali decisioni ancora aperte (es. Opzione A vs B per la Fase 3 — sito Astro+Scalar nello stesso repo o rendering ospitato in `restore-site`; eventuale generatore client SDK; mock server Prism; contract testing) — segnala quelle che potrebbero bloccarci nella fase corrente.
4. Se `openapi/magware.yaml` esiste, fai un peek **leggero** sulla spec: solo blocco `info`, lista `tags`, e l'**indice dei `paths`** (i nomi degli endpoint, NON i body). Serve per orientarsi sullo stato attuale senza bruciare contesto.

Vogliamo avviare la **$ARGUMENTS** (se non specificata, leggi la Roadmap in `CLAUDE.md` e proponi tu la prossima fase non ancora chiusa).

Prima di toccare codice fammi un brief di 5-10 righe su:

- Cosa farai concretamente in questa fase (file principali toccati, sezioni della spec, configurazioni, eventuale tooling da aggiungere)
- Cosa ti serve da me prima di iniziare (export da Stoplight, decisioni di hosting/DNS, accessi, scelte di architettura)
- Eventuali decisioni puntuali da chiudere insieme con una mini-Q&A (specie su rendering site, opzioni di tooling, breaking changes nella spec)

**Aspetta il mio ok** prima di iniziare a creare/modificare file. Ricorda: niente push automatici, niente endpoint inventati (se manca informazione metti un `TODO` esplicito e segnalalo), `npm run check` deve passare pulito prima del commit. Se la fase tocca `openapi/magware.yaml`, aggiorna `CHANGELOG-INTERNAL.md` (italiano, dettagliato per-commit, sezione `[Unreleased]`) nello stesso commit. Il `CHANGELOG.md` pubblico (inglese) si aggiorna in modo consolidato sotto `## [Unreleased]` quando il cambio è user-facing significativo; al rilascio `[Unreleased]` diventa `## [X.Y.Z] - YYYY-MM-DD` insieme a tag git e GitHub release.
