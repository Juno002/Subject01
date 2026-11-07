import {
  RasterValidationResult,
  validateRasterBytes,
  decodeBase64ToBytes,
} from './rasterValidation';
import { GenerationErrorCategory } from './types';

export interface GenerateCandidateRequestParams {
  productionPrompt?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '4:5' | string;
  faceMasterBase64?: string;
  clothingColor?: string;
  shotType?: string;
  glasses?: string;
  sceneDescription?: string;
  expression?: string;
}

export interface GenerateCandidateServiceResult {
  success: boolean;
  httpStatus: number;
  status: 'SUCCESS' | 'FAILED';
  imageUrl?: string;
  mimeType?: 'image/png' | 'image/jpeg';
  modelUsed?: string;
  aspectRatio?: string;
  requestedAspectRatio?: string;
  errorCategory?: GenerationErrorCategory | string;
  error?: string;
}

export interface ImageGenerationModelClient {
  models: {
    generateContent: (params: {
      model: string;
      contents: { parts: any[] };
      config?: {
        imageConfig?: {
          aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
        };
      };
    }) => Promise<any>;
  };
}

export interface GenerateCandidateDeps {
  aiClient: ImageGenerationModelClient | null;
  getCanonicalAssetBuffer?: (assetId: string) => Uint8Array | null;
}

/**
 * Maps requested aspect ratio to supported model aspect ratios:
 * Supported: "1:1", "3:4", "4:3", "9:16", "16:9"
 */
export function translateAspectRatio(
  aspectRatio: string = '1:1'
): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' {
  if (aspectRatio === '4:5' || aspectRatio === '3:4') return '3:4';
  if (aspectRatio === '9:16') return '9:16';
  if (aspectRatio === '16:9') return '16:9';
  if (aspectRatio === '4:3') return '4:3';
  return '1:1';
}

/**
 * Categorizes errors thrown during image model generation.
 */
export function categorizeModelError(err: any): {
  category: GenerationErrorCategory;
  httpStatus: number;
  message: string;
} {
  const errMsg = err?.message || String(err);
  const statusStr = String(err?.status || err?.code || '');

  // 1. Quota Exhaustion (429)
  if (
    errMsg.includes('429') ||
    errMsg.includes('quota') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    statusStr === '429' ||
    statusStr === 'RESOURCE_EXHAUSTED'
  ) {
    return {
      category: 'QUOTA_EXCEEDED',
      httpStatus: 429,
      message:
        'Límite de cuota del modelo de imagen alcanzado (429 RESOURCE_EXHAUSTED). Se requiere una clave con cuota disponible o facturación activa.',
    };
  }

  // 2. Authentication Failure (401 / 403 / API Key)
  if (
    errMsg.includes('API key') ||
    errMsg.includes('API_KEY_INVALID') ||
    errMsg.includes('PERMISSION_DENIED') ||
    errMsg.includes('unauthorized') ||
    errMsg.includes('401') ||
    errMsg.includes('403') ||
    statusStr === '401' ||
    statusStr === '403'
  ) {
    return {
      category: 'AUTH_FAILURE',
      httpStatus: 401,
      message:
        'Fallo de autenticación con la API de Gemini. Verifique la validez de la clave GEMINI_API_KEY.',
    };
  }

  // 3. Model Unavailable / Invalid Model
  if (
    errMsg.includes('not found') ||
    errMsg.includes('is not supported') ||
    errMsg.includes('NOT_FOUND') ||
    errMsg.includes('unknown model') ||
    statusStr === '404'
  ) {
    return {
      category: 'MODEL_UNAVAILABLE',
      httpStatus: 502,
      message:
        'El modelo de generación de imagen especificado no está disponible o no es compatible con la clave actual.',
    };
  }

  // 4. Network Failure / Timeout
  if (
    errMsg.includes('ENOTFOUND') ||
    errMsg.includes('ECONNREFUSED') ||
    errMsg.includes('ETIMEDOUT') ||
    errMsg.includes('fetch failed') ||
    errMsg.includes('network') ||
    errMsg.includes('timeout')
  ) {
    return {
      category: 'NETWORK_FAILURE',
      httpStatus: 504,
      message: 'Fallo de red o tiempo de espera agotado al conectar con el servicio de IA.',
    };
  }

  // 5. Default Unexpected Model Response
  return {
    category: 'UNEXPECTED_RESPONSE',
    httpStatus: 500,
    message: `Respuesta inesperada del servicio de IA: ${errMsg}`,
  };
}

/**
 * Core image generation executor complying strictly with S01-FIX-002:
 * - Real raster generation or explicit failure.
 * - Zero SVG generation or fallback.
 * - Byte validation for PNG and JPEG signatures.
 */
