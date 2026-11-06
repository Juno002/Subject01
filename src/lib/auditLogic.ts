import {
  AssessmentType,
  AuditCriterion,
  AuditVerdict,
  CanonicalAssetId,
  ContinuityAuditReport,
  SceneConfig,
} from './types';

export interface AuditInputParams {
  sceneConfig: SceneConfig;
  canonicalStatus: Record<CanonicalAssetId, boolean>;
  hasGeneratedImage: boolean;
  modelAuditNotes?: Partial<Record<string, { verdict: AuditVerdict; observations: string; evidence: string }>>;
  auditStatus?: 'SUCCESS' | 'FAILED' | 'UNSUPPORTED_FORMAT' | 'EMPTY' | 'MALFORMED' | 'NOT_RUN';
  auditErrorMessage?: string;
}

interface ValidatedCriterionResult {
  verdict: AuditVerdict;
  observations: string;
  evidence: string;
  assessmentType: AssessmentType;
}

/**
 * Validates a single criterion note from multimodal inspection.
 * Enforces:
 * - No default PASS without actual visual evidence.
 * - Incomplete/missing/empty evidence -> UNVERIFIED.
 * - Malformed responses -> UNVERIFIED / TECHNICAL_FAILURE.
 * - Contradictory responses (claiming PASS while describing failure) -> FAIL / safe failure.
 */
