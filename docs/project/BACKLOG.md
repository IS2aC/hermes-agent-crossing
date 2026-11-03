# Tâches à réaliser

Objectifs fixés par l'opérateur le 2026-11-03, après le premier déploiement sur le VPS, où la discussion avec les agents fonctionne.

L'ordre reprend celui de l'opérateur et n'est pas une priorité décidée. Les notes signalent seulement des points à étudier.

## Améliorations demandées

- [ ] **Ajouter un nouveau profil plus facilement.** Aujourd'hui, il faut modifier le `.env` du profil, `docker-compose.yml` et Dokploy.
- [ ] **Ajouter des couches de sprites professionnelles pour les déplacements des agents, selon leurs tâches.** Le déplacement devra rester lié à une donnée réelle, sans simuler d'activité.
- [ ] **Modifier facilement le personnage d'un agent.**
- [ ] **Améliorer la map.**
- [ ] **Gérer la sécurité.** L'accès à la solution donne la main sur toute la squad d'agents.
- [ ] **Voir le rendu des agents :** documents, Excel, fichiers CSV. À étudier : d'où viennent ces fichiers, et comment les afficher sans risque.
- [ ] **Créer un nouvel agent dans une vue graphique, sans prise de tête.** À étudier : l'API de Hermes v0.17 ne liste pas les profils, et leur création passe par sa ligne de commande. Il faudra trouver un moyen sans élargir les droits de l'application.
- [ ] **Entrer les accès de sa connexion à Hermes et les faire prendre en charge par la solution, le plus simplement possible.** Les clés devront rester côté serveur, jamais dans le navigateur.

## Points restés ouverts

- [ ] Retirer la déduction « Au repos » : d'après le code de la v0.17, `active_agents` n'est mis à jour que lorsque l'état de la gateway change, et ne prouve pas qu'un agent est inactif.
- [ ] Vérifier l'autorisation, l'arrêt d'un run et l'activité Telegram sur le vrai Hermes.
- [ ] Configurer les sauvegardes de la base et tester une restauration.
- [ ] Vérifier si les agents ont besoin du socket Docker monté dans Hermes.
- [ ] Clarifier la provenance des images de Claude-Office avec leur auteur.
- [ ] Choisir la licence du dépôt.
