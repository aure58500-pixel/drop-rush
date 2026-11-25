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
      ['Viser', 'Viser (zoom)'],
      ['Construire', 'Mode construction : Poser, Pièce, Pivoter, Annuler'],
      ['❚❚', 'Pause'],
    ]
    : [
      [`${actionLabel('moveForward')} ${actionLabel('moveLeft')} ${actionLabel('moveBackward')} ${actionLabel('moveRight')}`, 'Se déplacer'],
      ['Souris', 'Orienter la caméra'],
      [actionLabel('jump'), 'Sauter'],
      [actionLabel('sprint'), 'Courir'],
      [`${actionLabel('crouch')} / ${keyLabel('KeyC')}`, 'S’accroupir'],
      ['Clic droit', 'Viser (annule en construction)'],
      [actionLabel('build'), 'Mode construction'],
      [`Molette / ${actionLabel('slot1')} ${actionLabel('slot2')} ${actionLabel('slot3')}`, 'Choisir mur, rampe, plateforme'],
      [actionLabel('rotateBuild'), 'Pivoter la pièce (construction)'],
      ['Clic gauche', 'Poser la pièce (construction)'],
      [`${actionLabel('pause')}`, 'Pause'],
      [actionLabel('toggleHelp'), 'Afficher / masquer l’aide'],
    ];
  root.innerHTML = rows.map(([k, v]) => `<div class="control-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('');
  return root;
}
