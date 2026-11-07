/**
 * SUBJECT 01 — Scene and Narrative Presets (S01-FIX-002B)
 *
 * In compliance with S01-FIX-002B DEFECT C:
 * - Fabricated 16x16 PNG color blocks have been permanently eliminated.
 * - Because no authentic preset photographs exist in the repository,
 *   image-based presets are disabled (hasPhotographicReference: false, imageUrl: undefined).
 * - Presets serve as pure narrative scene presets (shot type, expression, glasses, and scene description).
 * - User-uploaded photographic inspiration and manual configuration remain fully supported.
 */

export interface InspirationPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
  hasPhotographicReference: boolean;
  suggestedShotType: 'half_body' | 'full_body' | 'portrait';
  suggestedExpression: 'slight_smile' | 'concentration' | 'neutral';
  suggestedGlasses: 'on' | 'off' | 'contextual';
  defaultSceneText: string;
}

export const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: 'preset_street_trench',
    title: 'Casual Street Style en Madrid',
    category: 'Streetwear / Otoño',
    description:
      'Escenario narrativo urbano: abrigo sastre color camel sobre jersey de cuello subido, pantalones rectos y postura relajada caminando.',
    imageUrl: undefined,
    hasPhotographicReference: false,
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
      'Escenario narrativo interior: ambiente de cafetería minimalista con luz suave de ventana, mesa de mármol, cardigan de punto azul marino y camisa oxford clara.',
    imageUrl: undefined,
    hasPhotographicReference: false,
    suggestedShotType: 'half_body',
    suggestedExpression: 'concentration',
    suggestedGlasses: 'on',
    defaultSceneText:
      'Diego sentado en una mesa redonda junto a la ventana de una cafetería de arquitectura en Barcelona. Revisa bocetos en su cuaderno con el reloj Bauhaus visible y las gafas metálicas redondas puestas.',
  },
];
