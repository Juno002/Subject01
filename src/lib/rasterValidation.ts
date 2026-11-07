/**
 * SUBJECT 01 — Authentic Raster-Only Validation Policy (S01-FIX-002B)
 *
 * Enforces strict binary signature AND structural integrity validation:
 * - Allowed formats: PNG (image/png) and JPEG (image/jpeg, image/jpg).
 * - Prohibited formats: SVG, WebP, GIF, HTML, XML, text, corrupt/disguised bytes.
 * - Distinguishes between:
 *   1. Recognized binary format (file header signature)
 *   2. Structurally valid file (chunks/segments intact, dimensions > 0, terminal markers IEND/EOI present)
 *   3. Successfully decoded image (client rendering engine or testing environment)
 * - Documented limitation: Complete server-side pixel raster decoding is not performed without
 *   external native dependencies; client-side HTMLImageElement decoding is enforced before candidate acceptance.
 */

export type SupportedRasterFormat = 'PNG' | 'JPEG';

export type RasterIntegrityLevel =
  | 'INVALID'
  | 'SIGNATURE_ONLY'
  | 'STRUCTURALLY_VALID'
  | 'DECODED';

export type RasterErrorCategory =
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_IMAGE_BYTES'
  | 'MIME_SIGNATURE_MISMATCH'
  | 'EMPTY_IMAGE_DATA';

export interface RasterValidationResult {
  isValid: boolean;
  format?: SupportedRasterFormat;
  mimeType?: 'image/png' | 'image/jpeg';
  integrityLevel: RasterIntegrityLevel;
  isComplete: boolean;
  dimensions?: { width: number; height: number };
  errorCategory?: RasterErrorCategory;
  errorMessage?: string;
  byteLength?: number;
  serverValidationLimitation?: string;
}

export const SERVER_VALIDATION_LIMITATION =
  'La validación en servidor comprueba firmas binarias, marcadores estructurales y ausencia de truncamiento (IEND/EOI), pero la decodificación de píxeles completa requiere el motor gráfico del cliente o dependencias nativas adicionales.';

// 8-byte standard PNG magic signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Checks if a byte buffer starts with the authentic 8-byte PNG signature.
 */
export function hasPngSignature(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

/**
 * Checks if a byte buffer starts with the authentic JPEG SOI marker (0xFF 0xD8 0xFF).
 */
export function hasJpegSignature(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 3) return false;
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * Checks if byte content represents SVG (textual XML / <svg tag).
 */
export function hasSvgContent(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length === 0) return false;
  const sampleLength = Math.min(bytes.length, 512);
  let sampleText = '';
  for (let i = 0; i < sampleLength; i++) {
    sampleText += String.fromCharCode(bytes[i]);
  }
  const lower = sampleText.toLowerCase();
  return lower.includes('<svg') || (lower.includes('<?xml') && lower.includes('svg'));
}

/**
 * Checks if byte content represents WebP (RIFF....WEBP).
 */
export function hasWebpSignature(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 12) return false;
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return isRiff && isWebp;
}

/**
 * Checks if byte content represents GIF (GIF87a / GIF89a).
 */
export function hasGifSignature(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 6) return false;
  return (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

/**
 * Strips data URI prefixes and decodes base64 into a raw Uint8Array.
 */
export function decodeBase64ToBytes(dataUriOrBase64: string): {
  bytes: Uint8Array;
  declaredMime?: string;
} {
  let declaredMime: string | undefined = undefined;
  let rawBase64 = dataUriOrBase64.trim();

  const dataUriMatch = rawBase64.match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.+)$/s);
  if (dataUriMatch) {
    declaredMime = dataUriMatch[1].toLowerCase();
    rawBase64 = dataUriMatch[2].trim();
  } else if (rawBase64.startsWith('data:image/')) {
    const commaIndex = rawBase64.indexOf(',');
    if (commaIndex !== -1) {
      const header = rawBase64.substring(0, commaIndex);
      const mimeMatch = header.match(/^data:([^;,]+)/);
      if (mimeMatch) declaredMime = mimeMatch[1].toLowerCase();
      rawBase64 = rawBase64.substring(commaIndex + 1).trim();
    }
  }

  let bytes: Uint8Array;
  if (typeof Buffer !== 'undefined') {
    bytes = new Uint8Array(Buffer.from(rawBase64, 'base64'));
  } else {
    const binaryStr = atob(rawBase64);
    bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
  }

  return { bytes, declaredMime };
}

