import test from 'node:test';
import assert from 'node:assert/strict';
import { runIdentityGuardValidation } from './identityGuardLogic';
import { buildProductionPrompt } from './promptBuilderLogic';
import { runContinuityAudit } from './auditLogic';
import { INITIAL_CANONICAL_ASSETS } from './canonicalAssets';
import {
  AuditVerdict,
  InspirationAnalysis,
  SceneConfig,
  ServerAuditExecutionMetadata,
} from './types';

const defaultScene: SceneConfig = {
  shotType: 'half_body',
  expression: 'slight_smile',
  glasses: 'on',
  clothingMode: 'inspiration',
  clothingCustomDescription: '',
  environmentMode: 'inspiration',
  environmentCustomDescription: '',
  sceneDescription: 'Diego caminando por una calle de Madrid con abrigo camel',
  aspectRatio: '4:5',
  realismStyle: 'casual_smartphone',
  executionMode: 'GENERATE',
};

const mockInspiration: InspirationAnalysis = {
  clothingAndLayering: 'Abrigo sastre color camel sobre jersey mockneck antracita',
  accessoriesDetected: 'Ninguno',
  subjectPose: 'Caminando con manos en los bolsillos',
  cameraAngleAndFraming: 'Plano medio a la altura de los ojos',
  environmentDetails: 'Calle urbana con arquitectura clásica',
  lightingDetails: 'Luz natural diurna difusa',
  visualComposition: 'Sujeto en tercio central',
  photographicCharacteristics: 'Estilo streetstyle de smartphone',
  transferableElements: ['Abrigo camel', 'Jersey oscuro', 'Postura relajada'],
  identitySeparationNotice: 'Sujeto de referencia descartado; fisonomía de Diego preservada',
  physiqueAdaptationNotes: 'Prendas adaptadas a 1.83m y complexión atlética',
  rawSummary: 'Streetstyle otoño en ciudad',
};

const allCanonicalConnected = {
  '01_FACE_MASTER': true,
  '02_BODY_MASTER': true,
  '03_ACCESSORIES_MASTER': true,
  '04_EXPRESSIONS_MASTER': true,
};

const fabricatedPassNotes: Record<string, { verdict: AuditVerdict; observations: string; evidence: string }> = {
  crit_facial_structure: {
    verdict: 'PASS',
    observations: 'Observación fabricada afirmando parecido idéntico.',
    evidence: 'Evidencia fabricada sin respaldo visual real.',
  },
  crit_hair_beard: {
    verdict: 'PASS',
    observations: 'Observación fabricada de cabello castaño rizado.',
    evidence: 'Evidencia fabricada de barba recortada.',
  },
  crit_skin_texture: {
    verdict: 'PASS',
    observations: 'Observación fabricada de tono oliva mediterráneo.',
    evidence: 'Evidencia fabricada de micro-poros visibles.',
  },
};

const validFullBodyExecutionMetadata: ServerAuditExecutionMetadata = {
  executionStatus: 'SUCCESS',
  modelIdentifier: 'gemini-3.8-flash',
  candidateImageAttached: true,
  attachedReferences: ['01_FACE_MASTER', '02_BODY_MASTER', '03_ACCESSORIES_MASTER', '04_EXPRESSIONS_MASTER'],
  evaluatedCriteria: [
    'crit_facial_structure',
    'crit_hair_beard',
    'crit_skin_texture',
    'crit_head_body_prop',
    'crit_body_anatomy',
    'crit_accessories',
    'crit_expression',
    'crit_scene_faithfulness',
    'crit_photo_realism',
  ],
  validStructuredDataReturned: true,
  timestamp: new Date().toISOString(),
};

