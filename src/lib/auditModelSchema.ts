import { AuditVerdict } from './types';

export const REQUIRED_CRITERIA_IDS = [
  'crit_facial_structure',
  'crit_hair_beard',
  'crit_skin_texture',
  'crit_head_body_prop',
  'crit_body_anatomy',
  'crit_accessories',
  'crit_expression',
  'crit_scene_faithfulness',
  'crit_photo_realism',
] as const;

export type RequiredCriterionId = (typeof REQUIRED_CRITERIA_IDS)[number];

const VALID_VERDICTS: Set<AuditVerdict> = new Set(['PASS', 'REVIEW', 'FAIL', 'UNVERIFIED']);
const REQUIRED_CRITERIA_SET: Set<string> = new Set(REQUIRED_CRITERIA_IDS);

export interface ModelCriterionNote {
  verdict: AuditVerdict;
  observations: string;
  evidence: string;
}

export type ValidatedModelAuditData = Record<RequiredCriterionId, ModelCriterionNote>;

export interface ModelAuditValidationResult {
  isValid: boolean;
  errorDescription?: string;
  validatedData?: ValidatedModelAuditData;
}

/**
 * Pure, deterministic runtime validation for model audit responses.
 *
 * Strict validation rules (S01-FIX-001C):
 * 1. Must be a non-null, non-array object.
 * 2. Must contain exactly the 9 expected criterion IDs.
 * 3. Must reject any unknown criterion IDs.
 * 4. For each criterion:
 *    - Must be an object with string verdict, string observations, string evidence.
 *    - verdict must be one of: PASS, REVIEW, FAIL, UNVERIFIED.
 *    - observations and evidence must be non-empty strings.
 *    - For positive or negative verdicts (PASS / FAIL), observations and evidence
 *      must be substantive and meaningful (at least 10 non-whitespace chars).
 */
export function validateModelAuditResponse(input: unknown): ModelAuditValidationResult {
  if (input === null || input === undefined) {
    return {
      isValid: false,
      errorDescription: 'La respuesta del modelo es nula o indefinida.',
    };
  }

  if (Array.isArray(input)) {
    return {
      isValid: false,
      errorDescription: 'La respuesta del modelo es un arreglo JSON en lugar de un objeto estructurado.',
    };
  }

  if (typeof input !== 'object') {
    return {
      isValid: false,
      errorDescription: `Tipo de respuesta inválido: se esperaba un objeto pero se recibió ${typeof input}.`,
    };
  }

  const rawObj = input as Record<string, unknown>;
  const keys = Object.keys(rawObj);

  // Check for unknown criterion IDs
  for (const key of keys) {
    if (!REQUIRED_CRITERIA_SET.has(key)) {
      return {
        isValid: false,
        errorDescription: `Identificador de criterio no permitido o desconocido: "${key}".`,
      };
    }
  }

  // Check for missing required criteria
  for (const requiredKey of REQUIRED_CRITERIA_IDS) {
    if (!(requiredKey in rawObj)) {
      return {
        isValid: false,
        errorDescription: `Falta el criterio requerido en la respuesta del modelo: "${requiredKey}".`,
      };
    }
  }

  const validatedResult: Partial<ValidatedModelAuditData> = {};

  // Validate each of the 9 criteria
  for (const id of REQUIRED_CRITERIA_IDS) {
    const item = rawObj[id];

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        isValid: false,
        errorDescription: `El criterio "${id}" no es un objeto válido.`,
      };
    }

    const itemObj = item as Record<string, unknown>;

    // Validate verdict
    if (typeof itemObj.verdict !== 'string' || !VALID_VERDICTS.has(itemObj.verdict as AuditVerdict)) {
      return {
        isValid: false,
        errorDescription: `Veredicto inválido o ausente en el criterio "${id}": "${String(itemObj.verdict)}".`,
      };
    }

    // Validate observations
    if (typeof itemObj.observations !== 'string') {
      return {
        isValid: false,
        errorDescription: `El campo "observations" en el criterio "${id}" debe ser una cadena de texto.`,
      };
    }

    // Validate evidence
    if (typeof itemObj.evidence !== 'string') {
      return {
        isValid: false,
        errorDescription: `El campo "evidence" en el criterio "${id}" debe ser una cadena de texto.`,
      };
    }

    const verdict = itemObj.verdict as AuditVerdict;
    const observations = itemObj.observations.trim();
    const evidence = itemObj.evidence.trim();

    if (observations.length === 0) {
      return {
        isValid: false,
        errorDescription: `El campo "observations" en el criterio "${id}" está vacío.`,
      };
    }

    // For PASS and FAIL verdicts, enforce substantive observations and evidence
    if (verdict === 'PASS' || verdict === 'FAIL') {
      if (observations.length < 10) {
        return {
          isValid: false,
          errorDescription: `Observación insuficiente en el criterio "${id}" para dictamen ${verdict} (mínimo 10 caracteres).`,
        };
      }
      if (evidence.length < 10) {
        return {
          isValid: false,
          errorDescription: `Evidencia visual insuficiente en el criterio "${id}" para dictamen ${verdict} (mínimo 10 caracteres).`,
        };
      }
    }

    validatedResult[id] = {
      verdict,
      observations,
      evidence,
    };
  }

  return {
    isValid: true,
    validatedData: validatedResult as ValidatedModelAuditData,
  };
}
