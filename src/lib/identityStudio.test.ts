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

test('Continuity Auditor: Returns UNVERIFIED when image has not been generated', () => {
  const status = {
    '01_FACE_MASTER': true,
    '02_BODY_MASTER': true,
    '03_ACCESSORIES_MASTER': true,
    '04_EXPRESSIONS_MASTER': true,
  };
  const audit = runContinuityAudit({
    sceneConfig: defaultScene,
    canonicalStatus: status,
    hasGeneratedImage: false,
  });

  assert.equal(audit.overallVerdict, 'UNVERIFIED');
});

test('Continuity Auditor: Evaluates 9 criteria and marks occluded areas as REVIEW rather than auto-pass', () => {
  const status = {
    '01_FACE_MASTER': true,
    '02_BODY_MASTER': true,
    '03_ACCESSORIES_MASTER': true,
    '04_EXPRESSIONS_MASTER': true,
  };
  const closeUpScene: SceneConfig = { ...defaultScene, shotType: 'portrait' };
  const audit = runContinuityAudit({
    sceneConfig: closeUpScene,
    canonicalStatus: status,
    hasGeneratedImage: true,
  });

  assert.equal(audit.criteria.length, 9);
  // Head-body proportion in close-up should flag REVIEW for occluded torso
  const headBodyCrit = audit.criteria.find((c) => c.id === 'crit_head_body_prop');
  assert.ok(headBodyCrit);
  assert.equal(headBodyCrit.verdict, 'REVIEW');
});
