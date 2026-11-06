import test from 'node:test';
import assert from 'node:assert/strict';
import { runIdentityGuardValidation } from './identityGuardLogic';
import { buildProductionPrompt } from './promptBuilderLogic';
import { runContinuityAudit } from './auditLogic';
import { INITIAL_CANONICAL_ASSETS } from './canonicalAssets';
import { SceneConfig, InspirationAnalysis } from './types';

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

// --- Identity Guard & Prompt Builder Baseline Tests ---

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
  assert.ok(report.detectedConflicts.some((c) => c.severity === 'HIGH' && c.type === 'MISSING_CANON'));
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
  assert.ok(promptData.fullModelPrompt.includes('32 years old'));
  assert.ok(promptData.fullModelPrompt.includes('Abrigo sastre color camel'));
  assert.ok(promptData.canonicalBindings.length >= 4);
  assert.equal(promptData.aspectRatio, '4:5');
});

// --- Continuity Auditor Safe Failure & Deterministic Tests (S01-FIX-001) ---

test('Continuity Auditor Test 1: Missing image → UNVERIFIED', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: false,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  assert.equal(audit.criteria.length, 0);
  assert.ok(audit.summaryEs.includes('No se ha generado imagen candidata'));
});

test('Continuity Auditor Test 2: Missing facial reference → UNVERIFIED and overall PASS is impossible', () => {
  const statusWithoutFace = {
    ...allCanonicalConnected,
    '01_FACE_MASTER': false,
  };
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: statusWithoutFace,
    hasGeneratedImage: true,
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'PASS',
        observations: 'Intento de aprobar sin referencia facial',
        evidence: 'Evidencia no verificable',
      },
    },
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  const faceCrit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.ok(faceCrit);
  assert.equal(faceCrit.verdict, 'UNVERIFIED');
  assert.equal(faceCrit.assessmentType, 'MISSING_REFERENCE');
  assert.ok(faceCrit.referenceSource.includes('Desconectado'));
});

test('Continuity Auditor Test 3: Failed multimodal audit → UNVERIFIED (safe technical failure)', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'FAILED',
    auditErrorMessage: 'Network timeout / 503 Service Unavailable',
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  assert.equal(audit.criteria.length, 9);
  
  // No criterion should receive an automatic PASS
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.equal(crit.verdict, 'UNVERIFIED');
    assert.equal(crit.assessmentType, 'TECHNICAL_FAILURE');
  }
});

test('Continuity Auditor Test 4: Empty model response → UNVERIFIED with no fabricated observations', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: {},
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  assert.equal(audit.criteria.length, 9);

  // Ensure no fabricated passes or fake visual confirmations exist
  for (const crit of audit.criteria) {
    assert.notEqual(crit.verdict, 'PASS');
    assert.equal(crit.verdict, 'UNVERIFIED');
    assert.equal(crit.assessmentType, 'UNVERIFIED_NO_EVIDENCE');
    assert.ok(crit.observations.includes('Sin comprobación visual multimodal'));
  }
});

test('Continuity Auditor Test 5: Partial evidence → no automatic PASS and overall UNVERIFIED', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: {
      // Only 1 criterion has valid evidence
      crit_facial_structure: {
        verdict: 'PASS',
        observations: 'Estructura ósea facial verificada visualmente contra 01_FACE_MASTER.',
        evidence: 'Línea de mandíbula y distancia interocular coincidentes con ángulo frontal.',
      },
      // Another criterion has empty evidence string
      crit_hair_beard: {
        verdict: 'PASS',
        observations: 'Cabello rizado castaño observado.',
        evidence: '', // Missing / empty evidence
      },
    },
  });

  // Overall PASS MUST be impossible when criteria remain unverified
  assert.equal(audit.overallVerdict, 'UNVERIFIED');

  const faceCrit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(faceCrit?.verdict, 'PASS');
  assert.equal(faceCrit?.assessmentType, 'VERIFIED_COMPARISON');

  // crit_hair_beard with empty evidence must NOT be PASS
  const hairCrit = audit.criteria.find((c) => c.id === 'crit_hair_beard');
  assert.equal(hairCrit?.verdict, 'UNVERIFIED');
  assert.equal(hairCrit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');

  // Any unmentioned criterion must be UNVERIFIED
  const skinCrit = audit.criteria.find((c) => c.id === 'crit_skin_texture');
  assert.equal(skinCrit?.verdict, 'UNVERIFIED');
  assert.equal(skinCrit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');
});

