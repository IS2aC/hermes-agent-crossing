# Rapport — Étape 12 : Sécurité, déploiement et validation finale

## Recommandation

### NO-GO pour la production, à ce stade

**Le logiciel n'a jamais parlé à ton vrai Hermes, ni tourné sur ton VPS.** Il a été testé aussi loin que possible sans y accéder, mais cela ne prouve pas qu'il fonctionne chez toi.

### GO pour la suite : un essai sur ton VPS, avec un profil de test

C'est la seule étape qui manque. La [checklist](../deployment/DEPLOYMENT.md#checklist-de-mise-en-production) en donne le détail.

## Niveau de preuve

| Élément | Niveau atteint |
|---|---|
| Moteur, personnages, interface | **Testé en local** |
| Serveur, connexion, registre, chat, journal | **Testé en local, face à un mock et à un faux Hermes** |
| Connecteur Hermes | **Écrit d'après le source** de v0.17.0. Jamais exécuté face au vrai |
| PostgreSQL | **Testé avec un simulateur** (`pg-mem`) |
| Image Docker, compose, Traefik | **Écrits, jamais lancés** : Docker est absent ici |
| Staging | **Non fait** |
| Production | **Non déployé** |

## Résultats des tests

Résultats observés sur le dernier commit.

| Commande | Résultat |
|---|---|
| `npx tsc --noEmit` | Aucune erreur |
| `npm test` | **255 tests réussis** |
| `npm run test:e2e` | **33 tests réussis** dans Chromium, 1 capture à la demande non lancée |
| `npm run build` et `npm run check:build` | Réussis, 15 fichiers contrôlés |
| `npm audit --omit=dev` | 0 vulnérabilité |

Bundle de production lancé directement avec Node :

| Situation | Résultat observé |
|---|---|
| Production sans base | Refus de démarrer, variable nommée |
| Production en mode mock | Refus de démarrer |
| Base injoignable | Refus de démarrer, mot de passe de base absent du message |
| Mode mock | `/healthz`, `/readyz`, interface et sprites à 200 |
| Arrêt par `SIGTERM` | Sortie propre, code 0 |

## Défauts trouvés pendant cette passe

| Défaut | Gravité | État |
|---|---|---|
| Demande d'autorisation perdue en changeant d'onglet ou en rechargeant | **Élevée** | Corrigé |
| Réponse effacée si Hermes ne l'a pas encore enregistrée | Moyenne | Corrigé |
| Réponse lente du registre écrasant une plus récente | Moyenne | Corrigé |
| Connexions réussies comptées comme des tentatives | Faible | Corrigé |
| Failles connues dans Express et zod | Élevée | Corrigé |

**Erreur de ma part à l'étape 11 :** le commit `f803948` est parti avec un test en échec, car ma commande n'était pas conditionnée à son résultat. Le commit suivant, `b7aab14`, corrige ce test et le vrai défaut qu'il révélait.

## Conformité aux critères d'acceptation

Légende : ✅ testé localement · ⚠️ testé face à un faux Hermes ou écrit seulement · ❌ non vérifiable ici

| # | Critère | État |
|---|---|---|
| CA-01 | Toute animation d'activité repose sur une donnée source | ⚠️ |
| CA-02 | État inconnu neutre et distinct | ✅ |
| CA-03 | Perte de connexion : aucun personnage actif | ✅ |
| CA-04 | JARVIS et VEILLEUR connectés seulement si confirmés | ⚠️ |
| CA-05 | Aucune réussite en cas d'échec | ✅ |
| CA-06 | Source de chaque information visible | ✅ |
| CA-07 | Données locales jamais présentées comme Hermes | ✅ |
| CA-08 | Personnage sans agent, agent sans personnage | ✅ |
| CA-09 | Mode mock identifiable, interdit en production | ✅ |
| CA-10 | Scène orthogonale, déplacement, collisions, profondeur | ✅ |
| CA-11 | Rendu net aux échelles prises en charge | ✅ Sur Chromium, DPR 1 |
| CA-12 | Personnages dérivés du Master | ✅ |
| CA-13 | Agents réels découverts et associables | ⚠️ |
| CA-14 | Conversation traçable à un agent et une session | ⚠️ |
| CA-15 | La reconnexion reprend la bonne session | ⚠️ |
| CA-16 | Pas de doublon d'événements | ✅ |
| CA-17 | Aucun secret dans le navigateur, le bundle, Git, les logs | ✅ Sauf logs de production |
| CA-18 | Le navigateur n'accède jamais à Hermes | ✅ |
| CA-19 | Authentification partout, hors santé | ✅ |
| CA-20 | Seuls les ports nécessaires exposés | ❌ Compose écrit, non lancé |
| CA-21 | Actions réelles documentées | ✅ |
| CA-22 | Licence ou provenance de chaque asset | ✅ |
| CA-23 | Aucun élément exclu par `NOTICE.md` livré | ✅ |
| CA-24 | Licence MIT conservée pour le code réutilisé | ✅ **Aucun code importé** : sans objet |
| CA-25 | Aucun service existant recréé | ✅ Par construction |
| CA-26 | Production non modifiée sans accord | ✅ |
| CA-27 | Healthchecks, sauvegarde, rollback documentés, restauration testée | ❌ Documentés, restauration non testée |
| CA-28 | Test de bout en bout | ⚠️ Passe face au faux Hermes |

## Limites connues

**Bloquant avant production :** tout ce qui est marqué ⚠️ ou ❌ ci-dessus.

**Fonctionnel :**
- Hors chat de l'application, on voit qu'un agent avance, avec du retard, mais pas ce qu'il fait.
- Le suivi d'un run est perdu si le backend redémarre : « Résultat inconnu ».
- Le détail des appels d'outils passés n'est pas renvoyé à l'agent.
- Une seule salle, une seule personne.
- La liste des profils est à déclarer à la main.
- Hermes est ciblé en v0.17.0 uniquement.
- Les migrations ne sont pas transactionnelles.

**Non implémenté :** comptes multiples, compteurs de coût, mode incident, administration des tâches planifiées, sons, personnages assis, évitement entre personnages.

**Sécurité :** voir [SECURITY_REVIEW.md](../security/SECURITY_REVIEW.md). Pas d'audit indépendant, pas de second facteur.

**Question non résolue :** la licence du dépôt.

## Commandes

```bash
npm ci
```

```bash
npm run build && npm run check:build
```

```bash
npm test
```

```bash
npm run test:e2e
```

```bash
docker compose up -d --build
```

**La dernière commande n'a jamais été exécutée.** Dans Dokploy, c'est le déploiement Compose qui la remplace.

## Livrables

- [DEPLOYMENT.md](../deployment/DEPLOYMENT.md)
- [ENVIRONMENT_VARIABLES.md](../deployment/ENVIRONMENT_VARIABLES.md)
- [SECURITY_REVIEW.md](../security/SECURITY_REVIEW.md)
- [RUNBOOK.md](../operations/RUNBOOK.md)
- `Dockerfile`, `docker-compose.yml`, `.env.example`, `tools/check-build.mjs`
- `e2e/journey.spec.ts`