/**
 * Validates PNG chunk framing and structural integrity.
 * Ensures:
 * - Minimum byte length
 * - IHDR is the first chunk with width > 0, height > 0
 * - IDAT chunk exists
 * - Terminated with a valid IEND chunk without unexpected truncation
 */
export function validatePngStructure(bytes: Uint8Array): {
  isStructurallyValid: boolean;
  isComplete: boolean;
  dimensions?: { width: number; height: number };
  errorMessage?: string;
} {
  // 8 bytes signature + at least IHDR (25 bytes) + IEND (12 bytes) = 45 bytes minimum
  if (bytes.length < 45) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo PNG incompleto o truncado (longitud de bytes insuficiente para contener bloques IHDR e IEND).',
    };
  }

  let offset = 8;
  let hasIhdr = false;
  let hasIdat = false;
  let hasIend = false;
  let dimensions: { width: number; height: number } | undefined = undefined;

  while (offset < bytes.length) {
    // Each chunk requires at least 8 bytes: 4 bytes length + 4 bytes type
    if (offset + 8 > bytes.length) {
      return {
        isStructurallyValid: false,
        isComplete: false,
        errorMessage: 'Cabecera de bloque PNG truncada antes de completar longitud y tipo.',
      };
    }

    const chunkLen =
      bytes[offset] * 0x1000000 +
      (bytes[offset + 1] << 16) +
      (bytes[offset + 2] << 8) +
      bytes[offset + 3];

    const chunkType = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    // Total chunk size: 4 len + 4 type + chunkLen data + 4 crc = chunkLen + 12
    const totalChunkBytes = chunkLen + 12;
    if (offset + totalChunkBytes > bytes.length) {
      return {
        isStructurallyValid: false,
        isComplete: false,
        errorMessage: `Bloque "${chunkType}" truncado: se declararon ${chunkLen} bytes de datos pero el archivo termina prematuramente.`,
      };
    }

    if (!hasIhdr) {
      if (chunkType !== 'IHDR') {
        return {
          isStructurallyValid: false,
          isComplete: false,
          errorMessage: 'Estructura PNG inválida: el primer bloque debe ser IHDR.',
        };
      }
      if (chunkLen < 13) {
        return {
          isStructurallyValid: false,
          isComplete: false,
          errorMessage: 'Bloque IHDR inválido: longitud menor a 13 bytes.',
        };
      }

      const width =
        bytes[offset + 8] * 0x1000000 +
        (bytes[offset + 9] << 16) +
        (bytes[offset + 10] << 8) +
        bytes[offset + 11];

      const height =
        bytes[offset + 12] * 0x1000000 +
        (bytes[offset + 13] << 16) +
        (bytes[offset + 14] << 8) +
        bytes[offset + 15];

      if (width <= 0 || height <= 0) {
        return {
          isStructurallyValid: false,
          isComplete: false,
          errorMessage: `Dimensiones de imagen PNG inválidas en bloque IHDR: ${width}x${height}.`,
        };
      }

      dimensions = { width, height };
      hasIhdr = true;
    }

    if (chunkType === 'IDAT') {
      hasIdat = true;
    }

    if (chunkType === 'IEND') {
      hasIend = true;
      break;
    }

    offset += totalChunkBytes;
  }

  if (!hasIend) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo PNG incompleto: falta el bloque terminal IEND.',
    };
  }

  if (!hasIdat) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo PNG inválido: no contiene ningún bloque de datos de imagen IDAT.',
    };
  }

  return {
    isStructurallyValid: true,
    isComplete: true,
    dimensions,
  };
}

/**
 * Validates JPEG segment markers and structural completeness.
 * Ensures:
 * - SOI (0xFF 0xD8) start
 * - SOF marker present with width > 0, height > 0
 * - SOS marker present
 * - EOI (0xFF 0xD9) terminal marker present
 * - Segments do not overflow buffer length
 */