test('Continuity Auditor Test 6: Explicitly verified results → verdicts reflect validated evidence', () => {
  // Scenario A: Full body shot where all 9 criteria are legitimately verified with visual evidence
  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const verifiedNotes: Record<string, { verdict: 'PASS'; observations: string; evidence: string }> = {
    crit_facial_structure: {
      verdict: 'PASS',
      observations: 'Fisiognomía idéntica a Diego Navarro.',
      evidence: 'Coincidencia morfométrica comprobada contra 01_FACE_MASTER.',
    },
    crit_hair_beard: {
      verdict: 'PASS',
      observations: 'Patrón de rizo y densidad de barba de 3 días correcta.',
      evidence: 'Textura capilar rizada natural en ángulo superior.',
    },
    crit_skin_texture: {
      verdict: 'PASS',
      observations: 'Tono oliva mediterráneo con textura de poro natural.',
      evidence: 'Rango cromático coincide con lámina de referencia.',
    },
    crit_head_body_prop: {
      verdict: 'PASS',
      observations: 'Proporción 1:7.5 confirmada en cuerpo entero.',
      evidence: 'Altura relativa 1.83m y envergadura congruentes.',
    },
    crit_body_anatomy: {
      verdict: 'PASS',
      observations: 'Manos y extremidades anatómicamente correctas sin artefactos.',
      evidence: 'Cinco dedos diferenciados en mano visible.',
    },
    crit_accessories: {
      verdict: 'PASS',
      observations: 'Gafas redondas de titanio observadas con precisión.',
      evidence: 'Diámetro de aro y puente curvo idénticos a 03_ACCESSORIES.',
    },
    crit_expression: {
      verdict: 'PASS',
      observations: 'Sonrisa leve relajada coincidente.',
      evidence: 'Tensión muscular labial coincide con lámina SLIGHT SMILE.',
    },
    crit_scene_faithfulness: {
      verdict: 'PASS',
      observations: 'Calle Jorge Juan en Madrid con arquitectura clásica.',
      evidence: 'Fachadas de piedra y pavimento urbano en perspectiva.',
    },
    crit_photo_realism: {
      verdict: 'PASS',
      observations: 'Óptica f/1.8 creíble sin efecto plástico AI.',
      evidence: 'Profundidad de campo y grano de smartphone auténtico.',
    },
  };

  const auditAllPass = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: verifiedNotes,
  });

  assert.equal(auditAllPass.overallVerdict, 'PASS');
  assert.equal(auditAllPass.criteria.length, 9);
  for (const crit of auditAllPass.criteria) {
    assert.equal(crit.verdict, 'PASS');
    assert.equal(crit.assessmentType, 'VERIFIED_COMPARISON');
  }

  // Scenario B: When one criterion is verified as FAIL, overall must be FAIL
  const failNotes = {
    ...verifiedNotes,
    crit_hair_beard: {
      verdict: 'FAIL' as const,
      observations: 'Cabello liso rubio platino incompatible con Diego.',
      evidence: 'Pigmentación capilar completamente errónea.',
    },
  };
  const auditFail = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: failNotes,
  });

  assert.equal(auditFail.overallVerdict, 'FAIL');
  const hairFailCrit = auditFail.criteria.find((c) => c.id === 'crit_hair_beard');
  assert.equal(hairFailCrit?.verdict, 'FAIL');
});

test('Continuity Auditor Test 7: Contradictory or malformed audit results → safe failure', () => {
  // Case A: Malformed verdict string
  const auditMalformedVerdict = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'TOTALMENTE_VALIDADO_OK' as any,
        observations: 'Texto descriptivo',
        evidence: 'Evidencia visual',
      },
    },
  });

  assert.equal(auditMalformedVerdict.overallVerdict, 'UNVERIFIED');
  const malformedCrit = auditMalformedVerdict.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(malformedCrit?.verdict, 'UNVERIFIED');
  assert.equal(malformedCrit?.assessmentType, 'TECHNICAL_FAILURE');

  // Case B: Contradictory claims (Claims PASS but observations declare severe discrepancy)
  const auditContradictory = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'PASS',
        observations: 'Discrepancia severa: el sujeto no coincide con Diego Navarro y presenta deformidad en pómulos.',
        evidence: 'Rasgos faciales distintos observados en el candidato.',
      },
    },
  });

  // Overall MUST NOT be PASS; safe failure turns contradictory PASS into FAIL
  assert.equal(auditContradictory.overallVerdict, 'FAIL');
  const contradictoryCrit = auditContradictory.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(contradictoryCrit?.verdict, 'FAIL');
  assert.ok(contradictoryCrit?.observations.includes('Fallo de seguridad (Resultado Contradictorio)'));

  // Case C: Direct contradiction with negative constraint (glasses: off, but glasses detected)
  const sceneNoGlasses: SceneConfig = { ...defaultScene, glasses: 'off' };
  const auditGlassesConflict = runContinuityAudit({
    sceneConfig: sceneNoGlasses,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    modelAuditNotes: {
      crit_accessories: {
        verdict: 'PASS',
        observations: 'Sujeto porta gafas metálicas sobre el rostro.',
        evidence: 'Gafas visibles claramente en la zona ocular.',
      },
    },
  });

  assert.equal(auditGlassesConflict.overallVerdict, 'FAIL');
  const glassesCrit = auditGlassesConflict.criteria.find((c) => c.id === 'crit_accessories');
  assert.equal(glassesCrit?.verdict, 'FAIL');
  assert.ok(glassesCrit?.observations.includes('Contradicción con directiva'));
});

test('Continuity Auditor: Evaluates 9 criteria and marks occluded areas as REVIEW rather than auto-pass', () => {
  const closeUpScene: SceneConfig = { ...defaultScene, shotType: 'portrait' };
  const audit = runContinuityAudit({
    sceneConfig: closeUpScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
  });

  assert.equal(audit.criteria.length, 9);
  // Head-body proportion in close-up should flag REVIEW for occluded torso
  const headBodyCrit = audit.criteria.find((c) => c.id === 'crit_head_body_prop');
  assert.ok(headBodyCrit);
  assert.equal(headBodyCrit.verdict, 'REVIEW');
  assert.equal(headBodyCrit.assessmentType, 'UNASSESSABLE_OCCLUSION');
});
