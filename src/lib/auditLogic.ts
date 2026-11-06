import {
  AssessmentType,
  AuditCriterion,
  AuditExecutionStatus,
  AuditVerdict,
  CanonicalAssetId,
  ContinuityAuditReport,
  SceneConfig,
  ServerAuditExecutionMetadata,
} from './types';
import { REQUIRED_CRITERIA_IDS } from './auditModelSchema';

export interface AuditInputParams {
  sceneConfig: SceneConfig;
  canonicalStatus: Record<CanonicalAssetId, boolean>;
  hasGeneratedImage: boolean;
  modelAuditNotes?: Partial<Record<string, { verdict: AuditVerdict; observations: string; evidence: string }>>;
  serverExecutionMetadata?: ServerAuditExecutionMetadata;
  auditStatus?: AuditExecutionStatus;
  auditErrorMessage?: string;
}

interface ValidatedCriterionResult {
  verdict: AuditVerdict;
  observations: string;
  evidence: string;
  assessmentType: AssessmentType;
}

const KNOWN_CRITERIA_IDS: Set<string> = new Set(REQUIRED_CRITERIA_IDS);

const GENERIC_EVIDENCE_PLATITUDES = new Set([
  'face matches perfectly',
  'matches perfectly',
  'todo coincide',
  'looks good',
  'perfecto',
  'coincide perfectamente',
  'sin problemas',
  'todo bien',
  'aprobado',
  'ok',
  'validado',
]);

/**
 * Validates a single criterion note against strict verification gates (S01-FIX-001C).
 *
 * Execution gate order (Defect 1 correction):
 * 1. Check known criterion ID.
 * 2. Check client canonical connection.
 * 3. Check occlusion safeguard for closed framing.
 * 4. Check server execution status (must be SUCCESS).
 * 5. Check candidate image attachment (must be confirmed by server).
 * 6. Check required canonical reference attachment (must be confirmed by server).
 * 7. Validate model structured data (valid verdict, nonempty observations & evidence).
 * 8. Only after all execution gates pass, process FAIL or PASS.
 *    - For genuine FAIL: preserve FAIL with VERIFIED_COMPARISON.
 *    - For PASS: check contradiction triggers, negative constraints, and reject generic platitudes.
 */