export async function executeCandidateGeneration(
  params: GenerateCandidateRequestParams,
  deps: GenerateCandidateDeps
): Promise<GenerateCandidateServiceResult> {
  const {
    productionPrompt,
    aspectRatio = '1:1',
    faceMasterBase64,
    glasses = 'on',
  } = params;

  // 1. Mandatory prompt validation
  if (!productionPrompt || !productionPrompt.trim()) {
    return {
      success: false,
      httpStatus: 400,
      status: 'FAILED',
      errorCategory: 'UNEXPECTED_RESPONSE',
      error: 'Falta el prompt de producción requerido para la generación.',
    };
  }

  // 2. Mandatory canonical reference validation (01_FACE_MASTER must be accessible)
  let faceMasterBytes: Uint8Array | null = null;
  if (deps.getCanonicalAssetBuffer) {
    faceMasterBytes = deps.getCanonicalAssetBuffer('01_FACE_MASTER');
  }

  if (!faceMasterBytes && faceMasterBase64) {
    try {
      const decoded = decodeBase64ToBytes(faceMasterBase64);
      const validation = validateRasterBytes(decoded.bytes, decoded.declaredMime);
      if (validation.isValid && validation.format === 'PNG') {
        faceMasterBytes = decoded.bytes;
      }
    } catch {
      faceMasterBytes = null;
    }
  }

  if (!faceMasterBytes) {
    return {
      success: false,
      httpStatus: 400,
      status: 'FAILED',
      errorCategory: 'MISSING_MANDATORY_REFERENCE',
      error:
        'Falta la referencia maestra obligatoria 01_FACE_MASTER o no se encuentra en formato PNG canónico.',
    };
  }

  // 3. API Client validation
  if (!deps.aiClient) {
    return {
      success: false,
      httpStatus: 503,
      status: 'FAILED',
      errorCategory: 'MISSING_API_KEY',
      error:
        'Clave de API de Gemini no configurada en el entorno (GEMINI_API_KEY). Configure la clave en la sección Secrets.',
    };
  }

  const targetRatio = translateAspectRatio(aspectRatio);

  // 4. Build multimodal parts
  const parts: any[] = [];

  // Face master PNG bytes
  let faceBase64String: string;
  if (typeof Buffer !== 'undefined') {
    faceBase64String = Buffer.from(faceMasterBytes).toString('base64');
  } else {
    faceBase64String = btoa(String.fromCharCode(...faceMasterBytes));
  }

  parts.push({
    inlineData: {
      mimeType: 'image/png',
      data: faceBase64String,
    },
  });

  // Accessories master if glasses enabled
  if (glasses !== 'off' && deps.getCanonicalAssetBuffer) {
    const accBytes = deps.getCanonicalAssetBuffer('03_ACCESSORIES_MASTER');
    if (accBytes) {
      const accBase64 =
        typeof Buffer !== 'undefined'
          ? Buffer.from(accBytes).toString('base64')
          : btoa(String.fromCharCode(...accBytes));
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: accBase64,
        },
      });
    }
  }

  // Expressions master
  if (deps.getCanonicalAssetBuffer) {
    const expBytes = deps.getCanonicalAssetBuffer('04_EXPRESSIONS_MASTER');
    if (expBytes) {
      const expBase64 =
        typeof Buffer !== 'undefined'
          ? Buffer.from(expBytes).toString('base64')
          : btoa(String.fromCharCode(...expBytes));
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: expBase64,
        },
      });
    }
  }

  // Prompt directive
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

  // 5. Model call
  let response: any;
  try {
    response = await deps.aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: targetRatio,
        },
      },
    });
  } catch (modelError: any) {
    const categorized = categorizeModelError(modelError);
    return {
      success: false,
      httpStatus: categorized.httpStatus,
      status: 'FAILED',
      errorCategory: categorized.category,
      error: categorized.message,
    };
  }

  // 6. Inspect model candidates
  const candidates = response?.candidates;
  if (!candidates || candidates.length === 0) {
    return {
      success: false,
      httpStatus: 502,
      status: 'FAILED',
      errorCategory: 'NO_IMAGE_RETURNED',
      error: 'El modelo no retornó ningún candidato de imagen en la respuesta.',
    };
  }

  const responseParts = candidates[0]?.content?.parts ?? [];
  let foundImagePart: any = null;
  let textExplanation: string = '';

  for (const part of responseParts) {
    if (part?.inlineData?.data) {
      foundImagePart = part;
      break;
    }
    if (part?.text) {
      textExplanation += part.text + ' ';
    }
  }

  if (!foundImagePart) {
    return {
      success: false,
      httpStatus: 502,
      status: 'FAILED',
      errorCategory: 'NO_IMAGE_RETURNED',
      error:
        'El modelo retornó texto pero ninguna imagen válida en la respuesta: ' +
        (textExplanation.trim() || 'Sin datos de imagen'),
    };
  }

  // 7. Rigorous binary raster validation of model output
  const rawBase64 = foundImagePart.inlineData.data;
  const claimedMime = foundImagePart.inlineData.mimeType;

  let imageBytes: Uint8Array;
  try {
    const decoded = decodeBase64ToBytes(rawBase64);
    imageBytes = decoded.bytes;
  } catch (decodeErr: any) {
    return {
      success: false,
      httpStatus: 502,
      status: 'FAILED',
      errorCategory: 'INVALID_IMAGE_BYTES',
      error: 'Los datos retornados por el modelo no tienen una codificación base64 válida.',
    };
  }

  const validation: RasterValidationResult = validateRasterBytes(imageBytes, claimedMime);

  if (!validation.isValid) {
    return {
      success: false,
      httpStatus: 502,
      status: 'FAILED',
      errorCategory: validation.errorCategory || 'UNSUPPORTED_FORMAT',
      error:
        validation.errorMessage ||
        'La imagen retornada no cumple con la política de formato ráster auténtico (PNG o JPEG).',
    };
  }

  // 8. Strict Success — preserve the actual verified raster MIME type!
  const actualMime = validation.mimeType || (validation.format === 'PNG' ? 'image/png' : 'image/jpeg');

  return {
    success: true,
    httpStatus: 200,
    status: 'SUCCESS',
    imageUrl: `data:${actualMime};base64,${rawBase64}`,
    mimeType: actualMime,
    modelUsed: 'gemini-3.1-flash-lite-image',
    aspectRatio: targetRatio,
    requestedAspectRatio: aspectRatio,
  };
}
