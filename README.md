# Drop Rush

Battle Royale 3D multijoueur à la troisième personne, jouable directement dans le navigateur (ordinateur, tablette, téléphone), hébergé sur GitHub Pages, sans serveur de jeu dédié.

> **État actuel : étape 1 + construction en solo.** Moteur 3D, carte de test, déplacements, collisions, caméra, commandes clavier/souris et tactiles, système de construction (murs, rampes, plateformes). Les armes, le multijoueur Firebase, la zone et les grandes cartes arrivent dans les étapes suivantes.

## Sommaire

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancement en local](#lancement-en-local)
- [Configuration Firebase](#configuration-firebase)
- [Déploiement sur GitHub Pages](#déploiement-sur-github-pages)
- [Commandes du jeu](#commandes-du-jeu)
- [Architecture](#architecture)
- [Modifier l'équilibrage et le contenu](#modifier-léquilibrage-et-le-contenu)
- [Compatibilité](#compatibilité)

## Prérequis

- Node.js 18.18 ou plus récent (20 ou 22 recommandé)
- npm 9 ou plus récent
- Un navigateur récent avec WebGL 2 (Chrome, Edge, Firefox, Safari 15+)

## Installation

```bash
git clone https://github.com/<votre-compte>/drop-rush.git
cd drop-rush
npm install
```

## Lancement en local

```bash
npm run dev        # serveur de développement : http://localhost:5173/drop-rush/
npm run build      # build de production dans dist/
npm run preview    # sert le build : http://localhost:4173/drop-rush/
```

Options d'URL utiles :

- `?touch=1` force l'interface tactile (test sur ordinateur), `?touch=0` la désactive.

En mode développement, l'instance du jeu est accessible dans la console via `window.__dropRush`.

## Configuration Firebase

Firebase (authentification anonyme + Realtime Database) sera utilisé à partir de l'étape 3. Préparez dès maintenant :

1. Copiez `.env.example` en `.env.local`.
2. Créez un projet sur <https://console.firebase.google.com>, ajoutez une application Web, activez **Authentication > Anonyme** et créez une **Realtime Database**.
3. Renseignez les variables `VITE_FIREBASE_*` dans `.env.local`.

Les valeurs de configuration Firebase côté client ne sont pas des secrets : la sécurité repose sur les règles de la base (fournies à l'étape 3). Ne versionnez jamais `.env.local` (déjà ignoré par `.gitignore`).

## Déploiement sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` construit et publie le site à chaque push sur `main`.

1. Créez un dépôt GitHub nommé **`drop-rush`** (le chemin de base Vite est `/drop-rush/`).
   Pour un autre nom, définissez `VITE_BASE_PATH=/<nom-du-depot>/` (fichier `.env` ou variable du workflow).
2. Poussez le code sur la branche `main`.
3. Dans **Settings > Pages**, choisissez **Source : GitHub Actions**.
4. Dans **Settings > Secrets and variables > Actions**, ajoutez les secrets `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (nécessaires à partir de l'étape 3).
5. Le jeu est publié à l'adresse `https://<votre-compte>.github.io/drop-rush/`.

Conseil : après le premier `npm install`, versionnez `package-lock.json` ; le workflow utilisera alors `npm ci` pour des builds reproductibles.

## Commandes du jeu

Les touches sont liées à la **position physique** des touches (`KeyboardEvent.code`) : sur un clavier AZERTY on utilise Z/Q/S/D, sur un clavier QWERTY W/A/S/D. Les libellés affichés dans le jeu s'adaptent à votre clavier quand le navigateur le permet (Chrome, Edge).

| Action | Clavier / souris (AZERTY) |
| --- | --- |
| Avancer / reculer / gauche / droite | Z / S / Q / D |
| Orienter la caméra | Souris (cliquez dans le jeu pour capturer le pointeur) |
| Sauter | Espace |
| Courir | Maj gauche |
| S'accroupir | Ctrl gauche ou C |
| Viser (zoom, FOV 75° → 60°) | Clic droit |
| Pause | Échap ou P |
| Aide des commandes | H |
| Mode construction | B |
| Choisir la pièce (mur, rampe, plateforme) | Molette ou 1 / 2 / 3 |
| Pivoter la pièce | X |
| Poser (maintenir pour enchaîner) | Clic gauche |
| Annuler (quitter la construction) | Clic droit |

Écran tactile : joystick virtuel à gauche (poussé à fond = course), glisser à droite pour la caméra, boutons Sauter, Accroupir, Viser, Construire et Pause (au moins 56 px). En construction, quatre boutons supplémentaires apparaissent : Poser, Pièce, Pivoter, Annuler.

> **Attention à Ctrl + Z (AZERTY)** : sur AZERTY, Ctrl gauche + Z correspond physiquement à Ctrl + W, raccourci de fermeture d'onglet que les navigateurs ne laissent pas intercepter. Le jeu demande une confirmation avant de quitter, propose la touche **C** pour s'accroupir, le mode « Accroupi en mode bascule », et capture le clavier en **plein écran** (Chrome/Edge, bouton dans les paramètres).

## Construction

Grille de 2 m, étages de 2 m. Les pièces se posent là où vous visez, à moins de 14 m de vous :

- **Mur** 2 × 2 m, 0,25 m d'épaisseur, 200 points de résistance.
- **Rampe** 2 × 2 m à 45°, 150 points de résistance.
- **Plateforme** 2 × 2 m, 0,25 m d'épaisseur, 100 points de résistance.

L'aperçu est vert quand la pose est possible, rouge sinon, avec le motif affiché (emplacement occupé, joueur dans la zone, hors de la carte, obstacle, sous le sol, trop loin, limite atteinte). Les pièces posées sur le terrain sont ancrées à la hauteur du sol (un remplissage comble les pentes). Viser une construction place la pièce suivante contre elle : plateforme voisine, rampe sur une plateforme, mur empilé (moitié haute d'un mur) ou prolongé (moitié basse). Le tir est désactivé en mode construction. La limite est de 1 000 constructions. Les matériaux sont illimités.

Les constructions sont destructibles par l'API `BuildingSystem.damageFromHit(hit, dégâts)` et `BuildingSystem.explode(x, y, z, rayon, dégâts)`, prévues pour les armes de l'étape 2. Paramètres : `src/config/buildConfig.js`.

## Architecture

```
drop-rush/
├── index.html                  Page hôte (canvas, racine UI, écran de chargement)
├── vite.config.js              Base /drop-rush/, chunk three séparé
├── .github/workflows/deploy.yml
├── public/favicon.svg
└── src/
    ├── main.js                 Détection WebGL 2, chargement, gestion d'erreur
    ├── styles/main.css         Interface (menus, HUD, tactile)
    ├── config/                 Données et paramètres modifiables
    │   ├── gameConfig.js       Boucle (delta max 50 ms), limites, stockage
    │   ├── playerConfig.js     Vitesses, saut, gravité, capsule
    │   ├── cameraConfig.js     FOV, distances, collisions caméra
    │   ├── controlsConfig.js   Touches, sensibilité, tactile
    │   ├── graphicsConfig.js   Préréglages de qualité, adaptation auto
    │   ├── skins.js            Les 6 apparences
    │   └── maps/               Une carte = un fichier de données
    ├── core/                   Moteur : boucle, rendu, entrées, réglages, physique
    │   ├── Game.js             Orchestration des états et des systèmes
    │   ├── Engine.js           Renderer, scène, caméra, redimensionnement
    │   ├── GameLoop.js         requestAnimationFrame + delta plafonné
    │   ├── QualityManager.js   Qualité auto (< 45 FPS : ombres, distance, végétation)
    │   ├── input/              Clavier/souris (Pointer Lock), tactile, libellés de touches
    │   ├── physics/            CollisionWorld : boîtes, rampes, cylindres, terrain, raycast
    │   └── utils/              Maths, aléatoire déterministe (mulberry32), bruit
    ├── building/               Construction : état et validation (purs), ciblage, rendu instancié, débris
    ├── map/                    Génération et rendu des cartes
    ├── player/                 Moteur de déplacement, contrôleur, modèle, animation, caméra
    ├── ui/                     Menu principal, pause, paramètres, HUD
    ├── audio/                  Lecture Web Audio + sons synthétisés
    ├── weapons/ combat/ loot/ zone/ match/ network/   (étapes suivantes)
```

Principes :

- **Logique pure séparée du rendu** : la physique (`CollisionWorld`, `CharacterMotor`, `PlayerController`), le terrain (`TerrainData`) et la génération des cartes (`MapLayout`) n'importent pas Three.js. Ils sont réutilisables pour le réseau et vérifiables hors navigateur.
- **Visuels et collisions issus des mêmes données** : chaque bâtiment produit une liste de formes (boîtes, rampes, toits) qui sert à la fois au rendu fusionné et aux collisions.
- **Déterminisme** : toute la carte (relief, végétation, nuages) dérive de la graine de la carte, ce qui garantit le même monde chez tous les joueurs.
- **Rendu léger** : structures fusionnées par blocs de 64 m (un appel de rendu par bloc), végétation en `InstancedMesh`, 2 lumières dynamiques (hémisphère + soleil), ombres qui suivent le joueur.

## Modifier l'équilibrage et le contenu

- Vitesses (5 / 7,5 / 2,5 m/s), saut (7,5 m/s), gravité (20 m/s²), accélérations (40 / 30 m/s²), capsule (1,8 / 1,0 / 0,35 m) : `src/config/playerConfig.js`.
- FOV (75° / 60°), distance et collisions de caméra : `src/config/cameraConfig.js`.
- Sensibilité souris (0,002 rad/px par défaut), touches, réglages tactiles : `src/config/controlsConfig.js`.
- Qualité graphique et seuil d'adaptation (45 FPS) : `src/config/graphicsConfig.js`.
- Construction (grille, résistances, portée, limite de 1 000, animation de 0,25 s) : `src/config/buildConfig.js`.
- Nouvelle apparence : ajoutez une entrée dans `src/config/skins.js`.
- Nouvelle carte : créez un fichier dans `src/config/maps/` (relief, rivières, bâtiments, zones, accessoires, végétation, points d'apparition) puis déclarez-le dans `src/config/maps/index.js`.

## Compatibilité

- WebGL 2 obligatoire : un message explicite s'affiche s'il est indisponible.
- Chrome, Edge, Firefox et Safari récents. Sur iPhone, Safari ne permet pas le plein écran.
- Qualité automatique : démarre en « Élevée » sur ordinateur, « Moyenne » sur appareil tactile, puis baisse d'un niveau si la moyenne passe sous 45 FPS.
