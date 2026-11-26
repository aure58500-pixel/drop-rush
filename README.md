# Drop Rush

Battle Royale 3D multijoueur à la troisième personne, jouable directement dans le navigateur (ordinateur, tablette, téléphone), hébergé sur GitHub Pages, sans serveur de jeu dédié.

> **État actuel : en solo (entraînement).** Moteur 3D, trois cartes (L'Île, Ville des Canaux, Cité des Ruines), 5 personnages, déplacements, construction, 12 armes, santé et bouclier, inventaire, consommables, 150 points de butin par carte, zone de sécurité, mannequins d'entraînement et HUD de combat. Le multijoueur Firebase (salons) arrive à l'étape suivante.

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
| Viser (zoom, FOV 75° → 60°, plus fort au fusil de précision) | Clic droit |
| Pause | Échap ou P |
| Aide des commandes | H |
| Tirer | Clic gauche |
| Recharger | R |
| Ramasser | E |
| Jeter l'arme active | G |
| Changer d'arme | 1 à 5 ou molette |
| Petit soin / grand soin / petit bouclier / grand bouclier | 6 / 7 / 8 / 9 |
| Mode construction | B |
| Choisir la pièce (mur, rampe, plateforme) | Molette ou 1 / 2 / 3 |
| Pivoter la pièce | X |
| Poser (maintenir pour enchaîner) | Clic gauche |
| Annuler (quitter la construction) | Clic droit |

Écran tactile : joystick virtuel à gauche (poussé à fond = course), glisser à droite pour la caméra, boutons Tirer (maintenir, et glisser le doigt pour viser en tirant), Recharger, Viser, Sauter, Accroupir, Construire et Pause (au moins 56 px). Le bouton Ramasser apparaît près d'un objet. On change d'arme en touchant un emplacement et on utilise un soin en touchant son icône. En construction, quatre boutons apparaissent : Poser, Pièce, Pivoter, Annuler.

> **Attention à Ctrl + Z (AZERTY)** : sur AZERTY, Ctrl gauche + Z correspond physiquement à Ctrl + W, raccourci de fermeture d'onglet que les navigateurs ne laissent pas intercepter. Le jeu demande une confirmation avant de quitter, propose la touche **C** pour s'accroupir, le mode « Accroupi en mode bascule », et capture le clavier en **plein écran** (Chrome/Edge, bouton dans les paramètres).

## Armes et combat

| Arme | Dégâts | Cadence (coups/min) | Chargeur | Rechargement | Portée | Dispersion |
| --- | --- | --- | --- | --- | --- | --- |
| Pistolet léger | 18 | 240 | 12 | 1,4 s | 60 m | 1,2° |
| Revolver | 45 | 90 | 6 | 2,2 s | 80 m | 0,8° |
| SMG rafale (3 coups par clic) | 16 | 900 | 30 | 1,8 s | 45 m | 2,5° |
| SMG compacte | 14 | 1 100 | 35 | 2 s | 35 m | 3° |
| Fusil d'assaut | 30 | 600 | 30 | 2,4 s | 150 m | 1,8° |
| Fusil d'assaut lourd | 38 | 480 | 25 | 2,6 s | 160 m | 1,6° |
| Fusil à pompe | 8 × 12 | 70 | 6 | 3 s | 25 m | 6° |
| Fusil de précision | 90 | 45 | 5 | 3 s | 400 m | 0,2° |
| Carabine semi-automatique | 35 | 180 | 15 | 2,2 s | 200 m | 0,6° |
| Arbalète (flèche à 60 m/s) | 80 | 40 | 1 | 2,5 s | 120 m | 0,3° |
| Mitrailleuse légère | 22 | 750 | 75 | 4,5 s | 120 m | 3,5° |
| Lance-roquettes (roquette à 40 m/s) | 100 + zone 60 sur 4 m | 30 | 1 | 3,5 s | toute la carte | 0° |

Règles :

- Tirs instantanés (lancer de rayon) pour toutes les armes, sauf l'arbalète et le lance-roquettes, qui tirent des projectiles physiques. Les flèches restent plantées 10 s. Les roquettes explosent à l'impact.
- La visée part de la caméra (le centre du viseur), le tir part des yeux du personnage : un mur devant le personnage arrête bien la balle.
- Tir à la tête ×2 (sauf lance-roquettes). Dégâts à 60 % au-delà de 75 % de la portée.
- Dispersion : +0,15° par tir successif, remise à zéro après 0,4 s sans tirer. ×1,5 en course, ×2 en l'air, ×0,7 accroupi, ×0,5 en visée. Le viseur s'écarte selon la dispersion réelle.
- Impossible de tirer en courant, sauf au pistolet et au revolver : maintenir le tir arrête la course.
- Changer d'arme annule le rechargement. Un chargeur vide se recharge tout seul.
- Le bouclier absorbe les dégâts avant la santé. Les explosions ne traversent pas les murs, et le tireur ne subit pas sa propre roquette.
- Les balles et explosions abîment les constructions.

Inventaire : 5 emplacements d'armes. Ramasser une arme déjà possédée remplit son chargeur. Inventaire plein : l'arme active est échangée et tombe au sol.

| Consommable | Effet | Durée | Touche |
| --- | --- | --- | --- |
| Petit soin | +25 santé | 2 s | 6 |
| Grand soin | santé à 100 | 5 s | 7 |
| Petit bouclier | +25 bouclier | 2 s | 8 |
| Grand bouclier | +50 bouclier | 4 s | 9 |

5 unités au maximum par type. Se déplacer, sauter, tirer ou subir des dégâts annule l'utilisation.

Carte d'entraînement : les 12 armes posées en ligne devant le point d'apparition, les 4 consommables juste derrière, des mannequins à 15, 35, 55 et 75 m (certains avec bouclier), et une tourelle rouge qui riposte (6 dégâts toutes les 1,6 s, à moins de 35 m) pour tester la santé, le bouclier et les soins. Les objets réapparaissent 6 s après avoir été ramassés, les mannequins 3 s après leur élimination. En entraînement, on réapparaît en gardant son inventaire.

## Cartes

| Carte | Identifiant | Diamètre | Particularités |
| --- | --- | --- | --- |
| L'Île | `ile` | 700 m | Plateau entouré de falaises et de la mer (mortelle). Le centre (rond-point et couronne) est entouré d'une crevasse franchie par 4 ponts violets. Tour de contrôle et grue au nord-est, burger et héliport à l'est, hangar rouge et conteneurs au nord-ouest, deux cascades au sud. |
| Ville des Canaux | `canaux` | 600 m | Plateau flottant (tomber élimine). Fontaine couronne au centre, canal en anneau franchi par 4 ponts, 4 canaux en diagonale. L'eau ralentit de 50 % sans tuer, même en sautant. 4 trampolines propulsent à environ 4 m vers l'avant. Château d'eau et horloge au nord, héliport au nord-est. |
| Cité des Ruines | `cite-ruines` | 700 m | Mur d'enceinte de 6 m (limite infranchissable), porte sud grillagée ouverte, route en anneau autour d'une fontaine couronne, burger et tour au nord-ouest, garage à conteneurs et grue au nord, bâtiment moderne avec héliport et escalier extérieur à l'est, ruines à l'ouest. |

Le choix de la carte se fait dans le menu principal (vignette `public/maps/carte-<id>.png` si l'image est présente, sinon le nom). La carte par défaut est `ile` ; un identifiant inconnu (par exemple une ancienne carte enregistrée) revient à `ile`. Chaque carte a au moins 20 points d'apparition espacés d'au moins 80 m et 150 points de butin générés par la graine (40 % d'armes, 40 % de soins, 20 % de boucliers).

Tous les bâtiments ont un escalier intérieur jusqu'au toit. Seul l'auvent de la cabine des tours de contrôle est un toit de décor (non accessible). Les décors sans collision sont : tubes roses, véhicules, bannières, parasols, lampadaires, cascades, ballon et grue de la Ville des Canaux (hors de la zone jouable), flèche des grues.

Zone de sécurité : centre tiré de la graine, à au moins 25 % de la taille de la carte du bord ; 6 phases de réduction linéaire (2:00, 4:00, 6:30, 8:30, 10:30, 12:30) ; dégâts 1 à 20 par seconde hors zone. En entraînement, la zone démarre au lancement et recommence après une réapparition. Pour la tester vite : ajoutez `?zoneSpeed=10` à l'adresse (10 fois plus rapide).

## Construction

Grille de 2 m, étages de 2 m. Les pièces se posent là où vous visez, à moins de 14 m de vous :

- **Mur** 2 × 2 m, 0,25 m d'épaisseur, 200 points de résistance.
- **Rampe** 2 × 2 m à 45°, 150 points de résistance.
- **Plateforme** 2 × 2 m, 0,25 m d'épaisseur, 100 points de résistance.

L'aperçu est vert quand la pose est possible, rouge sinon, avec le motif affiché (emplacement occupé, joueur dans la zone, hors de la carte, obstacle, sous le sol, trop loin, limite atteinte). Les pièces posées sur le terrain sont ancrées à la hauteur du sol (un remplissage comble les pentes). Viser une construction place la pièce suivante contre elle : plateforme voisine, rampe sur une plateforme, mur empilé (moitié haute d'un mur) ou prolongé (moitié basse). Le tir est désactivé en mode construction. La limite est de 1 000 constructions. Les matériaux sont illimités.

