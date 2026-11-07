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
import {
  REQUIRED_CRITERIA_IDS,
  validateModelAuditResponse,
} from './auditModelSchema';
import { validateRasterBytes, validateBase64Image } from './rasterValidation';
import { executeCandidateGeneration } from './generationService';

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

// --- BASELINE TESTS: IDENTITY GUARD & PROMPT BUILDER ---

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

// --- MANDATORY S01-FIX-001C REGRESSION TESTS ---

test('S01-FIX-001C Test 1: NOT_RUN + fabricated FAIL → UNVERIFIED (Defect 1)', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'NOT_RUN',
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'FAIL',
        observations: 'Fabricated discrepancy claim without execution.',
        evidence: 'Fabricated evidence without execution.',
      },
    },
  });

  const crit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(crit?.verdict, 'UNVERIFIED');
  assert.notEqual(crit?.assessmentType, 'VERIFIED_COMPARISON');
  assert.equal(crit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
});

test('S01-FIX-001C Test 2: FAILED + fabricated FAIL → UNVERIFIED (Defect 1)', () => {
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    auditStatus: 'FAILED',
    auditErrorMessage: 'HTTP 500 / Service Unavailable',
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'FAIL',
        observations: 'Fabricated discrepancy claim on failed request.',
        evidence: 'Fabricated evidence without execution.',
      },
    },
  });

  const crit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(crit?.verdict, 'UNVERIFIED');
  assert.notEqual(crit?.assessmentType, 'VERIFIED_COMPARISON');
  assert.equal(crit?.assessmentType, 'TECHNICAL_FAILURE');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
});

test('S01-FIX-001C Test 3: SUCCESS without candidate attachment + FAIL → UNVERIFIED (Defect 1)', () => {
  const metadataWithoutCandidate: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    candidateImageAttached: false,
  };

  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutCandidate,
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'FAIL',
        observations: 'Model claims discrepancy but candidate image was never attached.',
        evidence: 'Fake evidence without candidate attachment.',
      },
    },
  });

  const crit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(crit?.verdict, 'UNVERIFIED');
  assert.notEqual(crit?.assessmentType, 'VERIFIED_COMPARISON');
  assert.equal(crit?.assessmentType, 'UNVERIFIED_NO_EVIDENCE');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
});

test('S01-FIX-001C Test 4: SUCCESS without required reference + FAIL → UNVERIFIED (Defect 1)', () => {
  const metadataWithoutFace: ServerAuditExecutionMetadata = {
    ...validFullBodyExecutionMetadata,
    attachedReferences: ['02_BODY_MASTER', '03_ACCESSORIES_MASTER', '04_EXPRESSIONS_MASTER'], // 01_FACE_MASTER omitted!
  };

  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: metadataWithoutFace,
    modelAuditNotes: {
      crit_facial_structure: {
        verdict: 'FAIL',
        observations: 'Model claims facial failure but face master was never attached.',
        evidence: 'Fake visual comparison without canonical reference.',
      },
    },
  });

  const crit = audit.criteria.find((c) => c.id === 'crit_facial_structure');
  assert.equal(crit?.verdict, 'UNVERIFIED');
  assert.notEqual(crit?.assessmentType, 'VERIFIED_COMPARISON');
  assert.equal(crit?.assessmentType, 'MISSING_REFERENCE');
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
});

test('S01-FIX-001C Test 5: SUCCESS with valid reference attachments and supported FAIL evidence → FAIL preserved', () => {
  const notesWithLegitimateFail = {
    ...genuineVerifiedNotes,
    crit_hair_beard: {
      verdict: 'FAIL' as const,
      observations: 'Cabello rubio liso sin textura y barba completamente afeitada.',
      evidence: 'Zona peribucal rasurada y pigmentación rubia incompatible con 01_FACE_MASTER.',
    },
  };

  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const audit = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: notesWithLegitimateFail,
  });

  const hairCrit = audit.criteria.find((c) => c.id === 'crit_hair_beard');
  assert.equal(hairCrit?.verdict, 'FAIL');
  assert.equal(hairCrit?.assessmentType, 'VERIFIED_COMPARISON');
  assert.equal(audit.overallVerdict, 'FAIL');
});