function validateModelCriterionNote(params: {
  criterionId: string;
  label: string;
  raw: any;
  sceneConfig: SceneConfig;
  canonicalStatus: Record<CanonicalAssetId, boolean>;
  requiredReferenceId?: CanonicalAssetId;
  effectiveAuditStatus: AuditExecutionStatus;
  serverMetadata?: ServerAuditExecutionMetadata;
  auditErrorMessage?: string;
}): ValidatedCriterionResult {
  const {
    criterionId,
    label,
    raw,
    sceneConfig,
    canonicalStatus,
    requiredReferenceId,
    effectiveAuditStatus,
    serverMetadata,
    auditErrorMessage,
  } = params;

  // 1. Unknown criterion identifier rejection
  if (!KNOWN_CRITERIA_IDS.has(criterionId)) {
    return {
      verdict: 'UNVERIFIED',
      observations: `Identificador de criterio desconocido: "${criterionId}".`,
      evidence: 'Criterio no admitido en el esquema de auditoría.',
      assessmentType: 'TECHNICAL_FAILURE',
    };
  }

  // 2. Client Canonical Master connection check
  if (requiredReferenceId && canonicalStatus[requiredReferenceId] === false) {
    return {
      verdict: 'UNVERIFIED',
      observations: `El activo canónico ${requiredReferenceId} está desconectado en el proyecto. No es posible auditar ${label}.`,
      evidence: `Ausencia de referencia visual ${requiredReferenceId} en la sesión.`,
      assessmentType: 'MISSING_REFERENCE',
    };
  }

  // 3. Camera framing occlusion safeguard
  if (
    criterionId === 'crit_head_body_prop' &&
    (sceneConfig.shotType === 'portrait' || sceneConfig.shotType === 'selfie')
  ) {
    return {
      verdict: 'REVIEW',
      observations:
        'Encuadre cerrado (plano corto/selfie): La relación craneal completa respecto a torso e inferiores no es evaluable por oclusión de encuadre.',
      evidence: 'Área corporal inferior fuera de campo en la toma fotográfica.',
      assessmentType: 'UNASSESSABLE_OCCLUSION',
    };
  }

  // 4. STRICT EXECUTION GATE: Validate execution status BEFORE accepting ANY model verdict
  if (effectiveAuditStatus !== 'SUCCESS') {
    if (effectiveAuditStatus === 'FAILED') {
      return {
        verdict: 'UNVERIFIED',
        observations:
          'Auditoría visual no realizada debido a fallo técnico en el servicio multimodal: ' +
          (auditErrorMessage || 'Error de servicio'),
        evidence: 'Fallo técnico reportado por el backend.',
        assessmentType: 'TECHNICAL_FAILURE',
      };
    }
    if (effectiveAuditStatus === 'MALFORMED') {
      return {
        verdict: 'UNVERIFIED',
        observations: 'Respuesta del modelo malformada: estructura de datos no válida.',
        evidence: 'Estructura JSON malformada en la respuesta del auditor.',
        assessmentType: 'TECHNICAL_FAILURE',
      };
    }
    if (effectiveAuditStatus === 'EMPTY') {
      return {
        verdict: 'UNVERIFIED',
        observations: 'El modelo multimodal devolvió un conjunto de datos vacío.',
        evidence: 'Ausencia de datos evaluados devueltos por el auditor.',
        assessmentType: 'UNVERIFIED_NO_EVIDENCE',
      };
    }
    // NOT_RUN or UNSUPPORTED_FORMAT
    return {
      verdict: 'UNVERIFIED',
      observations: `Sin comprobación visual multimodal: no se ha realizado contraste automatizado para "${label}".`,
      evidence: 'Auditoría visual multimodal no ejecutada en esta corrida.',
      assessmentType: 'UNVERIFIED_NO_EVIDENCE',
    };
  }

  // 5. STRICT EXECUTION GATE: Candidate image attachment verification
  if (!serverMetadata || !serverMetadata.candidateImageAttached) {
    return {
      verdict: 'UNVERIFIED',
      observations:
        'La imagen candidata no fue adjuntada a la solicitud del auditor multimodal o falta confirmación del servidor.',
      evidence: 'Falta anclaje visual verificado del candidato en la llamada.',
      assessmentType: 'UNVERIFIED_NO_EVIDENCE',
    };
  }

  // 6. STRICT EXECUTION GATE: Reference-aware attachment verification
  if (requiredReferenceId) {
    const isReferenceAttached = serverMetadata.attachedReferences?.includes(requiredReferenceId);
    if (!isReferenceAttached) {
      return {
        verdict: 'UNVERIFIED',
        observations: `La referencia canónica ${requiredReferenceId} no fue adjuntada al modelo para evaluar este criterio.`,
        evidence: `Ausencia de bytes de ${requiredReferenceId} en la llamada al modelo.`,
        assessmentType: 'MISSING_REFERENCE',
      };
    }
  }

  // 7. MODEL DATA VALIDATION: Must have valid raw data structure
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      verdict: 'UNVERIFIED',
      observations: `Sin datos específicos devueltos por el modelo auditor para "${label}".`,
      evidence: 'Respuesta vacía o ausente para este criterio.',
      assessmentType: 'UNVERIFIED_NO_EVIDENCE',
    };
  }

  const validVerdicts: AuditVerdict[] = ['PASS', 'REVIEW', 'FAIL', 'UNVERIFIED'];
  if (!raw.verdict || typeof raw.verdict !== 'string' || !validVerdicts.includes(raw.verdict as AuditVerdict)) {
    return {
      verdict: 'UNVERIFIED',
      observations: 'Respuesta del modelo malformada: veredicto inválido o no reconocido.',
      evidence: `Veredicto devuelto: "${String(raw.verdict)}". Se rechaza por formato inválido.`,
      assessmentType: 'TECHNICAL_FAILURE',
    };
  }

  const rawVerdict = raw.verdict as AuditVerdict;
  const observations = typeof raw.observations === 'string' ? raw.observations.trim() : '';
  const evidence = typeof raw.evidence === 'string' ? raw.evidence.trim() : '';

  if (observations.length === 0) {
    return {
      verdict: 'UNVERIFIED',
      observations: 'Respuesta del modelo incompleta: campo de observaciones vacío.',
      evidence: 'Falta descripción analítica en la respuesta del modelo.',
      assessmentType: 'TECHNICAL_FAILURE',
    };
  }

  // 8. GENUINE FAIL: When comparison occurred successfully and FAIL is supported
  if (rawVerdict === 'FAIL') {
    if (evidence.length < 10) {
      return {
        verdict: 'UNVERIFIED',
        observations: `Aviso diagnóstico no verificado: El modelo reportó discrepancia pero la evidencia es insuficiente (${observations}).`,
        evidence: 'Evidencia visual insuficiente para validar técnicamente el fallo.',
        assessmentType: 'UNVERIFIED_NO_EVIDENCE',
      };
    }
    return {
      verdict: 'FAIL',
      observations,
      evidence,
      assessmentType: 'VERIFIED_COMPARISON',
    };
  }

  // 9. CONTRADICTION DETECTION (for PASS)
  if (rawVerdict === 'PASS') {
    const textToCheck = `${observations} ${evidence}`.toLowerCase();
    const contradictionTriggers = [
      'discrepancia severa',
      'discrepancia',
      'no coincide',
      'incompatible',
      'no se parece',
      'distorsión severa',
      'deformidad',
      'falla crítica',
      'no corresponde a diego',
      'ojos de otro color',
      'sin barba cuando requiere barba',
      'rasgos faciales distintos',
      'no cumple con la norma',
    ];
    const foundContradiction = contradictionTriggers.find((trigger) => textToCheck.includes(trigger));
    if (foundContradiction) {
      return {
        verdict: 'FAIL',
        observations: `Fallo de seguridad (Resultado Contradictorio): El modelo asignó PASS pero reportó discrepancia ("${foundContradiction}"): ${observations}`,
        evidence: `Evidencia contradictoria en el reporte: ${evidence}`,
        assessmentType: 'TECHNICAL_FAILURE',
      };
    }

    // Domain constraint conflict for glasses: off
    if (criterionId === 'crit_accessories' && sceneConfig.glasses === 'off') {
      if (
        textToCheck.includes('lleva gafas') ||
        textToCheck.includes('porta gafas') ||
        textToCheck.includes('gafas visibles') ||
        textToCheck.includes('montura detectada')
      ) {
        return {
          verdict: 'FAIL',
          observations:
            'Contradicción con directiva: Se detectaron gafas visibles en el candidato cuando la directiva de escena exigía sin gafas.',
          evidence: String(evidence || textToCheck),
          assessmentType: 'VERIFIED_COMPARISON',
        };
      }
    }

    // 10. SUBSTANTIVE EVIDENCE CHECKS FOR PASS
    if (evidence.length < 10) {
      return {
        verdict: 'UNVERIFIED',
        observations:
          'Evidencia visual insuficiente: el modelo emitió veredicto aprobatorio sin aportar soporte visual contrastable.',
        evidence: 'Evidencia omitida o insuficiente en el informe del modelo.',
        assessmentType: 'UNVERIFIED_NO_EVIDENCE',
      };
    }

    // Reject generic platitudes
    const cleanEvidence = evidence.toLowerCase();
    if (GENERIC_EVIDENCE_PLATITUDES.has(cleanEvidence)) {
      return {
        verdict: 'UNVERIFIED',
        observations:
          'Evidencia visual rechazada: la descripción consiste en una afirmación genérica sin detalle físico observable.',
        evidence: `Evidencia no admisible: "${evidence}". Se requiere descripción concreta de marcadores anatómicos observables.`,
        assessmentType: 'UNVERIFIED_NO_EVIDENCE',
      };
    }
  }

  // All mandatory gates passed: verified comparison
  return {
    verdict: rawVerdict,
    observations,
    evidence: evidence || 'Sin evidencia adicional registrada.',
    assessmentType: 'VERIFIED_COMPARISON',
  };
}

