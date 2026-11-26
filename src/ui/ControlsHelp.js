// Controls reference, using labels of the user's real keyboard layout.
import { actionLabel, keyLabel } from '../core/input/keyLabels.js';
import { el } from './dom.js';

export function createControlsList(isTouch) {
  const root = el('div', 'controls-list');
  const rows = isTouch
    ? [
      ['Joystick gauche', 'Se déplacer (pousser à fond pour courir)'],
      ['Glisser à droite', 'Orienter la caméra'],
      ['Sauter', 'Sauter'],
      ['Accroupir', 'S’accroupir / se relever'],
      ['Tirer', 'Tirer (glisser pour viser en tirant)'],
      ['Viser', 'Viser (zoom)'],
      ['Recharger', 'Recharger l’arme'],
      ['Ramasser', 'Ramasser l’objet proche'],
      ['Emplacements', 'Toucher pour changer d’arme'],
      ['Soins / boucliers', 'Toucher pour utiliser (bas à gauche)'],
      ['Construire', 'Mode construction : Poser, Pièce, Pivoter, Annuler'],
      ['❚❚', 'Pause'],
    ]
    : [
      [`${actionLabel('moveForward')} ${actionLabel('moveLeft')} ${actionLabel('moveBackward')} ${actionLabel('moveRight')}`, 'Se déplacer'],
      ['Souris', 'Orienter la caméra'],
      [actionLabel('jump'), 'Sauter'],
      [actionLabel('sprint'), 'Courir'],
      [`${actionLabel('crouch')} / ${keyLabel('KeyC')}`, 'S’accroupir'],
      ['Clic gauche', 'Tirer'],
      ['Clic droit', 'Viser (annule en construction)'],
      [actionLabel('reload'), 'Recharger'],
      [actionLabel('interact'), 'Ramasser'],
      [actionLabel('drop'), 'Jeter l’arme active'],
      ['1 à 5 / molette', 'Changer d’arme'],
      ['6 7 8 9', 'Petit soin, grand soin, petit bouclier, grand bouclier'],
      [actionLabel('build'), 'Mode construction'],
      [`Molette / ${actionLabel('slot1')} ${actionLabel('slot2')} ${actionLabel('slot3')}`, 'Choisir mur, rampe, plateforme'],
      [actionLabel('rotateBuild'), 'Pivoter la pièce (construction)'],
      ['Clic gauche (construction)', 'Poser la pièce'],
      [`${actionLabel('pause')}`, 'Pause'],
      [actionLabel('toggleHelp'), 'Afficher / masquer l’aide'],
    ];
  root.innerHTML = rows.map(([k, v]) => `<div class="control-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('');
  return root;
}