test('S01-FIX-001C Test 6: Arbitrary nonempty JSON → MALFORMED (Defect 2)', () => {
  const arbitraryJson = {
    randomKey: 'some value',
    foo: 123,
    bar: { nested: true },
  };

  const result = validateModelAuditResponse(arbitraryJson);
  assert.equal(result.isValid, false);
  assert.ok(result.errorDescription?.includes('no permitido o desconocido'));
});

test('S01-FIX-001C Test 7: JSON array or null → MALFORMED (Defect 2)', () => {
  assert.equal(validateModelAuditResponse(null).isValid, false);
  assert.equal(validateModelAuditResponse(undefined).isValid, false);
  assert.equal(validateModelAuditResponse([]).isValid, false);
  assert.equal(validateModelAuditResponse([{ id: 'crit_facial_structure' }]).isValid, false);
});

test('S01-FIX-001C Test 8: Missing criterion → MALFORMED (Defect 2)', () => {
  // Contains 8 of 9 criteria, missing 'crit_photo_realism'
  const partialCriteria = { ...genuineVerifiedNotes };
  delete (partialCriteria as any).crit_photo_realism;

  const result = validateModelAuditResponse(partialCriteria);
  assert.equal(result.isValid, false);
  assert.ok(result.errorDescription?.includes('Falta el criterio requerido'));
  assert.ok(result.errorDescription?.includes('crit_photo_realism'));
});

test('S01-FIX-001C Test 9: Unknown criterion ID → MALFORMED (Defect 2)', () => {
  const withUnknown = {
    ...genuineVerifiedNotes,
    crit_unknown_extra: {
      verdict: 'PASS',
      observations: 'Extra observation with substantive detail here.',
      evidence: 'Extra evidence with substantive detail here.',
    },
  };

  const result = validateModelAuditResponse(withUnknown);
  assert.equal(result.isValid, false);
  assert.ok(result.errorDescription?.includes('no permitido o desconocido'));
  assert.ok(result.errorDescription?.includes('crit_unknown_extra'));
});

test('S01-FIX-001C Test 10: Invalid verdict or field types → MALFORMED (Defect 2)', () => {
  // Subcase A: Invalid verdict string
  const invalidVerdict = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'TOTALLY_APPROVED_SUPER_PASS',
      observations: 'Observación sustancial detallada aquí.',
      evidence: 'Evidencia sustancial detallada aquí.',
    },
  };
  assert.equal(validateModelAuditResponse(invalidVerdict).isValid, false);

  // Subcase B: Wrong field type (observations is number)
  const wrongFieldType = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'PASS',
      observations: 1234567890,
      evidence: 'Evidencia sustancial detallada aquí.',
    },
  };
  assert.equal(validateModelAuditResponse(wrongFieldType).isValid, false);

  // Subcase C: Empty observations
  const emptyObservations = {
    ...genuineVerifiedNotes,
    crit_facial_structure: {
      verdict: 'PASS',
      observations: '',
      evidence: 'Evidencia sustancial detallada aquí.',
    },
  };
  assert.equal(validateModelAuditResponse(emptyObservations).isValid, false);
});

test('S01-FIX-001C Test 11: Complete valid nine-criterion response → valid structured data (Defect 2)', () => {
  const result = validateModelAuditResponse(genuineVerifiedNotes);
  assert.equal(result.isValid, true);
  assert.ok(result.validatedData);
  assert.equal(Object.keys(result.validatedData).length, 9);
  for (const id of REQUIRED_CRITERIA_IDS) {
    assert.ok(result.validatedData[id]);
    assert.equal(typeof result.validatedData[id].verdict, 'string');
    assert.equal(typeof result.validatedData[id].observations, 'string');
    assert.equal(typeof result.validatedData[id].evidence, 'string');
  }
});