const genuineVerifiedNotes: Record<string, { verdict: AuditVerdict; observations: string; evidence: string }> = {
  crit_facial_structure: {
    verdict: 'PASS',
    observations: 'Estructura facial y proporciones óseas contrastadas contra 01_FACE_MASTER.',
    evidence: 'Línea de mandíbula angulada y distancia interocular congruente con ángulo frontal de 01_FACE_MASTER.',
  },
  crit_hair_beard: {
    verdict: 'PASS',
    observations: 'Patrón de rizo natural castaño oscuro y barba de 3 días densa y delineada.',
    evidence: 'Remolinos y textura en coronilla idénticos al ángulo 3/4 izquierdo de 01_FACE_MASTER.',
  },
  crit_skin_texture: {
    verdict: 'PASS',
    observations: 'Complexión oliva cálida con textura epidérmica realista y micro-poros.',
    evidence: 'Gradiente cromático en pómulos coincide con la gama tonal de 01_FACE_MASTER sin filtro de suavizado.',
  },
  crit_head_body_prop: {
    verdict: 'PASS',
    observations: 'Relación craneal de 1:7.5 confirmada en encuadre amplio de cuerpo entero.',
    evidence: 'Ancho de hombros biacromial correspondiente a complexión atlética delgada de 1.83m en 02_BODY_MASTER.',
  },
  crit_body_anatomy: {
    verdict: 'PASS',
    observations: 'Articulaciones anatómicas y extremidades con cinco falanges diferenciadas.',
    evidence: 'Inserción muscular en cuello y brazos coherente con lámina de anatomía de 02_BODY_MASTER.',
  },
  crit_accessories: {
    verdict: 'PASS',
    observations: 'Gafas de montura metálica circular plateada con puente curvo observadas.',
    evidence: 'Diámetro de aros de titanio coincide con especificación de 03_ACCESSORIES_MASTER.',
  },
  crit_expression: {
    verdict: 'PASS',
    observations: 'Registro gestual de ligera sonrisa relajada y mirada afable.',
    evidence: 'Tensión labial y periorbicular coincide con lámina SLIGHT SMILE de 04_EXPRESSIONS_MASTER.',
  },
  crit_scene_faithfulness: {
    verdict: 'PASS',
    observations: 'Calle urbana clásica madrileña con luz natural difusa de tarde.',
    evidence: 'Pavimento y fachadas en fuga de perspectiva conforme al prompt de producción.',
  },
  crit_photo_realism: {
    verdict: 'PASS',
    observations: 'Profundidad de campo creíble f/1.8 y grano de sensor de smartphone.',
    evidence: 'Transición focal orgánica sin efecto plástico aceitoso ni aberraciones de IA.',
  },
};

// --- BASELINE TESTS ---

test('Identity Guard: Enforces Diego Navarro identity and separates inspiration model', () => {
  const report = runIdentityGuardValidation(INITIAL_CANONICAL_ASSETS, defaultScene, mockInspiration);
  assert.equal(report.connectedAssetsCount, 4);
  assert.equal(report.missingAssets.length, 0);
  assert.ok(report.detectedConflicts.some((c) => c.type === 'FACIAL_STRUCTURE'));
  assert.ok(report.immutableConstraints.some((c) => c.includes('Diego Navarro')));
  assert.ok(report.fixedAttributesEnforced.facialIdentity.includes('Diego Navarro (32 años'));
});

test('Identity Guard: Blocks generation when 01_FACE_MASTER is disconnected', () => {
  const assetsWithoutFace = INITIAL_CANONICAL_ASSETS.map((a) =>
    a.id === '01_FACE_MASTER' ? { ...a, isConnected: false } : a
  );
  const report = runIdentityGuardValidation(assetsWithoutFace, defaultScene, mockInspiration);
  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.missingAssets.includes('01_FACE_MASTER'));
});

test('Identity Guard: Correctly forbids glasses when glasses option is off', () => {
  const sceneNoGlasses = { ...defaultScene, glasses: 'off' as const };
  const report = runIdentityGuardValidation(INITIAL_CANONICAL_ASSETS, sceneNoGlasses);
  assert.ok(report.contextNegativeConstraints.some((neg) => neg.includes('glasses')));
  assert.ok(report.immutableConstraints.some((c) => c.includes('Sin gafas')));
});

test('Prompt Builder: Compiles model-ready production prompt with identity lock and directives', () => {
  const guard = runIdentityGuardValidation(INITIAL_CANONICAL_ASSETS, defaultScene, mockInspiration);
  const promptData = buildProductionPrompt(defaultScene, guard, mockInspiration);
  assert.ok(promptData.fullModelPrompt.includes('[CANONICAL IDENTITY LOCK — SUBJECT 01: DIEGO NAVARRO]'));
  assert.equal(promptData.aspectRatio, '4:5');
});