export function runContinuityAudit(params: AuditInputParams): ContinuityAuditReport {
  const {
    sceneConfig,
    canonicalStatus,
    hasGeneratedImage,
    modelAuditNotes = {},
    serverExecutionMetadata,
    auditStatus = 'NOT_RUN',
    auditErrorMessage,
  } = params;

  // Determine effective audit status (server metadata is authoritative when present)
  const effectiveAuditStatus: AuditExecutionStatus =
    serverExecutionMetadata?.executionStatus || auditStatus;

  // Effective error message
  const effectiveErrorMessage =
    serverExecutionMetadata?.errorMessage || auditErrorMessage;

  // Missing image check (PREPARE_ONLY or generation pending)
  if (!hasGeneratedImage) {
    return {
      overallVerdict: 'UNVERIFIED',
      timestamp: new Date().toISOString(),
      summaryEs:
        'Auditoría no ejecutable: No se ha generado imagen candidata en esta corrida (modo SOLO PREPARAR o generación pendiente).',
      criteria: [],
      suggestedCorrections: ['Ejecutar el modo GENERAR para obtener un candidato fotográfico analizable.'],
      auditExecutionStatus: 'NOT_RUN',
      serverExecutionMetadata,
    };
  }

  const criteria: AuditCriterion[] = [];
  const suggestedCorrections: string[] = [];

  const faceMasterConnected = canonicalStatus['01_FACE_MASTER'] === true;

  // Criterion 1: Estructura Facial e Identidad (Requires 01_FACE_MASTER)
  const evalFacial = validateModelCriterionNote({
    criterionId: 'crit_facial_structure',
    label: 'Estructura Facial e Identidad de Diego',
    raw: modelAuditNotes['crit_facial_structure'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '01_FACE_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_facial_structure',
    label: 'Estructura Facial e Identidad de Diego',
    domain: '01_FACE_MASTER',
    verdict: evalFacial.verdict,
    observations: evalFacial.observations,
    evidence: evalFacial.evidence,
    referenceSource: faceMasterConnected ? '01_FACE_MASTER' : '01_FACE_MASTER (Desconectado)',
    assessmentType: evalFacial.assessmentType,
  });

  // Criterion 2: Nacimiento Capilar, Peinado y Barba (Requires 01_FACE_MASTER)
  const evalHair = validateModelCriterionNote({
    criterionId: 'crit_hair_beard',
    label: 'Nacimiento Capilar, Peinado y Barba',
    raw: modelAuditNotes['crit_hair_beard'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '01_FACE_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_hair_beard',
    label: 'Nacimiento Capilar, Peinado y Barba',
    domain: '01_FACE_MASTER',
    verdict: evalHair.verdict,
    observations: evalHair.observations,
    evidence: evalHair.evidence,
    referenceSource: faceMasterConnected ? '01_FACE_MASTER' : '01_FACE_MASTER (Desconectado)',
    assessmentType: evalHair.assessmentType,
  });

  // Criterion 3: Tono y Textura Cutánea (Requires 01_FACE_MASTER)
  const evalSkin = validateModelCriterionNote({
    criterionId: 'crit_skin_texture',
    label: 'Tono y Textura Cutánea (Sin Blanqueamiento ni Piel de Plástico)',
    raw: modelAuditNotes['crit_skin_texture'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '01_FACE_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_skin_texture',
    label: 'Tono y Textura Cutánea (Sin Blanqueamiento ni Piel de Plástico)',
    domain: '01_FACE_MASTER',
    verdict: evalSkin.verdict,
    observations: evalSkin.observations,
    evidence: evalSkin.evidence,
    referenceSource: faceMasterConnected ? '01_FACE_MASTER' : '01_FACE_MASTER (Desconectado)',
    assessmentType: evalSkin.assessmentType,
  });

  // Criterion 4: Proporciones Cabeza-Cuerpo (Requires 02_BODY_MASTER)
  const evalHeadBody = validateModelCriterionNote({
    criterionId: 'crit_head_body_prop',
    label: 'Proporciones Cabeza-Cuerpo',
    raw: modelAuditNotes['crit_head_body_prop'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '02_BODY_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_head_body_prop',
    label: 'Proporciones Cabeza-Cuerpo',
    domain: '02_BODY_MASTER',
    verdict: evalHeadBody.verdict,
    observations: evalHeadBody.observations,
    evidence: evalHeadBody.evidence,
    referenceSource: canonicalStatus['02_BODY_MASTER'] ? '02_BODY_MASTER' : '02_BODY_MASTER (Desconectado)',
    assessmentType: evalHeadBody.assessmentType,
  });

  // Criterion 5: Anatomía Corporal Visible (Requires 02_BODY_MASTER)
  const evalAnatomy = validateModelCriterionNote({
    criterionId: 'crit_body_anatomy',
    label: 'Anatomía Corporal Visible y Verosimilitud de Extremidades',
    raw: modelAuditNotes['crit_body_anatomy'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '02_BODY_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_body_anatomy',
    label: 'Anatomía Corporal Visible y Verosimilitud de Extremidades',
    domain: '02_BODY_MASTER',
    verdict: evalAnatomy.verdict,
    observations: evalAnatomy.observations,
    evidence: evalAnatomy.evidence,
    referenceSource: canonicalStatus['02_BODY_MASTER'] ? '02_BODY_MASTER' : '02_BODY_MASTER (Desconectado)',
    assessmentType: evalAnatomy.assessmentType,
  });

  // Criterion 6: Accesorios Visibles (Requires 03_ACCESSORIES_MASTER)
  const accessoriesLabel =
    sceneConfig.glasses === 'off'
      ? 'Fidelidad de Accesorios: Restricción "Sin Gafas"'
      : 'Fidelidad de Accesorios: Gafas Redondas Metálicas y Reloj';
  const evalAccessories = validateModelCriterionNote({
    criterionId: 'crit_accessories',
    label: accessoriesLabel,
    raw: modelAuditNotes['crit_accessories'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '03_ACCESSORIES_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_accessories',
    label: accessoriesLabel,
    domain: '03_ACCESSORIES_MASTER',
    verdict: evalAccessories.verdict,
    observations: evalAccessories.observations,
    evidence: evalAccessories.evidence,
    referenceSource: canonicalStatus['03_ACCESSORIES_MASTER']
      ? '03_ACCESSORIES_MASTER'
      : '03_ACCESSORIES_MASTER (Desconectado)',
    assessmentType: evalAccessories.assessmentType,
  });

  // Criterion 7: Expresión Emocional (Requires 04_EXPRESSIONS_MASTER)
  const expressionLabel = `Fidelidad de Expresión Solicitada: "${sceneConfig.expression}"`;
  const evalExpression = validateModelCriterionNote({
    criterionId: 'crit_expression',
    label: expressionLabel,
    raw: modelAuditNotes['crit_expression'],
    sceneConfig,
    canonicalStatus,
    requiredReferenceId: '04_EXPRESSIONS_MASTER',
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_expression',
    label: expressionLabel,
    domain: '04_EXPRESSIONS_MASTER',
    verdict: evalExpression.verdict,
    observations: evalExpression.observations,
    evidence: evalExpression.evidence,
    referenceSource: canonicalStatus['04_EXPRESSIONS_MASTER']
      ? '04_EXPRESSIONS_MASTER'
      : '04_EXPRESSIONS_MASTER (Desconectado)',
    assessmentType: evalExpression.assessmentType,
  });

  // Criterion 8: Fidelidad al Escenario (Requires Candidate Image)
  const evalScene = validateModelCriterionNote({
    criterionId: 'crit_scene_faithfulness',
    label: 'Fidelidad al Escenario y Composición de Escena',
    raw: modelAuditNotes['crit_scene_faithfulness'],
    sceneConfig,
    canonicalStatus,
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_scene_faithfulness',
    label: 'Fidelidad al Escenario y Composición de Escena',
    domain: 'SCENE_DIRECTOR',
    verdict: evalScene.verdict,
    observations: evalScene.observations,
    evidence: evalScene.evidence,
    referenceSource: 'Scene Director Config',
    assessmentType: evalScene.assessmentType,
  });

  // Criterion 9: Verosimilitud Fotográfica (Requires Candidate Image)
  const evalRealism = validateModelCriterionNote({
    criterionId: 'crit_photo_realism',
    label: 'Verosimilitud Fotográfica Casual (Anti-AI Glaze)',
    raw: modelAuditNotes['crit_photo_realism'],
    sceneConfig,
    canonicalStatus,
    effectiveAuditStatus,
    serverMetadata: serverExecutionMetadata,
    auditErrorMessage: effectiveErrorMessage,
  });
  criteria.push({
    id: 'crit_photo_realism',
    label: 'Verosimilitud Fotográfica Casual (Anti-AI Glaze)',
    domain: 'REALISM_STANDARD',
    verdict: evalRealism.verdict,
    observations: evalRealism.observations,
    evidence: evalRealism.evidence,
    referenceSource: 'Smartphone Realism Standard',
    assessmentType: evalRealism.assessmentType,
  });

  // Calculate Overall Verdict
  // Strict rule: An overall PASS is impossible when any required identity check remains UNVERIFIED
  const hasFail = criteria.some((c) => c.verdict === 'FAIL');
  const hasUnverified = criteria.some((c) => c.verdict === 'UNVERIFIED');
  const hasReview = criteria.some((c) => c.verdict === 'REVIEW');
  const allPass = criteria.length === 9 && criteria.every((c) => c.verdict === 'PASS');

  let overallVerdict: AuditVerdict = 'UNVERIFIED';

  if (hasFail) {
    overallVerdict = 'FAIL';
    suggestedCorrections.push(
      'Corregir discrepancia severa de identidad o anatomía ajustando el prompt de producción.',
      'Revisar si la imagen de inspiración ha contaminado la estructura ósea de Diego Navarro.'
    );
  } else if (!faceMasterConnected || hasUnverified) {
    // STRICT GATE: Overall PASS is strictly impossible if any check is UNVERIFIED
    overallVerdict = 'UNVERIFIED';
    suggestedCorrections.push(
      'Auditoría incompleta: Se requiere verificación visual multimodal contrastada contra los activos canónicos físicos.',
      'Ningún criterio sin evidencia visual real recibe aprobación operativa.',
      'Inspeccionar manualmente el candidato frente a 01_FACE_MASTER antes de considerarlo apto para producción.'
    );
  } else if (hasReview) {
    overallVerdict = 'REVIEW';
    suggestedCorrections.push(
      'Inspección humana recomendada sobre áreas parcialmente ocluidas o detalles de encuadre.',
      'Si se requiere certeza anatómica completa de proporciones, cambiar de encuadre hacia plano medio o cuerpo entero.'
    );
  } else if (allPass) {
    overallVerdict = 'PASS';
    suggestedCorrections.push(
      'Candidato conforme a las normas de continuidad visual de Diego Navarro Alpha v0.2.',
      'Aprobado como candidato verificado (conservar como candidato, sin alterar el canon original).'
    );
  } else {
    overallVerdict = 'UNVERIFIED';
  }

  const summaryEs =
    overallVerdict === 'PASS'
      ? 'APROBADO (PASS): Todos los 9 criterios de continuidad visual fueron explícitamente contrastados y verificados con evidencia visual frente a las referencias canónicas adjuntas de Diego Navarro.'
      : overallVerdict === 'REVIEW'
      ? 'REVISIÓN (REVIEW): Se detectaron aspectos menores o áreas fuera de campo (por ejemplo encuadre cerrado) que requieren inspección por parte del operador humano.'
      : overallVerdict === 'UNVERIFIED'
      ? 'NO VERIFICADO (UNVERIFIED): Auditoría incompleta o no ejecutable. Uno o más criterios carecen de evidencia visual validada o tienen referencias desconectadas. Ningún criterio sin evidencia real obtiene aprobación.'
      : 'FALLO (FAIL): Se detectó una discrepancia crítica de identidad, anatomía o accesorios en la imagen candidata.';

  return {
    overallVerdict,
    timestamp: new Date().toISOString(),
    summaryEs,
    criteria,
    suggestedCorrections,
    unassessableNotice:
      'Aviso de auditoría: Las partes corporales o accesorios no visibles en el encuadre se registran como no evaluables en lugar de otorgarles un pase automático.',
    auditExecutionStatus: effectiveAuditStatus,
    serverExecutionMetadata,
  };
}
