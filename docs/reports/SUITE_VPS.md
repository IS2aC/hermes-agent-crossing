# Après l'étape 12 : l'essai sur le VPS

Les étapes 00 à 12 sont faites, mais rien n'a tourné sur ton infrastructure. Voici, dans l'ordre, ce qui reste.

## 1. Contrôle en lecture seule

Sur le VPS, pour chaque profil :

```bash
HERMES_URL=http://hôte:8642 HERMES_KEY=... npx tsx tools/hermes-probe.ts
```

Transmets-moi la sortie. Elle ne contient ni clé, ni contenu de conversation.

## 2. Tes réponses

1. **Serveur API :** les profils `jarvis` et `veilleur` l'ont-ils activé, avec quel port et quelle clé ? Écoute-t-il sur `127.0.0.1` ?
2. **Multiplexage :** `gateway.multiplex_profiles` est-il activé ?
3. **Profil de test :** peux-tu en créer un, à outils limités ?
4. **Réseau :** comment s'appellent les réseaux Docker de Hermes et de PostgreSQL ?
5. **Accès :** quelles adresses autoriser, ou quel VPN ?
6. **Licence :** laquelle pour ce dépôt ?

## 3. Déploiement d'essai

Suivre [DEPLOYMENT.md](../deployment/DEPLOYMENT.md), avec le seul profil de test.