// --- MANDATORY S01-FIX-001B REGRESSION TESTS ---

test('Regression 1: NOT_RUN + fabricated PASS notes → UNVERIFIED', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'NOT_RUN',
    modelAuditNotes: fabricatedPassNotes,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.notEqual(crit.assessmentType, 'VERIFIED_COMPARISON');
    assert.ok(crit.verdict === 'UNVERIFIED' || crit.verdict === 'REVIEW');
  }
});

test('Regression 2: FAILED + fabricated PASS notes → UNVERIFIED (technical failure)', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'FAILED',
    auditErrorMessage: 'HTTP 500 / Model Crash',
    modelAuditNotes: fabricatedPassNotes,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    if (crit.id !== 'crit_head_body_prop') {
      assert.equal(crit.verdict, 'UNVERIFIED');
      assert.equal(crit.assessmentType, 'TECHNICAL_FAILURE');
    }
  }
});

test('Regression 3: EMPTY + fabricated PASS notes → UNVERIFIED', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'EMPTY',
    modelAuditNotes: fabricatedPassNotes,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.notEqual(crit.assessmentType, 'VERIFIED_COMPARISON');
  }
});

test('Regression 4: MALFORMED + fabricated PASS notes → UNVERIFIED', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'MALFORMED',
    modelAuditNotes: fabricatedPassNotes,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.notEqual(crit.assessmentType, 'VERIFIED_COMPARISON');
  }
});

test('Regression 5: SUCCESS without candidate attachment metadata → UNVERIFIED', () => {
  const metadataWithoutCandidate: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    candidateImageAttached: false, // Server reports candidate was NOT attached!
  };

  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutCandidate,
    modelAuditNotes: genuineVerifiedNotes,
  });

  // Since candidate was not attached to the model, no visual comparison could occur
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.notEqual(crit.assessmentType, 'VERIFIED_COMPARISON');
  }
});

test('Regression 6: SUCCESS without required reference attachment → UNVERIFIED for affected criterion', () => {
  const metadataWithoutFace: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    attachedReferences: ['02_BODY_MASTER', '03_ACCESSORIES_MASTER', '04_EXPRESSIONS_MASTER'], // 01_FACE_MASTER omitted!
  };

  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutFace,
    modelAuditNotes: genuineVerifiedNotes,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  const faceCrit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(faceCrit?.verdict, 'UNVERIFIED');
  assert.equal(faceCrit?.assessmentType, 'MISSING_REFERENCE');
  assert.ok(faceCrit?.observations.includes('no fue adjuntada al modelo'));

  const hairCrit = audit.criteria.find((c) => c.id === 'crit_hair_beard');
  assert.equal(hairCrit?.verdict, 'UNVERIFIED');
  assert.equal(hairCrit?.assessmentType, 'MISSING_REFERENCE');
});

test('Regression 7: Missing BODY MASTER → body verification cannot PASS', () => {
  const metadataWithoutBody: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    attachedReferences: ['01_FACE_MASTER', '03_ACCESSORIES_MASTER', '04_EXPRESSIONS_MASTER'], // 02_BODY_MASTER omitted!
  };

  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const audit = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: { ...allCanonicalConnected, '02_BODY_MASTER': false },
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutBody,
    modelAuditNotes: genuineVerifiedNotes,
  });

  assert.notEqual(audit.overallVerdict, 'PASS');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');

  const headBodyCrit = audit.criteria.find((c) => c.id === 'crit_head_body_prop');
  assert.equal(headBodyCrit?.verdict, 'UNVERIFIED');
  assert.equal(headBodyCrit?.assessmentType, 'MISSING_REFERENCE');

  const anatomyCrit = audit.criteria.find((c) => c.id === 'crit_body_anatomy');
  assert.equal(anatomyCrit?.verdict, 'UNVERIFIED');
  assert.equal(anatomyCrit?.assessmentType, 'MISSING_REFERENCE');
});