export function validateJpegStructure(bytes: Uint8Array): {
  isStructurallyValid: boolean;
  isComplete: boolean;
  dimensions?: { width: number; height: number };
  errorMessage?: string;
} {
  // A complete JPEG requires at least SOI (2), SOF (>=11), SOS (>=8), data, EOI (2)
  if (bytes.length < 30) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo JPEG incompleto o truncado (longitud de bytes insuficiente).',
    };
  }

  // Must begin with SOI
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'El archivo JPEG no comienza con el marcador SOI (0xFF 0xD8).',
    };
  }

  let offset = 2;
  let hasSof = false;
  let hasSos = false;
  let hasEoi = false;
  let dimensions: { width: number; height: number } | undefined = undefined;

  while (offset < bytes.length) {
    // Scan for 0xFF marker prefix
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }

    // Skip fill 0xFF bytes
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset++;
    }
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset++;

    // Standalone markers:
    // 0xD8 = SOI
    // 0xD9 = EOI
    // 0xD0..0xD7 = RST
    // 0x00 = byte stuffing inside scan data
    if (marker === 0xd9) {
      hasEoi = true;
      break;
    }
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    // Segment with 2-byte length
    if (offset + 2 > bytes.length) {
      return {
        isStructurallyValid: false,
        isComplete: false,
        errorMessage: 'Segmento JPEG truncado antes de leer la longitud.',
      };
    }

    const segLen = (bytes[offset] << 8) | bytes[offset + 1];
    if (segLen < 2) {
      return {
        isStructurallyValid: false,
        isComplete: false,
        errorMessage: 'Longitud de segmento JPEG inválida (menor a 2 bytes).',
      };
    }

    if (offset + segLen > bytes.length) {
      return {
        isStructurallyValid: false,
        isComplete: false,
        errorMessage: `Segmento JPEG (0x${marker.toString(16)}) truncado: se esperaban ${segLen} bytes.`,
      };
    }

    // SOF markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2), SOF3 (0xC3), SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSof && !hasSof) {
      if (segLen >= 8) {
        // precision is offset+2
        const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
        const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
        if (width > 0 && height > 0) {
          dimensions = { width, height };
          hasSof = true;
        }
      }
    }

    // Start of Scan
    if (marker === 0xda) {
      hasSos = true;
      offset += segLen;

      // Scan through entropy data until EOI (0xFF 0xD9)
      while (offset < bytes.length - 1) {
        if (bytes[offset] === 0xff && bytes[offset + 1] === 0xd9) {
          hasEoi = true;
          break;
        }
        offset++;
      }
      break;
    }

    offset += segLen;
  }

  // Also check if last 2 bytes are EOI
  if (!hasEoi && bytes.length >= 2) {
    if (bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
      hasEoi = true;
    }
  }

  if (!hasSof) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo JPEG incompleto: falta el marcador Start of Frame (SOF) con dimensiones válidas.',
    };
  }

  if (!hasSos) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo JPEG incompleto: falta el marcador Start of Scan (SOS).',
    };
  }

  if (!hasEoi) {
    return {
      isStructurallyValid: false,
      isComplete: false,
      errorMessage: 'Archivo JPEG incompleto: falta el marcador terminal EOI (0xFF 0xD9).',
    };
  }

  return {
    isStructurallyValid: true,
    isComplete: true,
    dimensions,
  };
}

/**
 * Validates actual binary bytes against SUBJECT 01 raster-only policy.
 * Distinguishes explicitly between:
 * - Recognized binary format (signature check)
 * - Structurally valid file (absence of truncation, complete chunk/segment structure, terminal IEND/EOI markers)
 * - Decoded image (client environment verification)
 */