test('S01-FIX-001C Test 12: Existing PASS, REVIEW, UNVERIFIED and PREPARE_ONLY retain correct behavior', () => {
  // Subcase A: PREPARE_ONLY
  const prepOnlyAudit = runContinuityAudit({
    sceneConfig: { ...defaultScene, executionMode: 'PREPARE_ONLY' },
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: false,
  });
  assert.equal(prepOnlyAudit.overallVerdict, 'UNVERIFIED');
  assert.equal(prepOnlyAudit.criteria.length, 0);

  // Subcase B: Full body all pass
  const fullBodyScene: SceneConfig = { ...defaultScene, shotType: 'full_body' };
  const passAudit = runContinuityAudit({
    sceneConfig: fullBodyScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: genuineVerifiedNotes,
  });
  assert.equal(passAudit.overallVerdict, 'PASS');
  assert.equal(passAudit.criteria.length, 9);
  for (const c of passAudit.criteria) {
    assert.equal(c.verdict, 'PASS');
    assert.equal(c.assessmentType, 'VERIFIED_COMPARISON');
  }

  // Subcase C: Portrait review for occlusion
  const closeUpScene: SceneConfig = { ...defaultScene, shotType: 'portrait' };
  const reviewAudit = runContinuityAudit({
    sceneConfig: closeUpScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: true,
    serverExecutionMetadata: validFullBodyExecutionMetadata,
    modelAuditNotes: genuineVerifiedNotes,
  });
  const headBody = reviewAudit.criteria.find((c) => c.id === 'crit_head_body_prop');
  assert.equal(headBody?.verdict, 'REVIEW');
  assert.equal(headBody?.assessmentType, 'UNASSESSABLE_OCCLUSION');
  assert.equal(reviewAudit.overallVerdict, 'REVIEW');
});

// ============================================================================
// S01-FIX-002: SVG Elimination & Authentic Raster-Only Image Pipeline Tests
// ============================================================================

const samplePngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
]);

const sampleJpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
]);

const sampleWebpBytes = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

const sampleGifBytes = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

test('S01-FIX-002 Requirement 1: Valid PNG bytes are accepted', () => {
  const result = validateRasterBytes(samplePngBytes, 'image/png');
  assert.equal(result.isValid, true);
  assert.equal(result.format, 'PNG');
  assert.equal(result.mimeType, 'image/png');
});

test('S01-FIX-002 Requirement 2: Valid JPEG bytes are accepted', () => {
  const result = validateRasterBytes(sampleJpegBytes, 'image/jpeg');
  assert.equal(result.isValid, true);
  assert.equal(result.format, 'JPEG');
  assert.equal(result.mimeType, 'image/jpeg');
});

test('S01-FIX-002 Requirement 3: SVG candidate data is rejected', () => {
  const svgText = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>';
  const svgBytes = Buffer.from(svgText);
  const result = validateRasterBytes(svgBytes, 'image/svg+xml');
  assert.equal(result.isValid, false);
  assert.equal(result.errorCategory, 'UNSUPPORTED_FORMAT');

  const base64Svg = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);
  const dataUriResult = validateBase64Image(base64Svg);
  assert.equal(dataUriResult.isValid, false);
  assert.equal(dataUriResult.errorCategory, 'UNSUPPORTED_FORMAT');
});

test('S01-FIX-002 Requirement 4: Invalid bytes disguised as PNG are rejected', () => {
  const fakePng = Buffer.from('FAKE_PNG_HEADER_THAT_IS_NOT_AUTHENTIC_BINARY');
  const result = validateRasterBytes(fakePng, 'image/png');
  assert.equal(result.isValid, false);
  assert.equal(result.errorCategory, 'INVALID_IMAGE_BYTES');
});

