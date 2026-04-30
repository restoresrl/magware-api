#!/usr/bin/env node
// Build step: inietta CHANGELOG.md (public, EN) come description di un tag
// fittizio "Changelog" nella spec OpenAPI, e scrive il risultato in
// preview/magware.yaml (file derivato, gitignored).
//
// Eseguito automaticamente da `npm run preview` via hook `prepreview`.
// In Fase 3 (Astro) lo stesso script verrà invocato dal build del sito.
//
// La spec sorgente openapi/magware.yaml resta pulita (non contiene il
// changelog): la fonte di verità del CHANGELOG è il file CHANGELOG.md.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = resolve(repoRoot, "openapi/magware.yaml");
const changelogPath = resolve(repoRoot, "CHANGELOG.md");
const outPath = resolve(repoRoot, "preview/magware.yaml");

const spec = yaml.load(readFileSync(specPath, "utf8"));
let changelog = readFileSync(changelogPath, "utf8");

// Rimuove il primo heading H1 (`# Changelog`): la sezione esterna `## Changelog`
// (appesa qui sotto) fa già da titolo.
changelog = changelog.replace(/^# .+\n+/, "");

// Demote i sub-heading interni a testo grassetto, così Scalar mostra nella
// TOC laterale solo "Changelog" (h2) e non tutte le release/categorie come
// voci di navigazione. `## [version] - date` → grassetto preceduto da `---`
// (separatore visivo tra release); `### Category` → grassetto.
let isFirstRelease = true;
changelog = changelog
  .replace(/^### (.+)$/gm, "**$1**")
  .replace(/^## (.+)$/gm, (_, title) => {
    if (isFirstRelease) {
      isFirstRelease = false;
      return `**${title}**`;
    }
    return `---\n\n**${title}**`;
  });

// Appende il CHANGELOG come sezione finale di info.description, sotto un
// heading `## Changelog`. Scalar mostra info.description come "homepage"
// della reference: il Changelog appare scrollando in fondo, dopo "Reporting
// issues" (che è l'ultima sezione della description sorgente).
spec.info.description = `${spec.info.description.trimEnd()}\n\n## Changelog\n\n${changelog.trimEnd()}\n`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, yaml.dump(spec, { lineWidth: 120, noRefs: true, sortKeys: false }));

console.log(`✓ injected CHANGELOG.md into ${outPath} (${changelog.length} chars appended to info.description)`);