test('Regression 8: Missing ACCESSORIES MASTER → accessory verification cannot PASS', () => {
  const metadataWithoutAcc: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    attachedReferences: ['01_FACE_MASTER', '02_BODY_MASTER', '04_EXPRESSIONS_MASTER'], // 03_ACCESSORIES_MASTER omitted!
  };

  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: { ...allCanonicalConnected, '03_ACCESSORIES_MASTER': false },
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutAcc,
    modelAuditNotes: genuineVerifiedNotes,
  });

  assert.notEqual(audit.overallVerdict, 'PASS');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');

  const accCrit = audit.criteria.find((c) => c.id === 'crit_accessories');
  assert.equal(accCrit?.verdict, 'UNVERIFIED');
  assert.equal(accCrit?.assessmentType, 'MISSING_REFERENCE');
});

test('Regression 9: Valid multimodal execution metadata with complete model assessments → results processed correctly', () => {
  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const audit = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: genuineVerifiedNotes,
  });

  assert.equal(audit.overallVerdict, 'PASS');
  assert.equal(audit.criteria.length, 9);
  for (const crit of audit.criteria) {
    assert.equal(crit.verdict, 'PASS');
    assert.equal(crit.assessmentType, 'VERIFIED_COMPARISON');
  }
});

test('Regression 10: Explicitly reported discrepancies are not silently converted into PASS', () => {
  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const notesWithDiscrepancy = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'FAIL' as const,
      observations: 'Discrepancia crítica en mandíbula: fisonomía redondeada incompatible con Diego Navarro.',
      evidence: 'Mandíbula carece de los ángulos marcados de 01_FACE_MASTER.',
    },
  };

  const audit = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: notesWithDiscrepancy,
  });

  // FAIL must be strictly preserved and overall verdict must be FAIL
  assert.equal(audit.overallVerdict, 'FAIL');
  const faceCrit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(faceCrit?.verdict, 'FAIL');
  assert.equal(faceCrit?.assessmentType, 'VERIFIED_COMPARISON');
});

test('Regression 11: Missing or contradictory evidence → no positive verification', () => {
  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };

  // Case A: Missing evidence string
  const notesEmptyEvidence = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'PASS' as const,
      observations: 'Rostro parece coincidir pero sin detalle.',
      evidence: '', // Empty evidence
    },
  };
  const auditEmpty = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: notesEmptyEvidence,
  });
  assert.equal(auditEmpty.overallVerdict, 'UNVERIFIED');
  const emptyFaceCrit = auditEmpty.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(emptyFaceCrit?.verdict, 'UNVERIFIED');
  assert.equal(emptyFaceCrit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');

  // Case B: Generic platitude ("Face matches perfectly")
  const notesPlatitude = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'PASS' as const,
      observations: 'Observación no fundamentada.',
      evidence: 'Face matches perfectly', // Generic platitude rejection
    },
  };
  const auditPlatitude = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: notesPlatitude,
  });
  assert.equal(auditPlatitude.overallVerdict, 'UNVERIFIED');
  const platitudeCrit = auditPlatitude.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(platitudeCrit?.verdict, 'UNVERIFIED');
  assert.equal(platitudeCrit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');
  assert.ok(platitudeCrit?.observations.includes('Evidencia visual rechazada'));

  // Case C: Contradictory result (Claims PASS but observations declare severe discrepancy)
  const notesContradictory = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'PASS' as const,
      observations: 'Discrepancia severa: el modelo tiene deformidad y no se parece a Diego Navarro.',
      evidence: 'Rasgos faciales completamente diferentes.',
    },
  };
  const auditContradictory = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: notesContradictory,
  });
  assert.equal(auditContradictory.overallVerdict, 'FAIL');
  const contradictoryCrit = auditContradictory.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(contradictoryCrit?.verdict, 'FAIL');
  assert.equal(contradictoryCrit?.assessmentType, 'TECHNICAL_FAILURE');
});

test('Regression 12: No regression in PREPARE_ONLY behavior', () => {
  const audit = runContinuityAudit({
    sceneConfig: { ...defaultScene, executionMode: 'PREPARE_ONLY' },
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: false,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  assert.equal(audit.criteria.length, 0);
  assert.ok(audit.summaryEs.includes('No se ha generado imagen candidata'));
  assert.equal(audit.auditExecutionStatus, 'NOT_RUN');
});
