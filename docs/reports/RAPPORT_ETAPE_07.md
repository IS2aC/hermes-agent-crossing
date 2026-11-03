# Rapport — Étape 07 : Connecteur Hermes

## En résumé

Le backend sait parler à Hermes v0.17, de façon protégée. **Mais il n'a jamais parlé à ton vrai Hermes** : je n'ai pas accès au VPS. J'ai lu le code source de ta version exacte, et j'ai testé contre un faux serveur écrit d'après ce code.

## Ce que j'ai découvert

Lire le source de ta version a corrigé la documentation web, qui décrit une version plus récente :

1. **Danger :** en v0.17, l'API pourrait écrire dans une conversation Telegram, alors que la doc annonçait un refus. L'application l'interdit donc elle-même.
2. **Un run ne recharge pas l'historique :** le backend doit l'envoyer, sinon l'agent perd le fil.
3. **Pas de liste des profils par l'API :** tu devras déclarer JARVIS et VEILLEUR dans la configuration, avec une URL et une clé chacun.
4. **Bonne nouvelle pour Telegram, le CLI et le cron :** la liste des sessions indique leur origine. On peut donc voir qu'ils avancent, avec du retard et sans détail. Le risque principal du projet recule.

## Ce qui a été fait

- Connecteur avec délai maximal, nouveaux essais sur les lectures seulement, et erreurs sans secret.
- Connexion par mot de passe, limitation des tentatives, contrôle d'origine, en-têtes de sécurité.
- Mode mock, interdit en production.
- Un outil de contrôle en lecture seule pour ton VPS : `tools/hermes-probe.ts`.

## Preuves

Voir le résultat de `npm test` et `npx tsc --noEmit` au commit de cette étape. Niveau de preuve : **testé contre un faux serveur**.

## Non vérifié

- **Tout ce qui touche ton instance réelle** : ports, clés, noms des profils, comportement de `active_agents`.
- Le faux serveur reflète ma lecture du source. Si je l'ai mal comprise, les tests passeront quand même.

## Pour la suite

Lance l'outil de contrôle sur le VPS pour chaque profil, et transmets-moi la sortie.

## Livrables

- [HERMES_CAPABILITY_AUDIT.md](../integrations/HERMES_CAPABILITY_AUDIT.md)
- [HERMES_API_CONTRACT.md](../integrations/HERMES_API_CONTRACT.md)
- [HERMES_CONNECTOR.md](../integrations/HERMES_CONNECTOR.md)
- Code : `server/adapters/`, `server/http/`, `server/config.ts`
- Tests : `tests/server/`
