# Plan de tests — contrat Hermes

Version cible pour ces fixtures : Hermes Agent 0.17.0 (`v2026.6.19`). Le serveur réel n'est pas une cible de test automatisé; exécuter les tests hermétiques contre `packages/hermes-mock/fixtures/`.

## Matrice de découverte

| Surface / capacité | Fixture d'exemple | Test mock attendu |
|---|---|---|
| API health liveness | `api_health_noauth.json` | Parser status et endpoint avec/sans auth selon le handler |
| API health détaillée | `api_health_detailed.json` | Valider version, gateway_state, plateformes, active_agents; tolérer clés nulles |
| API capabilities | `api_capabilities.json` | Découvrir features et chemins sans coder la liste en dur |
| API modèles, skills, toolsets | `api_models.json`, `api_skills.json`, `api_toolsets.json` | Parser réponses et tester capacité absente/401 |
| API profils et statut | `dash_profiles.json`, `dash_profiles_noauth.json`, `dash_status.json`, `dash_status_noauth.json` | Auth dashboard; mapping des noms de profil sans alias implicite |
| Dashboard Kanban | `dash_kanban_board.json`, `dash_kanban_config.json` | Sélection du board, colonnes vides/non vides, données nulles et status |
| Workers actifs | `dash_kanban_workers_active.json` | État vide et heartbeat présent si ajouté en fixture future |
| Inspect | `dash_kanban_inspect.json` | 404 → ne pas appeler; fallback sur `workers/active` |
| Analytics | `dash_analytics_usage.json` | Parsing chiffres/dates/null et fenêtre demandée |
| Auth | `dash_auth_me.json`, `dash_login.json` | Tester état connecté; le login est testé uniquement en intégration dédiée, jamais dans la suite GET-only |
| GET API sans auth | `api_health_noauth.json` | Distinguer liveness public d'une route protégée; ne pas généraliser à toutes les routes |
| Profils sans auth | `dash_profiles_noauth.json` | Vérifier erreurs d'auth du dashboard |
| Réponses API avec profil préfixé | `api_profile_x_health.json`, `api_profile_x_capabilities.json` | Attendre le résultat 404 capturé; garantir qu'aucun fallback ne traite cela comme supporté |

## Tests unitaires du client (à implémenter avec l'adapter)

1. Chaque GET transmet le bon chemin, l'auth configurée et un timeout borné; les secrets ne figurent ni dans logs ni dans erreurs.
2. Valider les réponses avec schémas permissifs sur champs optionnels; réponse malformée → capacité indisponible/`unknown`, pas crash global.
3. 401 → auth invalide; 404 endpoint absent; 429 → backoff; 503 respecte `Retry-After`; timeout et erreurs réseau → état indisponible après retry borné.
4. Les endpoints profile-prefixed restent non supportés selon les captures 404; ne pas déclarer les agents secondaires interactifs par simple possession d'une clé.
5. Dashboard basic auth/session : ne pas lancer de POST dans les tests discovery. Tester le flux login seulement contre mock isolé; cookie de session conservé sans le copier dans logs.
6. Kanban board sélectionné par `board`; valider des colonnes vides et plusieurs tâches, statuts inconnus tolérés.
7. `workers/active` vide est un résultat valide; `inspect` 404 est un cas attendu et doit déclencher le chemin de lecture `workers/active`.

## Tests d'intégration (optionnels, manuels, read-only)

À exécuter uniquement avec un environnement explicitement autorisé et des credentials read-only. Aucun GET réseau n'est requis pour valider les fixtures livrées. Interroger seulement les GET confirmés dans `HERMES_CONTRACT.md`; ne pas appeler le login, chat, création/modification/suppression de session, Kanban mutations, stop ou approval. Ne jamais imprimer ou persister les headers de credentials.

## Limites connues

Pas encore de test E2E contre Hermes, pas de capture de payloads de mutation, pas de contrat vérifié pour le WebSocket Kanban. Le chat avec un profil arbitraire n'est pas supporté par `/p/<profile>/…` sur l'instance de référence; cette contrainte doit être conservée dans les tests jusqu'à décision ADR et vérification d'une architecture profile-aware.
