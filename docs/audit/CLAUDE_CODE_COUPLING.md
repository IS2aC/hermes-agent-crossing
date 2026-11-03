# Couplage à Claude Code

Commit `1a9ba71`. Mesure : 35 fichiers de `src`, `server`, `hooks`, `scripts` et `electron` contiennent des références à Claude Code (recherche de texte). Certaines ne sont que des commentaires.

## Hypothèses propres à Claude Code

| Hypothèse | Emplacement | Pourquoi elle bloque Hermes |
|---|---|---|
| L'activité arrive par 19 hooks locaux (`PreToolUse`, `SubagentStart`, `Stop`…) | `hooks/hooks.json`, `hooks/agent-tracker.sh` (1 694 lignes) | Hermes n'a pas ce mécanisme connu ; l'API doc mentionne des flux SSE [Doc] |
| Coût et contexte via la status line | `hooks/status-line.sh`, `server/status.js` | Source Hermes à identifier |
| Les transcripts sont des fichiers locaux lisibles | `server/transcript.js`, `server/meterEstimate.js` | Hermes tourne dans un autre conteneur |
| Les sessions se détectent par fichiers et PID | `server/sessions.js:112-250` | Impossible à distance |
| Les tâches sont des fichiers JSON locaux | `server/tasks.js:198` | Autre source |
| Le chat lance `claude -p` | `scripts/chat-ai-watcher.sh:209` | Interdit : contourne Hermes |
| Permissions via hook bloquant, long polling | `server/permissions.js`, `:71-77` | Modèle à recaler sur l'approbation Hermes |
| Noms de modèle Claude et fenêtres de contexte | `server/meterEstimate.js:63` | Spécifique |
| Un serveur local par machine | `server/config.js:108` | Déploiement VPS |
| Personnage « Claude » et hiérarchie Boss/Manager | `src/types.ts`, `src/officeReducer.ts`, `src/App.tsx` | Le modèle cible a des agents pairs |
| Installation sous forme de plugin | `.claude-plugin/`, `commands/office.md` | Non applicable |

## Répartition du couplage

| Fichier | Occurrences |
|---|---|
| `server/index.js` | 59 |
| `hooks/agent-tracker.sh` | 42 |
| `src/officeReducer.ts` | 25 |
| `hooks/install-hooks.sh`, `hooks/hooks.json` | 23 chacun |
| `server/sessions.js` | 16 |
| `scripts/chat-ai-watcher.sh` | 14 |
| `src/types.ts`, `scripts/doctor.mjs` | 12 chacun |
| 26 autres fichiers | 1 à 8 chacun |

## Conclusion

Le couplage se concentre dans la couche d'entrée et dans le serveur. Il n'y a pas d'interface « fournisseur d'agents » à réimplémenter. L'adaptateur Hermes ne peut donc pas s'y brancher : il faut l'introduire dans notre architecture (étape 04).
