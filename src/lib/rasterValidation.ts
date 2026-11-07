/**
 * SUBJECT 01 — Authentic Raster-Only Validation Policy (S01-FIX-002)
 *
 * Enforces strict binary signature validation for all images in the pipeline:
 * - Allowed formats: PNG (image/png) and JPEG (image/jpeg, image/jpg).
 * - Prohibited formats: SVG, WebP, GIF, HTML, XML, text, corrupt/disguised bytes.
 * - Validates actual bytes, not merely file extensions or claimed MIME types.
 */

export type SupportedRasterFormat = 'PNG' | 'JPEG';

export type RasterErrorCategory =
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_IMAGE_BYTES'
  | 'MIME_SIGNATURE_MISMATCH'
  | 'EMPTY_IMAGE_DATA';

export interface RasterValidationResult {
  isValid: boolean;
  format?: SupportedRasterFormat;
  mimeType?: 'image/png' | 'image/jpeg';
  errorCategory?: RasterErrorCategory;
  errorMessage?: string;
  byteLength?: number;
}

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
  // Inspect the first 512 bytes decoded as ASCII/UTF-8
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

  // Node.js Buffer or browser atob decoding
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
 * Validates actual binary bytes against SUBJECT 01 raster-only policy.
 */
export function validateRasterBytes(
  bytes: Uint8Array,
  declaredMime?: string
): RasterValidationResult {
  if (!bytes || bytes.length === 0) {
    return {
      isValid: false,
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
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Formato WebP no soportado. Sólo se aceptan imágenes auténticas PNG o JPEG.',
      byteLength,
    };
  }

  if (hasGifSignature(bytes)) {
    return {
      isValid: false,
      errorCategory: 'UNSUPPORTED_FORMAT',
      errorMessage: 'Formato GIF no soportado. Sólo se aceptan imágenes auténticas PNG o JPEG.',
      byteLength,
    };
  }

  // 3. Check for authentic PNG
  const isPng = hasPngSignature(bytes);
  if (isPng) {
    if (declaredMime && declaredMime !== 'image/png') {
      return {
        isValid: false,
        errorCategory: 'MIME_SIGNATURE_MISMATCH',
        errorMessage: `Discrepancia de tipo MIME: Se declaró "${declaredMime}", pero la firma binaria corresponde a PNG auténtico.`,
        byteLength,
      };
    }
    return {
      isValid: true,
      format: 'PNG',
      mimeType: 'image/png',
      byteLength,
    };
  }

  // 4. Check for authentic JPEG
  const isJpeg = hasJpegSignature(bytes);
  if (isJpeg) {
    if (
      declaredMime &&
      declaredMime !== 'image/jpeg' &&
      declaredMime !== 'image/jpg'
    ) {
      return {
        isValid: false,
        errorCategory: 'MIME_SIGNATURE_MISMATCH',
        errorMessage: `Discrepancia de tipo MIME: Se declaró "${declaredMime}", pero la firma binaria corresponde a JPEG auténtico.`,
        byteLength,
      };
    }
    return {
      isValid: true,
      format: 'JPEG',
      mimeType: 'image/jpeg',
      byteLength,
    };
  }

  // 5. Bytes are neither valid PNG nor valid JPEG
  return {
    isValid: false,
    errorCategory: 'INVALID_IMAGE_BYTES',
    errorMessage:
      'Firma binaria de imagen inválida o corrupta. La imagen no coincide con los estándares binarios de PNG o JPEG.',
    byteLength,
  };
}

/**
 * Validates a base64 or Data URI string directly.
 */
export function validateBase64Image(dataUriOrBase64: string, explicitMime?: string): RasterValidationResult {
  try {
    const { bytes, declaredMime } = decodeBase64ToBytes(dataUriOrBase64);
    const mimeToCheck = explicitMime || declaredMime;
    return validateRasterBytes(bytes, mimeToCheck);
  } catch (err: any) {
    return {
      isValid: false,
      errorCategory: 'INVALID_IMAGE_BYTES',
      errorMessage: 'Error al decodificar la carga útil base64: ' + (err?.message || err),
    };
  }
}
