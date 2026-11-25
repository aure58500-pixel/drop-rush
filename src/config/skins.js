// Character skins. Add an entry to create a new skin; ids are synchronized over the network.
export const SKINS = [
  { id: 'red', name: 'Rouge Éclair', colors: { primary: '#e63946', secondary: '#2b2d42', accent: '#ffd166', skin: '#f1c27d', hair: '#3b2412', visor: '#7de2ff' } },
  { id: 'blue', name: 'Bleu Glacier', colors: { primary: '#4cc9f0', secondary: '#1d3557', accent: '#e0fbfc', skin: '#e8b98f', hair: '#f1f1f1', visor: '#ffffff' } },
  { id: 'green', name: 'Vert Forêt', colors: { primary: '#2d9a4b', secondary: '#4a3b28', accent: '#c7f464', skin: '#c68642', hair: '#1f1a12', visor: '#ffe66d' } },
  { id: 'yellow', name: 'Jaune Soleil', colors: { primary: '#ffcf33', secondary: '#33415c', accent: '#ff7b00', skin: '#f6d0a8', hair: '#8a4b1f', visor: '#2ec4b6' } },
  { id: 'purple', name: 'Violet Néon', colors: { primary: '#9d4edd', secondary: '#10002b', accent: '#ff4ecd', skin: '#d9a07a', hair: '#ff4ecd', visor: '#4dfff3' } },
  { id: 'orange', name: 'Orange Lave', colors: { primary: '#ff6b1a', secondary: '#2a1a14', accent: '#ffd23f', skin: '#8d5524', hair: '#111111', visor: '#ff3c00' } },
];

export const DEFAULT_SKIN_ID = 'red';

export function getSkin(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}
