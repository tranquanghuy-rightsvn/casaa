// English titles/categories for the 34 Pinterest pins, index-aligned with
// PROJECTS in projects-data.js. Kept separate so the source data stays intact.
export const TITLES_EN = [
  'Sculptural ceramic tiles in earthy tones',
  'Set of 3D-printed terracotta vessels',
  '3D-printed ceramic vessel with organic texture',
  'Urban coral reef 3D-printed from mycelium',
  'Folded 3D-printed ceramic vessel',
  '3D-printed concrete chair',
  'Winged 3D-printed terracotta vessel',
  'Buklo 3D-printed concrete stool',
  'Woven clay surface',
  'Silk-textured wall cladding panel',
  'GFRP block with diagonal pattern',
  'Petal-shaped ceramic object',
  'Modular breeze-block system',
  'Twisted 3D-printed tower',
  'Hollow 3D-printed brick block',
  'Wave-textured 3D-printed wall',
  'Ceramic vessel with pleated fabric texture',
  'Vessel 3D-printed with a Sierpiński algorithm',
  '3D-printed terracotta facade panel',
  'Ceramic vessel with raised texture',
  '3D-printed glazed brick',
  'GLINA3 3D-printed ceramic vessel',
  'CNC-milled wave-textured wood panel',
  'Multi-colour 3D-printed column',
  'Rigatona 3D-printed chair',
  'Sculptural brick facade',
  'Blue glazed tile panel',
  'Hollow terracotta module',
  '3D-printed public park',
  'Blue 3D-printed vessel',
  'Freshly fired glazed tiles',
  'Honeycomb brick combined with terracotta',
  '3D-printed terracotta brick wall',
  'Organic 3D-printed concrete planter',
];

const CATS = {
  'Gốm in 3D': '3D-printed ceramic',
  'Vật liệu sinh học': 'Bio-based material',
  'Bê tông in 3D': '3D-printed concrete',
  'Gạch và mặt dựng': 'Brick & facade',
  'Tráng men': 'Glazed',
  'Gia công CNC': 'CNC machining',
  'Nội thất in 3D': '3D-printed furniture',
};

export function catEn(vi) {
  return CATS[vi] || vi;
}
