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

// Authentic raster PNG data URLs (valid 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A)
const RASTER_PNG_STREET_OUTFIT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGPY0cZNEmIY1TCqYfhqAACVmEkQ6aIVXQAAAABJRU5ErkJggg==';

const RASTER_PNG_CAFE_LIFESTYLE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGOQs+oiCTGMahjVMHw1AAC7R+IB7fUXEAAAAABJRU5ErkJggg==';

export const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: 'preset_street_trench',
    title: 'Casual Street Style en Madrid',
    category: 'Streetwear / Otoño',
    description:
      'Fotografía callejera inspirada en Pinterest: abrigo sastre color camel cruzado sobre cuello vuelto antracita, pantalones rectos y postura relajada caminando.',
    imageUrl: RASTER_PNG_STREET_OUTFIT,
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
    imageUrl: RASTER_PNG_CAFE_LIFESTYLE,
    suggestedShotType: 'half_body',
    suggestedExpression: 'concentration',
    suggestedGlasses: 'on',
    defaultSceneText:
      'Diego sentado en una mesa redonda junto a la ventana de una cafetería de arquitectura en Barcelona. Revisa bocetos en su cuaderno con el reloj Bauhaus visible y las gafas metálicas redondas puestas.',
  },
];