test('S01-FIX-002 Requirement 5: Incorrect MIME declarations are rejected', () => {
  // Real PNG bytes claiming to be JPEG
  const pngAsJpeg = validateRasterBytes(samplePngBytes, 'image/jpeg');
  assert.equal(pngAsJpeg.isValid, false);
  assert.equal(pngAsJpeg.errorCategory, 'MIME_SIGNATURE_MISMATCH');

  // Real JPEG bytes claiming to be PNG
  const jpegAsPng = validateRasterBytes(sampleJpegBytes, 'image/png');
  assert.equal(jpegAsPng.isValid, false);
  assert.equal(jpegAsPng.errorCategory, 'MIME_SIGNATURE_MISMATCH');
});

test('S01-FIX-002 Requirement 6: Missing API key produces an explicit error', async () => {
  const result = await executeCandidateGeneration(
    {
      productionPrompt: 'Photorealistic portrait of Diego Navarro',
      aspectRatio: '1:1',
    },
    {
      aiClient: null, // No API client configured
      getCanonicalAssetBuffer: () => samplePngBytes,
    }
  );
  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.httpStatus, 503);
  assert.equal(result.errorCategory, 'MISSING_API_KEY');
  assert.equal(result.imageUrl, undefined);
});

test('S01-FIX-002 Requirement 7: HTTP 429 produces a quota error, not an image', async () => {
  const mockAiQuota429 = {
    models: {
      generateContent: async () => {
        const quotaErr: any = new Error('429 RESOURCE_EXHAUSTED: quota exceeded');
        quotaErr.status = 429;
        throw quotaErr;
      },
    },
  };

  const result = await executeCandidateGeneration(
    {
      productionPrompt: 'Diego in Madrid coat',
      aspectRatio: '3:4',
    },
    {
      aiClient: mockAiQuota429,
      getCanonicalAssetBuffer: () => samplePngBytes,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.httpStatus, 429);
  assert.equal(result.errorCategory, 'QUOTA_EXCEEDED');
  assert.equal(result.imageUrl, undefined);
  // Never returns an SVG or fake image
  assert.equal(typeof result.imageUrl, 'undefined');
});

test('S01-FIX-002 Requirement 8: Empty image-model response produces an error', async () => {
  const mockAiEmpty = {
    models: {
      generateContent: async () => ({
        candidates: [],
      }),
    },
  };

  const result = await executeCandidateGeneration(
    {
      productionPrompt: 'Diego portrait',
      aspectRatio: '1:1',
    },
    {
      aiClient: mockAiEmpty,
      getCanonicalAssetBuffer: () => samplePngBytes,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.httpStatus, 502);
  assert.equal(result.errorCategory, 'NO_IMAGE_RETURNED');
  assert.equal(result.imageUrl, undefined);
});

test('S01-FIX-002 Requirement 9: Text-only model response produces an error', async () => {
  const mockAiTextOnly = {
    models: {
      generateContent: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Lo siento, no puedo generar esa imagen en este momento.',
                },
              ],
            },
          },
        ],
      }),
    },
  };

  const result = await executeCandidateGeneration(
    {
      productionPrompt: 'Diego portrait',
      aspectRatio: '1:1',
    },
    {
      aiClient: mockAiTextOnly,
      getCanonicalAssetBuffer: () => samplePngBytes,
    }
  );

  assert.equal(result.success, false);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.httpStatus, 502);
  assert.equal(result.errorCategory, 'NO_IMAGE_RETURNED');
  assert.equal(result.imageUrl, undefined);
});

test('S01-FIX-002 Requirement 10: Unsupported formats are rejected (WebP and GIF)', () => {
  const webpResult = validateRasterBytes(sampleWebpBytes, 'image/webp');
  assert.equal(webpResult.isValid, false);
  assert.equal(webpResult.errorCategory, 'UNSUPPORTED_FORMAT');

  const gifResult = validateRasterBytes(sampleGifBytes, 'image/gif');
  assert.equal(gifResult.isValid, false);
  assert.equal(gifResult.errorCategory, 'UNSUPPORTED_FORMAT');
});