Les constructions sont détruites par les tirs et les explosions. Paramètres : `src/config/buildConfig.js`.

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
    │   ├── skins.js            Liste des 5 personnages jouables
    │   ├── characters/         Un fichier par personnage + kit.js (base chibi commune)
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
    ├── combat/                 Santé, balistique, cibles, résolution des tirs et projectiles (purs), effets, mannequins
    ├── weapons/                Minuterie des armes (cadence, rafales, rechargement), modèles 3D et icônes
    ├── loot/                   Objets au sol (logique pure) et leur rendu
    ├── map/                    Terrain circulaire, générateurs de bâtiments, décors instanciés, rendu des cartes
    ├── zone/                   Zone de sécurité (logique pure) et son mur
    ├── player/                 Moteur de déplacement, contrôleur, modèle, animation, caméra
    ├── ui/                     Menu principal, pause, paramètres, HUD
    ├── audio/                  Lecture Web Audio + sons synthétisés
    ├── match/ network/   (étapes suivantes)
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
- Armes (statistiques, modèle 3D décrit en pièces, paramètres du son) : `src/config/weapons.js`. Ajouter une entrée crée une nouvelle arme sans toucher au code.
- Règles de combat (atténuation, dispersion, recul, ramassage) et entraînement (mannequins, tourelle) : `src/config/combatConfig.js`.
- Consommables : `src/config/consumables.js`.
- Cartes : un fichier par carte dans `src/config/maps/` (terrain, canaux, peinture du sol, bâtiments, décors, végétation, points d'apparition, zone, zone d'entraînement), déclaré dans `src/config/maps/index.js`.
- Butin (nombre, proportions, poids des armes) et disposition de l'entraînement : `src/config/lootConfig.js`. Phases de la zone : `src/config/zoneConfig.js`.
- Nouveau personnage : créez un fichier dans `src/config/characters/` (liste de pièces posées sur la base commune de `kit.js`), puis ajoutez-le à `src/config/skins.js`. Limite : 2 000 triangles.
- Nouvelle carte : créez un fichier dans `src/config/maps/` (relief, rivières, bâtiments, zones, accessoires, végétation, points d'apparition) puis déclarez-le dans `src/config/maps/index.js`.

## Compatibilité

- WebGL 2 obligatoire : un message explicite s'affiche s'il est indisponible.
- Chrome, Edge, Firefox et Safari récents. Sur iPhone, Safari ne permet pas le plein écran.
- Qualité automatique : démarre en « Élevée » sur ordinateur, « Moyenne » sur appareil tactile, puis baisse d'un niveau si la moyenne passe sous 45 FPS.