function validateModelCriterionNote(
  criterionId: string,
  raw: any,
  sceneConfig: SceneConfig,
  auditStatus?: string
): ValidatedCriterionResult {
  if (auditStatus === 'FAILED') {
    return {
      verdict: 'UNVERIFIED',
      observations: 'Auditoría visual no realizada debido a fallo técnico en el servicio de análisis multimodal.',
      evidence: 'Fallo técnico reportado por el servicio de auditoría.',
      assessmentType: 'TECHNICAL_FAILURE',
    };
  }

  // If no note provided or empty object
  if (!raw || typeof raw !== 'object') {
    return {
      verdict: 'UNVERIFIED',
      observations: 'Sin comprobación visual multimodal: no se recibió análisis específico para este criterio.',
      evidence: 'Ausencia de datos evaluados por el auditor multimodal.',
      assessmentType: 'UNVERIFIED_NO_EVIDENCE',
    };
  }

  // Validate verdict format
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

  // Malformed: empty observations
  if (observations.length === 0) {
    return {
      verdict: 'UNVERIFIED',
      observations: 'Respuesta del modelo incompleta: campo de observaciones vacío.',
      evidence: 'Falta descripción analítica en la respuesta del modelo.',
      assessmentType: 'TECHNICAL_FAILURE',
    };
  }

  // Partial evidence -> no automatic PASS
  if (rawVerdict === 'PASS' && evidence.length < 5) {
    return {
      verdict: 'UNVERIFIED',
      observations:
        'Evidencia visual insuficiente: el modelo emitió veredicto aprobatorio sin aportar soporte visual contrastable.',
      evidence: 'Evidencia omitida o insuficiente en el informe del modelo.',
      assessmentType: 'UNVERIFIED_NO_EVIDENCE',
    };
  }

  // Contradictory audit results -> safe failure
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
          evidence: evidence,
          assessmentType: 'VERIFIED_COMPARISON',
        };
      }
    }
  }

  // Explicitly verified result
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
    auditStatus = 'NOT_RUN',
    auditErrorMessage,
  } = params;

  if (!hasGeneratedImage) {
    return {
      overallVerdict: 'UNVERIFIED',
      timestamp: new Date().toISOString(),
      summaryEs:
        'Auditoría no ejecutable: No se ha generado imagen candidata en esta corrida (modo SOLO PREPARAR o generación pendiente).',
      criteria: [],
      suggestedCorrections: ['Ejecutar el modo GENERAR para obtener un candidato fotográfico analizable.'],
      auditExecutionStatus: 'NOT_RUN',
    };
  }

  const criteria: AuditCriterion[] = [];
  const suggestedCorrections: string[] = [];

  const faceMasterConnected = canonicalStatus['01_FACE_MASTER'] === true;
  const bodyMasterConnected = canonicalStatus['02_BODY_MASTER'] === true;
  const accessoriesMasterConnected = canonicalStatus['03_ACCESSORIES_MASTER'] === true;
  const expressionsMasterConnected = canonicalStatus['04_EXPRESSIONS_MASTER'] === true;

  // 1. Estructura facial e identidad reconocible
  if (!faceMasterConnected) {
    criteria.push({
      id: 'crit_facial_structure',
      label: 'Estructura Facial e Identidad de Diego',
      domain: '01_FACE_MASTER',
      verdict: 'UNVERIFIED',
      observations: '01_FACE_MASTER no está conectado en el proyecto. No es posible auditar la fidelidad ósea.',
      evidence: 'Ausencia de anclaje de referencia de 4 ángulos de Diego Navarro.',
      referenceSource: '01_FACE_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_facial_structure',
      modelAuditNotes['crit_facial_structure'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_facial_structure',
      label: 'Estructura Facial e Identidad de Diego',
      domain: '01_FACE_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '01_FACE_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 2. Línea de nacimiento capilar, peinado y barba
  if (!faceMasterConnected) {
    criteria.push({
      id: 'crit_hair_beard',
      label: 'Nacimiento Capilar, Peinado y Barba',
      domain: '01_FACE_MASTER',
      verdict: 'UNVERIFIED',
      observations: 'Imposible verificar barba y cabello sin el Face Master.',
      evidence: 'Falta referencia visual canónica.',
      referenceSource: '01_FACE_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_hair_beard',
      modelAuditNotes['crit_hair_beard'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_hair_beard',
      label: 'Nacimiento Capilar, Peinado y Barba',
      domain: '01_FACE_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '01_FACE_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 3. Tono y textura cutánea
  if (!faceMasterConnected) {
    criteria.push({
      id: 'crit_skin_texture',
      label: 'Tono y Textura Cutánea (Sin Blanqueamiento ni Piel de Plástico)',
      domain: '01_FACE_MASTER',
      verdict: 'UNVERIFIED',
      observations: 'Sin 01_FACE_MASTER no es posible validar el tono de piel canónico ni textura.',
      evidence: 'Referencia de tono de piel ausente.',
      referenceSource: '01_FACE_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_skin_texture',
      modelAuditNotes['crit_skin_texture'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_skin_texture',
      label: 'Tono y Textura Cutánea (Sin Blanqueamiento ni Piel de Plástico)',
      domain: '01_FACE_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '01_FACE_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 4. Proporciones cabeza-cuerpo
  if (sceneConfig.shotType === 'portrait' || sceneConfig.shotType === 'selfie') {
    criteria.push({
      id: 'crit_head_body_prop',
      label: 'Proporciones Cabeza-Cuerpo',
      domain: '02_BODY_MASTER',
      verdict: 'REVIEW',
      observations:
        'Encuadre cerrado (plano corto/selfie): La relación craneal completa respecto al torso e inferiores no es evaluable por oclusión de encuadre.',
      evidence: 'Área corporal inferior no visible por recorte del encuadre fotográfico.',
      referenceSource: '02_BODY_MASTER',
      assessmentType: 'UNASSESSABLE_OCCLUSION',
    });
  } else if (!bodyMasterConnected) {
    criteria.push({
      id: 'crit_head_body_prop',
      label: 'Proporciones Cabeza-Cuerpo',
      domain: '02_BODY_MASTER',
      verdict: 'UNVERIFIED',
      observations: '02_BODY_MASTER desconectado; no se puede contrastar la proporción canónica 1:7.5.',
      evidence: 'Activo canónico 02 no conectado en el proyecto.',
      referenceSource: '02_BODY_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_head_body_prop',
      modelAuditNotes['crit_head_body_prop'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_head_body_prop',
      label: 'Proporciones Cabeza-Cuerpo',
      domain: '02_BODY_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '02_BODY_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 5. Anatomía corporal visible (manos, dedos, postura)
  if (!bodyMasterConnected) {
    criteria.push({
      id: 'crit_body_anatomy',
      label: 'Anatomía Corporal Visible y Verosimilitud de Extremidades',
      domain: '02_BODY_MASTER',
      verdict: 'UNVERIFIED',
      observations: '02_BODY_MASTER desconectado. Imposible auditar anatomía ni extremidades.',
      evidence: 'Referencia anatómica ausente.',
      referenceSource: '02_BODY_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_body_anatomy',
      modelAuditNotes['crit_body_anatomy'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_body_anatomy',
      label: 'Anatomía Corporal Visible y Verosimilitud de Extremidades',
      domain: '02_BODY_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '02_BODY_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 6. Accesorios visibles: Gafas, Reloj, Teléfono
  if (!accessoriesMasterConnected) {
    criteria.push({
      id: 'crit_accessories',
      label: 'Fidelidad de Accesorios (Gafas / Reloj / Teléfono)',
      domain: '03_ACCESSORIES_MASTER',
      verdict: 'UNVERIFIED',
      observations: '03_ACCESSORIES_MASTER desconectado. No es posible validar la montura ni los accesorios.',
      evidence: 'Activo canónico 03 ausente en la sesión de producción.',
      referenceSource: '03_ACCESSORIES_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const label =
      sceneConfig.glasses === 'off'
        ? 'Fidelidad de Accesorios: Restricción "Sin Gafas"'
        : 'Fidelidad de Accesorios: Gafas Redondas Metálicas y Reloj';
    const evaluated = validateModelCriterionNote(
      'crit_accessories',
      modelAuditNotes['crit_accessories'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_accessories',
      label,
      domain: '03_ACCESSORIES_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '03_ACCESSORIES_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 7. Fidelidad de expresión solicitada
  if (!expressionsMasterConnected) {
    criteria.push({
      id: 'crit_expression',
      label: 'Fidelidad de la Expresión Emocional',
      domain: '04_EXPRESSIONS_MASTER',
      verdict: 'UNVERIFIED',
      observations: '04_EXPRESSIONS_MASTER desconectado. Falta catálogo de referencia de microexpresiones.',
      evidence: 'Activo 04 no conectado.',
      referenceSource: '04_EXPRESSIONS_MASTER (Desconectado)',
      assessmentType: 'MISSING_REFERENCE',
    });
  } else {
    const evaluated = validateModelCriterionNote(
      'crit_expression',
      modelAuditNotes['crit_expression'],
      sceneConfig,
      auditStatus
    );
    criteria.push({
      id: 'crit_expression',
      label: `Fidelidad de Expresión Solicitada: "${sceneConfig.expression}"`,
      domain: '04_EXPRESSIONS_MASTER',
      verdict: evaluated.verdict,
      observations: evaluated.observations,
      evidence: evaluated.evidence,
      referenceSource: '04_EXPRESSIONS_MASTER',
      assessmentType: evaluated.assessmentType,
    });
  }

  // 8. Fidelidad a la escena solicitada
  const evaluatedScene = validateModelCriterionNote(
    'crit_scene_faithfulness',
    modelAuditNotes['crit_scene_faithfulness'],
    sceneConfig,
    auditStatus
  );
  criteria.push({
    id: 'crit_scene_faithfulness',
    label: 'Fidelidad al Escenario y Composición de Escena',
    domain: 'SCENE_DIRECTOR',
    verdict: evaluatedScene.verdict,
    observations: evaluatedScene.observations,
    evidence: evaluatedScene.evidence,
    referenceSource: 'Scene Director Config',
    assessmentType: evaluatedScene.assessmentType,
  });

  // 9. Verosimilitud fotográfica (Anti-IA plastic check)
  const evaluatedRealism = validateModelCriterionNote(
    'crit_photo_realism',
    modelAuditNotes['crit_photo_realism'],
    sceneConfig,
    auditStatus
  );
  criteria.push({
    id: 'crit_photo_realism',
    label: 'Verosimilitud Fotográfica Casual (Anti-AI Glaze)',
    domain: 'REALISM_STANDARD',
    verdict: evaluatedRealism.verdict,
    observations: evaluatedRealism.observations,
    evidence: evaluatedRealism.evidence,
    referenceSource: 'Smartphone Realism Standard',
    assessmentType: evaluatedRealism.assessmentType,
  });

  // Calculate Overall Verdict
  // Rule: An overall PASS is impossible when any required identity check remains UNVERIFIED
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
    // PASS is strictly IMPOSSIBLE when any required check is UNVERIFIED
    overallVerdict = 'UNVERIFIED';
    suggestedCorrections.push(
      'Auditoría incompleta: Se requiere verificación visual multimodal con evidencia contrastada.',
      'Ningún criterio sin evidencia visual real recibe aprobación automática.',
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
      ? 'APROBADO (PASS): Todos los criterios de continuidad visual fueron explícitamente contrastados y verificados con evidencia visual frente a las referencias canónicas de Diego Navarro.'
      : overallVerdict === 'REVIEW'
      ? 'REVISIÓN (REVIEW): Se detectaron aspectos menores o áreas fuera de campo (por ejemplo encuadre cerrado) que requieren inspección por parte del operador humano.'
      : overallVerdict === 'UNVERIFIED'
      ? 'NO VERIFICADO (UNVERIFIED): Auditoría incompleta. Uno o más criterios carecen de evidencia visual validada o tienen referencias desconectadas. Ningún criterio sin evidencia real obtiene aprobación automática.'
      : 'FALLO (FAIL): Se detectó una discrepancia crítica de identidad, anatomía o accesorios en la imagen candidata.';

  return {
    overallVerdict,
    timestamp: new Date().toISOString(),
    summaryEs,
    criteria,
    suggestedCorrections,
    unassessableNotice:
      'Aviso de auditoría: Las partes corporales o accesorios no visibles en el encuadre se registran como no evaluables en lugar de otorgarles un pase automático.',
    auditExecutionStatus: auditStatus,
  };
}
