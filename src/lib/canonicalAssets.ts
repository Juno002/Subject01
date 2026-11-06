import { CanonicalAsset } from './types';

export const INITIAL_CANONICAL_ASSETS: CanonicalAsset[] = [
  {
    id: '01_FACE_MASTER',
    code: '01_FACE_MASTER',
    title: 'Character Reference Sheet (Face Master)',
    subtitle: 'Identidad Facial y Fisonomía Canónica // 4 Ángulos',
    authorityDomain: 'Identidad facial, corte de pelo rizado, vello facial y características cutáneas',
    description:
      'Referencia maestra absoluta de Diego Navarro (32 años). Autoridad suprema sobre estructura ósea, ojos castaños cálidos almendrados, nariz recta perfilada, cabello castaño oscuro con rizos naturales definidos, barba y bigote recortados de 3 días y tez oliva mediterránea. Sin gafas.',
    technicalSpecs: [
      '4 ángulos canónicos oficiales: Front Portrait, 3/4 View Left, 3/4 View Right, Side Profile',
      'Sin gafas ni accesorios superpuestos en la referencia maestra',
      'Tez oliva cálida con textura cutánea fotorrealista auténtica',
      'Corte de pelo corto con rizos naturales definidos en la parte superior y barba de 3 días densa y simétrica',
    ],
    imageUrl: '/assets/aistudio/Hoja_de_referencia_del_personaje_01_4479e60c.png',
    isConnected: true,
    anglesOrViews: ['Front Portrait', '3/4 View Left', '3/4 View Right', 'Side Profile'],
    lastUpdated: 'Canon Oficial Lock',
  },
  {
    id: '02_BODY_MASTER',
    code: '02_BODY_MASTER',
    title: 'Master Sheet (Body Master)',
    subtitle: 'Constitución Física, Anatomía y Proporciones // 5 Vistas',
    authorityDomain: 'Constitución física natural, proporciones, anatomía, vello corporal y características del torso',
    description:
      'Referencia anatómica canónica de Diego Navarro. Estatura 1.83 m (6’0”), complexión atlética esbelta (lean athletic), hombros estructurados proporcionados, vello natural moderado en pecho y antebrazos, postura relajada y natural.',
    technicalSpecs: [
      '5 vistas anatómicas completas oficiales: Frontal, Perfil Izquierdo, Perfil Derecho, Espalda, 3/4 Frontal',
      'Estatura oficial: 1.83 metros / 6 pies',
      'Proporción anatómica: hombros atléticos sin hipertrofia de culturismo',
      'Vello corporal natural en pecho y abdomen, textura de piel uniforme',
    ],
    imageUrl: '/assets/aistudio/Master_sheet_847b0873.png',
    isConnected: true,
    anglesOrViews: ['Frontal', 'Perfil Izq', 'Perfil Der', 'Espalda', '3/4 Frontal'],
    lastUpdated: 'Canon Oficial Lock',
  },
  {
    id: '03_ACCESSORIES_MASTER',
    code: '03_ACCESSORIES_MASTER',
    title: 'Accessories Master Sheet',
    subtitle: 'Gafas Metálicas Redondas, Reloj Bauhaus y Smartphone',
    authorityDomain: 'Gafas metálicas redondeadas, reloj minimalista con correa de cuero y iPhone negro',
    description:
      'Infografía canónica de accesorios oficiales de Diego Navarro: Gafas de alambre metálico redondo plateado (vistas frontal, 3/4, lateral y plegada), reloj minimalista con caja de acero plateado pulido, esfera color crema/marfil y correa de cuero marrón oscuro pespunteado, y teléfono negro con funda de silicona mate.',
    technicalSpecs: [
      'Gafas: Montura redonda de alambre de titanio plateado mate, puente curvado fino y patillas delgadas',
      'Reloj: Caja plateada pulida, esfera marfil sin números con índices negros finos, correa de piel marrón oscuro con hebilla de acero',
      'Teléfono: Smartphone color negro medianoche con funda protectora de silicona negra mate',
      'Regla canónica: Si la escena especifica "Sin gafas", NO se generará montura bajo ningún concepto',
    ],
    imageUrl: '/assets/aistudio/Infograf_a_de_accesorios_minimalista_a072bf03.png',
    isConnected: true,
    anglesOrViews: ['Gafas Alambre Plata', 'Reloj Bauhaus Marfil', 'Smartphone Negro Mate'],
    lastUpdated: 'Canon Oficial Lock',
  },
  {
    id: '04_EXPRESSIONS_MASTER',
    code: '04_EXPRESSIONS_MASTER',
    title: 'Tabla de Expresiones (Expressions Master)',
    subtitle: 'Matriz de 6 Estados Expresivos Canónicos',
    authorityDomain: 'Expresión neutral, sonrisa leve, concentración, sorpresa sutil, hablando y cansado',
    description:
      'Lámina oficial con los 6 estados emocionales certificados para Diego Navarro: Neutral, Slight Smile (sonrisa leve), Concentration (concentración con ceño tenso), Soft Surprise (sorpresa sutil con boca entreabierta), Mid-Speech (hablando dinámico) y Tired (cansado con párpados caídos).',
    technicalSpecs: [
      '6 expresiones oficiales certificadas: Neutral, Slight Smile, Concentration, Soft Surprise, Mid-Speech, Tired',
      'Subordinado estrictamente a la estructura ósea del Face Master: ninguna emoción deforma los rasgos de Diego',
      'Microexpresiones humanas creíbles, evitando muecas artificiales o sobreactuadas',
    ],
    imageUrl: '/assets/aistudio/Tabla_de_expresiones__Sujeto_01_60d2f7c4.png',
    isConnected: true,
    anglesOrViews: ['Neutral', 'Slight Smile', 'Concentration', 'Soft Surprise', 'Mid-Speech', 'Tired'],
    lastUpdated: 'Canon Oficial Lock',
  },
];
