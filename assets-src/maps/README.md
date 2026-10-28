MAPS ET PREFABS (pour Phase 5)
Prefabs de pièces dans Tiled .tmj:
- hall: entrée principale avec accueil
- private_office: bureau de manager (Jarvis)
- open_space_general: espace de travail commun
- team_open_space_{2,4,6,8}: espaces par équipe (poste manager + îlots)
- kanban_room: salle dédiée au Kanban mural
- coffee_corner: espace détente avec machine à café
- server_room: salle des serveurs avec baies et voyants
- couloirs: chemins reliant les pièces

Chaque prefab déclare des objets nommés pour le placement:
- desk_slot: poste de travail
- manager_desk: poste de manager
- door: entrée/sortie de pièce
- poi_coffee: point d'intérêt machine à café
- poi_plant: plante décorative
- poi_plant: point d'intérêt plante
- kanban_wall: tableau Kanban mural
- team_sign: panneau suspendu de team

Format: Tiled .tmj (tilemap JSON), tileset référençant assets-src/tiles/office.aseprite