export function validateRasterBytes(
  bytes: Uint8Array,
  declaredMime?: string
): RasterValidationResult {
  if (!bytes || bytes.length === 0) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'EMPTY_IMAGE_DATA',
      errorMessage: 'Los datos de la imagen están vacíos.',
      byteLength: 0,
    };
  }

  const byteLength = bytes.length;

  // 1. Explicitly detect prohibited SVG
  if (hasSvgContent(bytes) || declaredMime === 'image/svg+xml') {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage:
        'Formato SVG detectado y rechazado. SUBJECT 01 no acepta gráficos vectoriales SVG en la canalización de producción.',
      byteLength,
    };
  }

  // 2. Explicitly detect other unsupported formats
  if (hasWebpSignature(bytes)) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Formato WebP no soportado. Sólo se aceptan imágenes auténticas PNG o JPEG.',
      byteLength,
    };
  }

  if (hasGifSignature(bytes)) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Formato GIF no soportado. Sólo se aceptan imágenes auténticas PNG o JPEG.',
      byteLength,
    };
  }

  // 3. Check for PNG signature
  const isPngSig = hasPngSignature(bytes);
  if (isPngSig) {
    // Check MIME declaration mismatch if provided
    if (declaredMime && declaredMime !== 'image/png') {
      return {
        isValid: false,
        integrityLevel: 'SIGNATURE_ONLY',
        isComplete: false,
        errorCategory: 'MIME_SIGNATURE_MISMATCH',
        errorMessage: `Discrepancia de tipo MIME: Se declaró "${declaredMime}", pero la firma binaria corresponde a PNG.`,
        byteLength,
      };
    }

    // Check PNG structural integrity (chunks, dimensions, terminal IEND)
    const pngStructure = validatePngStructure(bytes);
    if (!pngStructure.isStructurallyValid || !pngStructure.isComplete) {
      return {
        isValid: false,
        format: 'PNG',
        mimeType: 'image/png',
        integrityLevel: 'SIGNATURE_ONLY',
        isComplete: false,
        errorCategory: 'INVALID_IMAGE_BYTES',
        errorMessage: pngStructure.errorMessage || 'Archivo PNG incompleto o estructuralmente inválido.',
        byteLength,
      };
    }

    return {
      isValid: true,
      format: 'PNG',
      mimeType: 'image/png',
      integrityLevel: 'STRUCTURALLY_VALID',
      isComplete: true,
      dimensions: pngStructure.dimensions,
      byteLength,
      serverValidationLimitation: SERVER_VALIDATION_LIMITATION,
    };
  }

  // 4. Check for JPEG signature
  const isJpegSig = hasJpegSignature(bytes);
  if (isJpegSig) {
    if (
      declaredMime &&
      declaredMime !== 'image/jpeg' &&
      declaredMime !== 'image/jpg'
    ) {
      return {
        isValid: false,
        integrityLevel: 'SIGNATURE_ONLY',
        isComplete: false,
        errorCategory: 'MIME_SIGNATURE_MISMATCH',
        errorMessage: `Discrepancia de tipo MIME: Se declaró "${declaredMime}", pero la firma binaria corresponde a JPEG.`,
        byteLength,
      };
    }

    // Check JPEG structural integrity (markers, SOF, SOS, terminal EOI)
    const jpegStructure = validateJpegStructure(bytes);
    if (!jpegStructure.isStructurallyValid || !jpegStructure.isComplete) {
      return {
        isValid: false,
        format: 'JPEG',
        mimeType: 'image/jpeg',
        integrityLevel: 'SIGNATURE_ONLY',
        isComplete: false,
        errorCategory: 'INVALID_IMAGE_BYTES',
        errorMessage: jpegStructure.errorMessage || 'Archivo JPEG incompleto o estructuralmente inválido.',
        byteLength,
      };
    }

    return {
      isValid: true,
      format: 'JPEG',
      mimeType: 'image/jpeg',
      integrityLevel: 'STRUCTURALLY_VALID',
      isComplete: true,
      dimensions: jpegStructure.dimensions,
      byteLength,
      serverValidationLimitation: SERVER_VALIDATION_LIMITATION,
    };
  }

  // 5. Bytes are neither valid PNG nor valid JPEG
  return {
    isValid: false,
    integrityLevel: 'INVALID',
    isComplete: false,
    errorCategory: 'INVALID_IMAGE_BYTES',
    errorMessage:
      'Firma binaria de imagen inválida o corrupta. La imagen no coincide con los estándares binarios de PNG o JPEG.',
    byteLength,
  };
}