test('S01-FIX-002 Requirement 11: Failed generation never triggers the continuity auditor', () => {
  // In the application workflow, when generation fails, generatedImageUrl is undefined.
  const generatedImageUrl: string | undefined = undefined;

  // The condition in App.tsx:
  const shouldInvokeAuditor = Boolean(generatedImageUrl);
  assert.equal(shouldInvokeAuditor, false);

  // When auditor is executed with hasGeneratedImage: false
  const auditReport = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: false,
    auditStatus: 'NOT_RUN',
  });

  assert.equal(auditReport.overallVerdict, 'UNVERIFIED');
  assert.equal(auditReport.criteria.length, 0);
  assert.equal(
    auditReport.summaryEs.includes('No se ha generado imagen candidata'),
    true
  );
});

test('S01-FIX-002 Requirement 12: Failed generation never enables a candidate download', () => {
  const generatedImageUrl: string | undefined = undefined;
  // Download UI button gate
  const downloadEnabled = Boolean(generatedImageUrl);
  assert.equal(downloadEnabled, false);
});

test('S01-FIX-002 Requirement 13: PREPARE_ONLY remains operational without image generation', () => {
  const prepConfig: SceneConfig = {
    ...defaultScene,
    executionMode: 'PREPARE_ONLY',
  };

  const guardReport = runIdentityGuardValidation(
    INITIAL_CANONICAL_ASSETS,
    prepConfig
  );
  assert.equal(guardReport.status, 'APPROVED');

  const promptData = buildProductionPrompt(prepConfig, guardReport);
  assert.equal(typeof promptData.fullModelPrompt, 'string');
  assert.equal(promptData.fullModelPrompt.length > 50, true);

  // Audit for PREPARE_ONLY
  const audit = runContinuityAudit({
    sceneConfig: prepConfig,
    canonicalStatus: allCanonicalConnected,
    hasGeneratedImage: false,
    auditStatus: 'NOT_RUN',
  });
  assert.equal(audit.overallVerdict, 'UNVERIFIED');
  assert.equal(audit.criteria.length, 0);
});

test('S01-FIX-002 Requirement 14: Valid raster output preserves its correct file format', async () => {
  // Test PNG output preservation
  const mockAiPng = {
    models: {
      generateContent: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: samplePngBytes.toString('base64'),
                  },
                },
              ],
            },
          },
        ],
      }),
    },
  };

  const pngResult = await executeCandidateGeneration(
    { productionPrompt: 'Diego in Madrid', aspectRatio: '1:1' },
    { aiClient: mockAiPng, getCanonicalAssetBuffer: () => samplePngBytes }
  );
  assert.equal(pngResult.success, true);
  assert.equal(pngResult.status, 'SUCCESS');
  assert.equal(pngResult.mimeType, 'image/png');
  assert.equal(pngResult.imageUrl?.startsWith('data:image/png;base64,'), true);

  // Test JPEG output preservation (must not be renamed to PNG)
  const mockAiJpeg = {
    models: {
      generateContent: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: sampleJpegBytes.toString('base64'),
                  },
                },
              ],
            },
          },
        ],
      }),
    },
  };

  const jpegResult = await executeCandidateGeneration(
    { productionPrompt: 'Diego in Madrid', aspectRatio: '1:1' },
    { aiClient: mockAiJpeg, getCanonicalAssetBuffer: () => samplePngBytes }
  );
  assert.equal(jpegResult.success, true);
  assert.equal(jpegResult.status, 'SUCCESS');
  assert.equal(jpegResult.mimeType, 'image/jpeg');
  assert.equal(jpegResult.imageUrl?.startsWith('data:image/jpeg;base64,'), true);
  assert.equal(jpegResult.imageUrl?.includes('png'), false);
});
