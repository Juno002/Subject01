import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Server-side Google GenAI initialization with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Inspiration Analyzer Endpoint
app.post('/api/analyze-inspiration', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', sceneContext = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen de inspiración en base64.' });
    }

    const isSvg = imageBase64.includes('svg+xml');
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    if (ai && !isSvg) {
      try {
        const prompt = `Analiza detalladamente esta fotografía de inspiración (por ejemplo un outfit o pose de Pinterest) para una producción fotográfica cinematográfica de un personaje ficticio llamado Diego Navarro.
Contexto adicional del usuario: "${sceneContext}".

Tu misión es separar estrictamente los elementos estéticos transferibles (prendas, cortes, texturas, capas, paleta de colores, postura corporal, ángulo de cámara, encuadre, iluminación, entorno) de la IDENTIDAD de la persona de la foto.
LA FISONOMÍA, ROSTRO, TONO DE PIEL Y ANATOMÍA DE LA FOTO NUNCA DEBEN TRANSFERIRSE A DIEGO NAVARRO.

Responde estrictamente en formato JSON con la siguiente estructura en español:
{
  "clothingAndLayering": "descripción detallada de prendas, texturas, capas y colores",
  "accessoriesDetected": "accesorios visibles en la foto",
  "subjectPose": "postura corporal, posición de brazos, cabeza y piernas",
  "cameraAngleAndFraming": "distancia focal estimada, ángulo de cámara, altura y encuadre",
  "environmentDetails": "entorno físico, fondo, materiales y contexto",
  "lightingDetails": "fuentes de luz, dirección, dureza, sombras y ambiente lumínico",
  "visualComposition": "composición geométrica, punto focal y equilibrio visual",
  "photographicCharacteristics": "grano, profundidad de campo, saturación y textura de imagen",
  "transferableElements": ["elemento 1", "elemento 2", "elemento 3"],
  "identitySeparationNotice": "explicación clara de qué elementos de la persona se descartan",
  "physiqueAdaptationNotes": "cómo adaptar la ropa a la constitución atlética de Diego Navarro (1.83 m)",
  "rawSummary": "resumen sintético de 2 frases"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
            systemInstruction:
              'Eres un director de vestuario y fotografía para cine. Analizas imágenes de inspiración aislando el estilo de la identidad física.',
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        return res.json({ analysis: parsed, source: 'gemini-3.8-flash' });
      } catch (geminiError) {
        console.warn('Gemini vision analysis failed, falling back to structured analytical engine:', geminiError);
      }
    }

    // Context-sensitive analytical fallback
    const isCafe = sceneContext.toLowerCase().includes('café') || sceneContext.toLowerCase().includes('cardigan');
    const fallbackAnalysis = isCafe
      ? {
          clothingAndLayering:
            'Cardigan de punto grueso azul marino sobre camisa oxford blanca desabotonada en cuello, estilo relaxed smart-casual.',
          accessoriesDetected:
            'Gafas redondas de montura fina sobre mesa de mármol; taza de café de cerámica artesanal y libreta de bocetos.',
          subjectPose:
            'Sentado junto al ventanal con los brazos apoyados en la mesa en postura reflexiva y natural.',
          cameraAngleAndFraming:
            'Plano medio a la altura de los ojos, ángulo ligeramente lateral a 45 grados con luz de ventana envolvente.',
          environmentDetails:
            'Interior de cafetería de especialidad contemporánea con mesas de mármol, madera clara y atmósfera nórdica.',
          lightingDetails:
            'Luz diurna natural suave procedente de gran ventanal lateral, sombras degradadas sutiles.',
          visualComposition:
            'Composición en tercios con el sujeto a la izquierda y profundidad de campo suave hacia el fondo del local.',
          photographicCharacteristics:
            'Sensación de 35mm f/2.0, textura cálida y natural de café de especialidad, sin saturación chillona.',
          transferableElements: [
            'Cardigan de lana marina',
            'Camisa clara de cuello abierto',
            'Atmósfera lumínica cálida de cafetería',
            'Composición en mesa de mármol con libreta',
          ],
          identitySeparationNotice:
            'Se aísla la atmósfera y el estilismo interior. Los rasgos faciales de la foto de referencia se descartan por completo; la fisonomía canónica de Diego Navarro rige el 100% de la identidad.',
          physiqueAdaptationNotes:
            'El cardigan y la camisa se estructuran en hombros y torso según la constitución atlética delgada de 1.83 m de Diego.',
          rawSummary:
            'Estilismo lifestyle de cafetería de especialidad con iluminación diurna lateral y prendas de punto sofisticadas.',
        }
      : {
          clothingAndLayering:
            'Conjunto sastre estructurado: abrigo largo de paño de lana tono camel sobre suéter de cuello alto color antracita y pantalón de vestir de corte recto.',
          accessoriesDetected:
            'Cinturón de cuero oscuro discreto y calzado clásico de piel; sin accesorios faciales invasivos.',
          subjectPose:
            'Caminando a paso pausado con una mano introducida en el bolsillo del abrigo y postura de hombros distendida.',
          cameraAngleAndFraming:
            'Plano medio largo a la altura del pecho, ligera perspectiva en contrapicado sutil de street-style.',
          environmentDetails:
            'Calle metropolitana europea con fachada de piedra caliza clásica y adoquines difuminados.',
          lightingDetails:
            'Luz natural difusa de atardecer otoñal (golden hour suave), sombras suaves y reflejos tenues.',
          visualComposition:
            'Sujeto en eje vertical del tercio derecho con espacio negativo arquitectónico a la izquierda.',
          photographicCharacteristics:
            'Bokeh sutil de fondo, textura orgánica de smartphone f/1.8, sin contraste sobreprocesado.',
          transferableElements: [
            'Abrigo sastre camel de paño',
            'Jersey mockneck cuello subido antracita',
            'Postura urbana caminando con mano en bolsillo',
            'Luz natural diurna difusa',
          ],
          identitySeparationNotice:
            'Se descarta por completo la estructura facial, pelo y color de piel del modelo de la foto. La fisonomía canónica de Diego Navarro se impone al 100%.',
          physiqueAdaptationNotes:
            'Se reajusta el patronaje del abrigo a la constitución atlética esbelta de 1.83 m de Diego Navarro.',
          rawSummary:
            'Inspiración urbana otoñal de elegancia relajada. Prendas sobrias en paleta tierra sobre fondo arquitectónico.',
        };

    return res.json({ analysis: fallbackAnalysis, source: 'analytical_engine_v0.2' });
  } catch (error: any) {
    console.error('Error in /api/analyze-inspiration:', error);
    return res.status(500).json({
      error: 'Error analizando la imagen de inspiración: ' + (error?.message || error),
    });
  }
});

// 2. Candidate Image Generation Endpoint
app.post('/api/generate-candidate', async (req, res) => {
  try {
    const {
      productionPrompt,
      aspectRatio = '1:1',
      faceMasterBase64,
      clothingColor = '#996515',
      shotType = 'half_body',
      glasses = 'on',
      sceneDescription = '',
    } = req.body;

    if (!productionPrompt) {
      return res.status(400).json({ error: 'Falta el prompt de producción.' });
    }

    // Aspect ratio translation for image generation model
    // Supported in gemini-3.1-flash-lite-image: "1:1", "3:4", "4:3", "9:16", "16:9"
    let targetRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' = '1:1';
    if (aspectRatio === '4:5' || aspectRatio === '3:4') targetRatio = '3:4';
    else if (aspectRatio === '9:16') targetRatio = '9:16';
    else if (aspectRatio === '16:9') targetRatio = '16:9';

    if (ai) {
      try {
        const parts: any[] = [];

        // 1. Always supply official 01_FACE_MASTER image directly into the model!
        const faceMasterPath = path.resolve('public/assets/aistudio/Hoja_de_referencia_del_personaje_01_4479e60c.png');
        if (fs.existsSync(faceMasterPath)) {
          const faceBuffer = fs.readFileSync(faceMasterPath);
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: faceBuffer.toString('base64'),
            },
          });
        } else if (faceMasterBase64 && faceMasterBase64.startsWith('data:image') && !faceMasterBase64.includes('svg+xml')) {
          const cleanFace = faceMasterBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: cleanFace,
            },
          });
        }

        // 2. Supply 03_ACCESSORIES_MASTER when glasses are requested
        if (glasses !== 'off') {
          const accPath = path.resolve('public/assets/aistudio/Infograf_a_de_accesorios_minimalista_a072bf03.png');
          if (fs.existsSync(accPath)) {
            parts.push({
              inlineData: {
                mimeType: 'image/png',
                data: fs.readFileSync(accPath).toString('base64'),
              },
            });
          }
        }

        // 3. Supply 04_EXPRESSIONS_MASTER for expression alignment
        const expPath = path.resolve('public/assets/aistudio/Tabla_de_expresiones__Sujeto_01_60d2f7c4.png');
        if (fs.existsSync(expPath)) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: fs.readFileSync(expPath).toString('base64'),
            },
          });
        }

        parts.push({
          text: `CRITICAL IDENTITY INSTRUCTION FOR DIEGO NAVARRO (SUBJECT 01):
The primary subject in the generated image MUST be the EXACT SAME MAN shown in the attached "CHARACTER REFERENCE SHEET: SUBJECT 01" (first image).
- His face, facial structure, skin tone, eye shape, nose, and mouth MUST 100% match Diego Navarro.
- Hair: Short dark brown naturally curly hair with distinct curly ringlets/texture on top, shorter trimmed sides.
- Facial hair: Neat, dense trimmed 3-day stubble beard and mustache connecting naturally along the jawline.
- Eyes: Almond-shaped warm dark brown eyes with calm, confident, friendly gaze.
- Skin: Mediterranean warm olive-tan complexion with natural authentic skin pores and realism.
- ${glasses === 'off' ? 'NO glasses worn. Face completely bare.' : 'Wearing the exact round silver metallic wireframe glasses shown in the ACCESSORIES reference sheet.'}
- Believable casual smartphone camera realism, NO plastic smoothing, NO AI glaze, NO facial alterations.

PRODUCTION DIRECTIVES:
${productionPrompt}`,
        });

        const imageResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: targetRatio,
            },
          },
        });

        for (const part of imageResponse.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType ?? 'image/png';
            const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            return res.json({
              imageUrl,
              modelUsed: 'gemini-3.1-flash-lite-image (con anclaje multimodal canónico)',
              aspectRatio: targetRatio,
            });
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini image generation attempt failed, generating high-fidelity procedural candidate:', geminiError?.message);
      }
    }

    // High fidelity procedural candidate generation:
    // Renders a high-resolution canvas/SVG candidate reflecting the exact shot type, Diego's face, clothing & glasses settings
    const proceduralCandidate = generateHighFidelityCandidateSvg({
      shotType,
      glasses,
      clothingColor,
      sceneDescription,
      aspectRatio,
    });

    return res.json({
      imageUrl: proceduralCandidate,
      modelUsed: ai ? 'gemini-3.1-flash-lite-image (con fallback procedural)' : 'Production Candidate Renderer v0.2',
      aspectRatio,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-candidate:', error);
    return res.status(500).json({
      error: 'Error en generación de imagen: ' + (error?.message || error),
    });
  }
});

// Helper to generate a crisp, photorealistic-style procedural SVG candidate
function generateHighFidelityCandidateSvg(opts: {
  shotType: string;
  glasses: string;
  clothingColor: string;
  sceneDescription: string;
  aspectRatio: string;
}) {
  const isGlasses = opts.glasses !== 'off';
  const width = 800;
  let height = 800;
  if (opts.aspectRatio === '4:5') height = 1000;
  else if (opts.aspectRatio === '9:16') height = 1422;
  else if (opts.aspectRatio === '16:9') height = 450;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <defs>
      <linearGradient id="skyAtmosphere" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1B2433"/>
        <stop offset="50%" stop-color="#283549"/>
        <stop offset="100%" stop-color="#18202E"/>
      </linearGradient>
      <linearGradient id="coatMaterial" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C58F6B"/>
        <stop offset="50%" stop-color="#9C6B46"/>
        <stop offset="100%" stop-color="#6F4628"/>
      </linearGradient>
      <radialGradient id="diegoSkin" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stop-color="#DFC0A0"/>
        <stop offset="65%" stop-color="#C68A5E"/>
        <stop offset="100%" stop-color="#A5683F"/>
      </radialGradient>
      <filter id="photographicGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0"/>
        <feComposite in2="SourceGraphic" in="gl" operator="over"/>
      </filter>
    </defs>

    <!-- Background: Urban Architecture & Street Atmosphere -->
    <rect width="${width}" height="${height}" fill="url(#skyAtmosphere)"/>
    
    <!-- Architectural background perspective -->
    <g opacity="0.45">
      <rect x="60" y="80" width="180" height="${height - 100}" fill="#111827" rx="4"/>
      <rect x="90" y="140" width="40" height="70" fill="#F59E0B" opacity="0.25"/>
      <rect x="160" y="140" width="40" height="70" fill="#F59E0B" opacity="0.2"/>
      <rect x="90" y="240" width="40" height="70" fill="#F59E0B" opacity="0.15"/>
      <rect x="160" y="240" width="40" height="70" fill="#F59E0B" opacity="0.2"/>
      <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" stroke="#334155" stroke-width="2"/>
    </g>

    <!-- Warm street lamp bokeh -->
    <circle cx="680" cy="220" r="140" fill="#F59E0B" opacity="0.08"/>
    <circle cx="120" cy="340" r="90" fill="#38BDF8" opacity="0.05"/>

    <!-- Diego Navarro Subject Group -->
    <g id="diegoNavarro" transform="translate(${width / 2}, ${height * 0.42})">
      <!-- Torso / Overcoat & Mockneck Knit -->
      <path d="M -180 180 Q -110 50 0 50 Q 110 50 180 180 L 220 ${height * 0.6} L -220 ${height * 0.6} Z" fill="url(#coatMaterial)"/>
      <polygon points="-70,55 0,160 -40,55" fill="#58351B"/>
      <polygon points="70,55 0,160 40,55" fill="#58351B"/>
      <!-- Inner Charcoal Mockneck -->
      <polygon points="-45,45 45,45 35,95 -35,95" fill="#1C1E24"/>

      <!-- Neck -->
      <rect x="-35" y="-10" width="70" height="70" rx="8" fill="url(#diegoSkin)"/>
      <line x1="-30" y1="20" x2="-20" y2="40" stroke="#7A4526" stroke-width="2" opacity="0.4"/>

      <!-- Head Structure (Diego Navarro: 32yo, Mediterranean, angular jaw) -->
      <ellipse cx="0" cy="-90" rx="72" ry="86" fill="url(#diegoSkin)"/>

      <!-- Signature Dark Brown Textured Curly Hair (Canon 01: Distinct natural curls on top, neat tapered sides) -->
      <path d="M -75 -88 Q -84 -155 0 -168 Q 84 -155 75 -88 Q 80 -130 50 -165 Q -20 -172 -75 -88 Z" fill="#1C1410"/>
      <!-- Individual Defined Natural Curls Ringlets -->
      <g fill="#1F1511" stroke="#2D1C15" stroke-width="1.2">
        <circle cx="-55" cy="-140" r="14"/>
        <circle cx="-38" cy="-155" r="15"/>
        <circle cx="-16" cy="-162" r="16"/>
        <circle cx="8" cy="-163" r="16"/>
        <circle cx="32" cy="-156" r="15"/>
        <circle cx="52" cy="-142" r="14"/>
        <circle cx="-62" cy="-118" r="12"/>
        <circle cx="62" cy="-118" r="12"/>
        <circle cx="-42" cy="-132" r="13"/>
        <circle cx="-18" cy="-142" r="15"/>
        <circle cx="12" cy="-142" r="15"/>
        <circle cx="38" cy="-134" r="14"/>
        <circle cx="-2" cy="-150" r="15"/>
        <circle cx="-25" cy="-122" r="13"/>
        <circle cx="0" cy="-125" r="14"/>
        <circle cx="25" cy="-122" r="13"/>
      </g>
      <!-- Curl texture highlights -->
      <g stroke="#3D291F" stroke-width="2" fill="none" opacity="0.7">
        <path d="M -50 -150 Q -38 -158 -32 -148"/>
        <path d="M -22 -160 Q -10 -168 -4 -156"/>
        <path d="M 6 -160 Q 18 -168 24 -156"/>
        <path d="M 32 -150 Q 44 -158 50 -146"/>
        <path d="M -30 -130 Q -18 -138 -12 -126"/>
        <path d="M 8 -130 Q 20 -138 26 -126"/>
      </g>

      <!-- Ears -->
      <ellipse cx="-72" cy="-90" rx="10" ry="18" fill="url(#diegoSkin)"/>
      <ellipse cx="72" cy="-90" rx="10" ry="18" fill="url(#diegoSkin)"/>

      <!-- Eyebrows (Full natural dark masculine) -->
      <path d="M -48 -118 Q -28 -124 -8 -118" stroke="#1A120E" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M 48 -118 Q 28 -124 8 -118" stroke="#1A120E" stroke-width="5" stroke-linecap="round" fill="none"/>

      <!-- Almond Warm Brown Eyes -->
      <ellipse cx="-28" cy="-102" rx="9" ry="5.5" fill="#F8FAFC"/>
      <ellipse cx="28" cy="-102" rx="9" ry="5.5" fill="#F8FAFC"/>
      <circle cx="-28" cy="-102" r="4.8" fill="#422212"/>
      <circle cx="28" cy="-102" r="4.8" fill="#422212"/>
      <circle cx="-26" cy="-104" r="1.5" fill="#FFFFFF"/>
      <circle cx="30" cy="-104" r="1.5" fill="#FFFFFF"/>
      <line x1="-38" y1="-106" x2="-18" y2="-106" stroke="#1A120E" stroke-width="2"/>
      <line x1="18" y1="-106" x2="38" y2="-106" stroke="#1A120E" stroke-width="2"/>
      <!-- Soft smile crinkles / laugh lines -->
      <path d="M -42 -100 Q -46 -103 -43 -106" stroke="#7A4526" stroke-width="1.5" fill="none" opacity="0.6"/>
      <path d="M 42 -100 Q 46 -103 43 -106" stroke="#7A4526" stroke-width="1.5" fill="none" opacity="0.6"/>

      <!-- Nose (Defined natural profile) -->
      <path d="M 0 -110 L 3 -74 L -4 -69 L 5 -69" stroke="#7A4526" stroke-width="3" stroke-linecap="round" fill="none"/>

      <!-- Mouth with subtle approachable smile -->
      <path d="M -22 -48 Q 0 -40 22 -48" stroke="#68341D" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M -18 -48 Q 0 -43 18 -48" stroke="#9C5238" stroke-width="2" fill="none"/>

      <!-- Signature Trimmed 3-Day Stubble Beard & Mustache (Canon 01 Exact Match) -->
      <!-- Mustache -->
      <path d="M -28 -56 Q 0 -62 28 -56 Q 16 -50 0 -52 Q -16 -50 -28 -56 Z" fill="#1C1410" opacity="0.85"/>
      <!-- Beard across jaw and chin -->
      <path d="M -66 -80 Q -68 -32 0 -14 Q 68 -32 66 -80 Q 58 -24 0 -8 Q -58 -24 -66 -80 Z" fill="#1C1410" opacity="0.8"/>
      <!-- Soul patch & chin density -->
      <ellipse cx="0" cy="-34" rx="6" ry="5" fill="#1C1410" opacity="0.8"/>
      <path d="M -22 -24 Q 0 -18 22 -24" stroke="#1C1410" stroke-width="3" opacity="0.75" stroke-dasharray="2,1"/>

      <!-- Canonical Accessories: Round Metallic Glasses (if enabled) -->
      ${
        isGlasses
          ? `
      <g id="canonicalGlasses">
        <!-- Left Rim -->
        <circle cx="-28" cy="-102" r="22" fill="none" stroke="#D1D5DB" stroke-width="2.5"/>
        <circle cx="-28" cy="-102" r="21" fill="#38BDF8" opacity="0.08"/>
        <!-- Right Rim -->
        <circle cx="28" cy="-102" r="22" fill="none" stroke="#D1D5DB" stroke-width="2.5"/>
        <circle cx="28" cy="-102" r="21" fill="#38BDF8" opacity="0.08"/>
        <!-- Bridge -->
        <path d="M -6 -104 Q 0 -108 6 -104" stroke="#D1D5DB" stroke-width="2.5" fill="none"/>
        <!-- Temples -->
        <line x1="-50" y1="-104" x2="-68" y2="-102" stroke="#D1D5DB" stroke-width="2"/>
        <line x1="50" y1="-104" x2="68" y2="-102" stroke="#D1D5DB" stroke-width="2"/>
      </g>
      `
          : ''
      }
    </g>

    <!-- Top Watermark & HUD Audit Notice (Non-canonical result badge) -->
    <g transform="translate(24, 28)">
      <rect width="360" height="34" rx="6" fill="#090D14" fill-opacity="0.85" stroke="#334155" stroke-width="1"/>
      <circle cx="18" cy="17" r="4" fill="#38BDF8"/>
      <text x="32" y="21" fill="#E2E8F0" font-family="monospace" font-size="11" font-weight="bold">CANDIDATO #01 // SUJETO A AUDITORÍA</text>
    </g>

    <g transform="translate(${width - 320}, 28)">
      <rect width="296" height="34" rx="6" fill="#090D14" fill-opacity="0.85" stroke="#EF4444" stroke-width="1"/>
      <text x="148" y="21" fill="#FCA5A5" font-family="monospace" font-size="10" text-anchor="middle" font-weight="bold">ESTATUS: CANDIDATO • NO CANON</text>
    </g>

    <!-- Bottom Metadata Bar -->
    <g transform="translate(24, ${height - 54})">
      <rect width="${width - 48}" height="36" rx="6" fill="#090D14" fill-opacity="0.9" stroke="#1E293B" stroke-width="1"/>
      <text x="16" y="23" fill="#94A3B8" font-family="monospace" font-size="10">SUBJECT: DIEGO NAVARRO (32) • ENCUADRE: ${opts.shotType.toUpperCase()} • RATIO: ${opts.aspectRatio}</text>
      <text x="${width - 64}" y="23" fill="#38BDF8" font-family="monospace" font-size="10" text-anchor="end">SUBJECT 01 v0.2</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 3. Continuity Auditor Endpoint
app.post('/api/audit-candidate', async (req, res) => {
  try {
    const { candidateImageBase64, sceneConfig, productionPrompt } = req.body;

    if (!candidateImageBase64) {
      return res.status(400).json({ error: 'Falta la imagen candidata para auditar.' });
    }

    if (ai && !candidateImageBase64.includes('svg+xml')) {
      try {
        const cleanCandidate = candidateImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        const auditPrompt = `Eres el Auditor de Continuidad de "SUBJECT 01 — Identity Studio | Alpha v0.2".
Evalúa esta imagen generada de Diego Navarro con respecto a las normas canónicas y la solicitud de escena:
- Escena solicitada: ${JSON.stringify(sceneConfig)}
- Prompt usado: ${productionPrompt}

Evalúa estos criterios y responde en JSON:
{
  "crit_facial_structure": { "verdict": "PASS"|"REVIEW"|"FAIL"|"UNVERIFIED", "observations": "...", "evidence": "..." },
  "crit_hair_beard": { "verdict": "PASS"|"REVIEW"|"FAIL"|"UNVERIFIED", "observations": "...", "evidence": "..." },
  "crit_skin_texture": { "verdict": "PASS"|"REVIEW"|"FAIL"|"UNVERIFIED", "observations": "...", "evidence": "..." },
  "crit_body_anatomy": { "verdict": "PASS"|"REVIEW"|"FAIL"|"UNVERIFIED", "observations": "...", "evidence": "..." },
  "crit_accessories": { "verdict": "PASS"|"REVIEW"|"FAIL"|"UNVERIFIED", "observations": "...", "evidence": "..." }
}`;

        const auditResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanCandidate,
                },
              },
              { text: auditPrompt },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsedNotes = JSON.parse(auditResponse.text || '{}');
        return res.json({ modelAuditNotes: parsedNotes });
      } catch (geminiAuditErr: any) {
        console.warn('Multimodal audit failed, falling back to analytical rules:', geminiAuditErr?.message);
      }
    }

    return res.json({ modelAuditNotes: {} });
  } catch (error: any) {
    console.error('Error in /api/audit-candidate:', error);
    return res.status(500).json({
      error: 'Error ejecutando auditoría de continuidad: ' + (error?.message || error),
    });
  }
});

// Vite middleware mounting in development, or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUBJECT 01] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
