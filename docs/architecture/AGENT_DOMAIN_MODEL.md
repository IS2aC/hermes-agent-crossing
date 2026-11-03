# Modèle de domaine des agents

Contrats : `src/domain/agents.ts`, `src/domain/registry.ts`.

| Type | Identifiant | Origine | Persistance |
|---|---|---|---|
| `CharacterProfile` | Slug stable (`jarvis`) | Application | Table `character_profiles` |
| `AgentDefinition` | `id` de `HERMES_PROFILES` | Configuration, puis réponse de Hermes | Aucune |
| `AgentRuntime` | `agentId` et `sessionId` | Hermes | Aucune |
| `AgentBinding` | `characterId` | Application | Table `agent_bindings` |

**Le même mot « jarvis » désigne deux choses distinctes :** un personnage et un profil. Rien ne les relie sans `AgentBinding`.

## Contraintes

- Un personnage a au plus un agent, et un agent au plus un personnage (`UNIQUE`).
- Un emplacement accueille un seul personnage (`UNIQUE (tile_x, tile_y)`).
- Le lien survit à la disparition d'un agent.
- `owner_id` vaut `operator` : il prépare l'arrivée de comptes multiples.

## Migrations

`server/storage/postgres.ts` applique des migrations numérotées, jamais modifiées. Elles sont suivies dans `schema_migrations`.

**Limite :** chaque migration n'est pas enveloppée dans une transaction. Une panne entre le changement et son enregistrement exigerait une intervention manuelle.

**Testé seulement avec `pg-mem`, un simulateur.** Aucun serveur PostgreSQL n'est disponible dans cet environnement, donc rien n'a tourné sur un vrai PostgreSQL.