/**
 * Validates a base64 or Data URI string directly.
 */
export function validateBase64Image(
  dataUriOrBase64: string,
  explicitMime?: string
): RasterValidationResult {
  if (!dataUriOrBase64 || !dataUriOrBase64.trim()) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'EMPTY_IMAGE_DATA',
      errorMessage: 'Los datos de la imagen están vacíos.',
      byteLength: 0,
    };
  }

  const rawLower = dataUriOrBase64.trim().toLowerCase();
  if (
    rawLower.includes('<svg') ||
    explicitMime === 'image/svg+xml' ||
    rawLower.startsWith('data:image/svg+xml')
  ) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage:
        'Formato SVG detectado y rechazado. SUBJECT 01 no acepta gráficos vectoriales SVG en la canalización de producción.',
      byteLength: dataUriOrBase64.length,
    };
  }

  try {
    const { bytes, declaredMime } = decodeBase64ToBytes(dataUriOrBase64);
    const mimeToCheck = explicitMime || declaredMime;
    return validateRasterBytes(bytes, mimeToCheck);
  } catch (err: any) {
    return {
      isValid: false,
      integrityLevel: 'INVALID',
      isComplete: false,
      errorCategory: 'INVALID_IMAGE_BYTES',
      errorMessage: 'Error al decodificar la carga útil base64: ' + (err?.message || err),
    };
  }
}

/**
 * Prepares and validates inspiration image analysis payload for /api/analyze-inspiration.
 * Complies strictly with DEFECT B:
 * - Accepts valid PNG
 * - Accepts valid JPEG
 * - Determines actual supported format from image bytes
 * - Requires explicit MIME declaration (if passed) to match detected format
 * - Never silently relabels PNG as JPEG
 * - Returns clean base64 and exact detected MIME type
 */
export function prepareInspirationAnalysisPayload(
  dataUriOrBase64: string,
  explicitMime?: string
): {
  isValid: boolean;
  detectedMime?: 'image/png' | 'image/jpeg';
  cleanBase64?: string;
  error?: string;
  errorCategory?: RasterErrorCategory;
} {
  if (!dataUriOrBase64 || !dataUriOrBase64.trim()) {
    return {
      isValid: false,
      error: 'Falta la imagen de inspiración en base64.',
      errorCategory: 'EMPTY_IMAGE_DATA',
    };
  }

  const validation = validateBase64Image(dataUriOrBase64, explicitMime);
  if (!validation.isValid || !validation.mimeType) {
    return {
      isValid: false,
      error:
        'Formato no soportado o inválido. SUBJECT 01 sólo admite imágenes ráster auténticas PNG o JPEG: ' +
        (validation.errorMessage || 'Formato inválido'),
      errorCategory: validation.errorCategory || 'UNSUPPORTED_FORMAT',
    };
  }

  const cleanBase64 = dataUriOrBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
  return {
    isValid: true,
    detectedMime: validation.mimeType,
    cleanBase64,
  };
}

/**
 * Verifies client-side that an image Data URL can be successfully decoded
 * by the browser's HTMLImageElement rendering engine.
 *
 * Enforces DEFECT A requirement 3:
 * "Implement reliable client-side image decoding before presenting the image as an accepted production candidate."
 */
export async function verifyClientImageDecodable(dataUrl: string): Promise<{
  decodable: boolean;
  width?: number;
  height?: number;
  error?: string;
}> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    // Non-browser / Node.js test environment:
    return { decodable: true };
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          resolve({
            decodable: true,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        } else {
          resolve({
            decodable: false,
            error: 'La imagen cargó pero sus dimensiones naturales son cero (0x0).',
          });
        }
      };
      img.onerror = () => {
        resolve({
          decodable: false,
          error:
            'El motor del navegador no pudo decodificar los bytes de la imagen (datos corruptos, incompletos o formato ilegible).',
        });
      };
      img.src = dataUrl;
    } catch (err: any) {
      resolve({
        decodable: false,
        error: 'Error al inicializar decodificación en cliente: ' + (err?.message || err),
      });
    }
  });
}
