---
description: Riprendi il lavoro a metà di una fase già avviata su magware-api
argument-hint: "[note opzionali sul punto di ripresa]"
---

Riprendiamo il progetto **magware-api** (spec OpenAPI 3.1 delle API REST di Magware, file unico `openapi/magware.yaml`, pubblicazione su `api.magware.it`).

Per riallinearti, in quest'ordine:

1. `CLAUDE.md` è già caricato — contiene contesto, decisioni, workflow, Roadmap.
2. `git log --oneline -20`, `git status` e `git branch --show-current` per vedere su quale branch siamo e l'ultimo stato del lavoro.
3. Se ci sono file modificati di recente, leggili per capire dove ci eravamo fermati.
4. Se `openapi/magware.yaml` esiste ed è rilevante per la ripresa, peek leggero (solo `info`, `tags`, indice dei `paths`) — non leggere tutta la spec.

Note dal mio ultimo intervento (se presenti): **$ARGUMENTS**

Brief breve (3-5 righe) su:

- Dove eravamo arrivati (fase in corso, ultimi commit / modifiche, eventuali check pendenti)
- Cosa stai per fare ora
- Eventuali domande puntuali bloccanti (decisione di tooling, contenuto mancante della spec, asset, ecc.)

Poi prosegui. Niente Q&A ampie a meno che tu non incontri davvero un dubbio bloccante. Ricorda: niente push automatici, niente endpoint inventati, `npm run check` deve passare pulito prima del commit. Se stai toccando `openapi/magware.yaml`, aggiorna `CHANGELOG.md` (sezione `[Unreleased]`) nello stesso commit.
