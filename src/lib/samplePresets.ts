export interface InspirationPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  suggestedShotType: 'half_body' | 'full_body' | 'portrait';
  suggestedExpression: 'slight_smile' | 'concentration' | 'neutral';
  suggestedGlasses: 'on' | 'off' | 'contextual';
  defaultSceneText: string;
}

const SVG_PINTEREST_STREET_OUTFIT = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="100%" height="100%">
  <defs>
    <linearGradient id="bgStreet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="60%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B8860B"/>
      <stop offset="50%" stop-color="#996515"/>
      <stop offset="100%" stop-color="#704214"/>
    </linearGradient>
  </defs>
  
  <rect width="500" height="700" fill="url(#bgStreet)"/>
  
  <!-- Architectural background blur -->
  <rect x="40" y="40" width="120" height="400" fill="#334155" opacity="0.25" rx="4"/>
  <rect x="340" y="80" width="120" height="400" fill="#334155" opacity="0.2" rx="4"/>
  <circle cx="420" cy="180" r="80" fill="#F59E0B" opacity="0.08"/>
  <line x1="0" y1="580" x2="500" y2="580" stroke="#475569" stroke-width="2"/>
  <text x="24" y="36" fill="#F59E0B" font-family="monospace" font-size="11" letter-spacing="1">PINTEREST STREET STYLE // REF #8841</text>
  
  <!-- Pinterest reference figure (A different model with blonde hair to clearly test identity separation) -->
  <g transform="translate(140, 110)">
    <!-- Head (Blonde / fair skin placeholder showing this is NOT Diego) -->
    <circle cx="110" cy="65" r="32" fill="#F5D0A9"/>
    <!-- Blonde hair -->
    <path d="M 75 55 Q 110 20 145 55 Q 150 35 110 30 Q 75 35 75 55 Z" fill="#EAB308"/>
    <!-- Oversized Wool Camel Coat -->
    <path d="M 50 110 L 170 110 L 195 440 L 25 440 Z" fill="url(#coatGrad)"/>
    <!-- Coat Lapels -->
    <polygon points="50,110 110,210 90,110" fill="#704214"/>
    <polygon points="170,110 110,210 130,110" fill="#704214"/>
    <!-- Dark Charcoal Mockneck knit underneath -->
    <polygon points="85,100 135,100 110,140" fill="#18181B"/>
    <!-- Hands in coat pockets pose -->
    <rect x="25" y="160" width="30" height="150" rx="8" fill="url(#coatGrad)" transform="rotate(8 25 160)"/>
    <rect x="165" y="160" width="30" height="150" rx="8" fill="url(#coatGrad)" transform="rotate(-8 165 160)"/>
    <!-- Dark pleated trousers -->
    <rect x="65" y="430" width="40" height="180" rx="4" fill="#09090B"/>
    <rect x="115" y="430" width="40" height="180" rx="4" fill="#09090B"/>
    <!-- Chunky leather loafers -->
    <ellipse cx="85" cy="615" rx="22" ry="10" fill="#27272A"/>
    <ellipse cx="135" cy="615" rx="22" ry="10" fill="#27272A"/>
  </g>
  
  <!-- Overlay Tag -->
  <g transform="translate(30, 620)">
    <rect width="440" height="55" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="16" y="24" fill="#F8FAFC" font-family="sans-serif" font-size="12" font-weight="bold">Outsider Wool Trench &amp; Charcoal Mockneck</text>
    <text x="16" y="42" fill="#94A3B8" font-family="sans-serif" font-size="10">Paleta camel, postura con manos en bolsillos, luz diurna suave de otoño.</text>
  </g>
</svg>
`)}`;

const SVG_CAFE_LIFESTYLE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="100%" height="100%">
  <defs>
    <linearGradient id="bgCafe" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#271911"/>
      <stop offset="60%" stop-color="#19110B"/>
      <stop offset="100%" stop-color="#0F0A06"/>
    </linearGradient>
  </defs>
  <rect width="500" height="700" fill="url(#bgCafe)"/>
  <circle cx="380" cy="120" r="120" fill="#D97706" opacity="0.12"/>
  <text x="24" y="36" fill="#D97706" font-family="monospace" font-size="11" letter-spacing="1">PINTEREST MOOD // CAFÉ SPECIALTY</text>
  
  <!-- Sitting pose at marble table with ceramic cup and notebook -->
  <g transform="translate(100, 130)">
    <!-- Subject sitting -->
    <circle cx="150" cy="70" r="34" fill="#E2BA96"/>
    <!-- Knit cardigan navy blue -->
    <path d="M 80 120 L 220 120 L 230 380 L 70 380 Z" fill="#1E3A8A"/>
    <!-- White oxford shirt open collar -->
    <polygon points="130,120 170,120 150,170" fill="#F8FAFC"/>
    <!-- Table -->
    <ellipse cx="150" cy="400" rx="190" ry="60" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2"/>
    <!-- Coffee cup & saucer -->
    <ellipse cx="110" cy="390" rx="20" ry="10" fill="#F1F5F9"/>
    <ellipse cx="110" cy="385" rx="14" ry="7" fill="#78350F"/>
  </g>
  
  <g transform="translate(30, 620)">
    <rect width="440" height="55" rx="6" fill="#1C140E" stroke="#523624" stroke-width="1"/>
    <text x="16" y="24" fill="#F8FAFC" font-family="sans-serif" font-size="12" font-weight="bold">Cardigan Marino &amp; Café de Especialidad</text>
    <text x="16" y="42" fill="#94A3B8" font-family="sans-serif" font-size="10">Atmósfera cálida de cafetería nórdica, luz matutina lateral en mesa de mármol.</text>
  </g>
</svg>
`)}`;

export const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: 'preset_street_trench',
    title: 'Casual Street Style en Madrid',
    category: 'Streetwear / Otoño',
    description:
      'Fotografía callejera inspirada en Pinterest: abrigo sastre color camel cruzado sobre cuello vuelto antracita, pantalones rectos y postura relajada caminando.',
    imageUrl: SVG_PINTEREST_STREET_OUTFIT,
    suggestedShotType: 'half_body',
    suggestedExpression: 'slight_smile',
    suggestedGlasses: 'on',
    defaultSceneText:
      'Diego caminando tranquilamente por la calle Jorge Juan en Madrid un martes por la tarde. Lleva un abrigo de lana color camel sobre un jersey de cuello mockneck grafito. Mirada afable hacia la cámara con leve sonrisa natural.',
  },
  {
    id: 'preset_cafe_specialty',
    title: 'Café de Especialidad y Cuaderno',
    category: 'Lifestyle / Interiores',
    description:
      'Ambiente de cafetería minimalista con luz suave de ventana, mesa de mármol con café latte, cardigan de punto azul marino y camisa oxford clara.',
    imageUrl: SVG_CAFE_LIFESTYLE,
    suggestedShotType: 'half_body',
    suggestedExpression: 'concentration',
    suggestedGlasses: 'on',
    defaultSceneText:
      'Diego sentado en una mesa redonda junto a la ventana de una cafetería de arquitectura en Barcelona. Revisa bocetos en su cuaderno con el reloj Bauhaus visible y las gafas metálicas redondas puestas.',
  },
];
