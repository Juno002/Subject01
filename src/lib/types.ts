export type CanonicalAssetId =
  | '01_FACE_MASTER'
  | '02_BODY_MASTER'
  | '03_ACCESSORIES_MASTER'
  | '04_EXPRESSIONS_MASTER';

export interface CanonicalAsset {
  id: CanonicalAssetId;
  code: string;
  title: string;
  subtitle: string;
  authorityDomain: string;
  description: string;
  technicalSpecs: string[];
  imageUrl: string;
  isConnected: boolean;
  anglesOrViews: string[];
  lastUpdated: string;
}

export type ShotType =
  | 'portrait'
  | 'selfie'
  | 'mirror_selfie'
  | 'half_body'
  | 'full_body';

export type ExpressionType =
  | 'neutral'
  | 'slight_smile'
  | 'concentration'
  | 'soft_surprise'
  | 'mid_speech'
  | 'tired'
  | 'custom';

export type GlassesOption = 'on' | 'off' | 'contextual';

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

export type ExecutionMode = 'PREPARE_ONLY' | 'GENERATE';

export interface SceneConfig {
  shotType: ShotType;
  expression: ExpressionType;
  customExpressionText?: string;
  glasses: GlassesOption;
  clothingMode: 'inspiration' | 'custom';
  clothingCustomDescription: string;
  environmentMode: 'inspiration' | 'custom';
  environmentCustomDescription: string;
  sceneDescription: string;
  aspectRatio: AspectRatio;
  realismStyle: 'casual_smartphone' | 'documentary_35mm' | 'editorial_street';
  executionMode: ExecutionMode;
  inspirationImage?: string; // base64 or url
  inspirationTitle?: string;
}

export interface InspirationAnalysis {
  clothingAndLayering: string;
  accessoriesDetected: string;
  subjectPose: string;
  cameraAngleAndFraming: string;
  environmentDetails: string;
  lightingDetails: string;
  visualComposition: string;
  photographicCharacteristics: string;
  transferableElements: string[];
  identitySeparationNotice: string;
  physiqueAdaptationNotes: string;
  rawSummary: string;
}

export interface IdentityGuardReport {
  timestamp: string;
  status: 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'BLOCKED';
  connectedAssetsCount: number;
  missingAssets: CanonicalAssetId[];
  fixedAttributesEnforced: {
    facialIdentity: string;
    anatomyAndPhysique: string;
    accessoriesCompliance: string;
    skinAndHair: string;
  };
  detectedConflicts: Array<{
    type: 'FACIAL_STRUCTURE' | 'PHYSIQUE_MISMATCH' | 'ACCESSORIES' | 'MISSING_CANON';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    resolution: string;
  }>;
  immutableConstraints: string[];
  contextNegativeConstraints: string[];
  explanationEs: string;
}

export interface ProductionPromptData {
  title: string;
  fullModelPrompt: string;
  canonicalBindings: string[];
  sceneDirectives: string;
  clothingDirectives: string;
  technicalDirectives: string;
  negativeDirectives: string;
  aspectRatio: AspectRatio;
  modelTarget: string;
  supportsDirectVisionReference: boolean;
  noticeEs: string;
}

export type AuditVerdict = 'PASS' | 'REVIEW' | 'FAIL' | 'UNVERIFIED';

export type AssessmentType =
  | 'VERIFIED_COMPARISON'
  | 'UNASSESSABLE_OCCLUSION'
  | 'MISSING_REFERENCE'
  | 'TECHNICAL_FAILURE'
  | 'UNVERIFIED_NO_EVIDENCE';

export type AuditExecutionStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'UNSUPPORTED_FORMAT'
  | 'EMPTY'
  | 'MALFORMED'
  | 'NOT_RUN';

export type AuditErrorCategory =
  | 'MISSING_CANDIDATE_IMAGE'
  | 'UNSUPPORTED_IMAGE_FORMAT'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'QUOTA_EXHAUSTED'
  | 'MODEL_TIMEOUT'
  | 'MALFORMED_MODEL_RESPONSE'
  | 'REFERENCE_ATTACHMENT_FAILED'
  | 'UNKNOWN_SERVER_ERROR';

export type GenerationErrorCategory =
  | 'MISSING_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_MODEL'
  | 'AUTH_FAILURE'
  | 'NETWORK_FAILURE'
  | 'UNEXPECTED_RESPONSE'
  | 'NO_IMAGE_RETURNED'
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_IMAGE_BYTES'
  | 'MISSING_MANDATORY_REFERENCE';

export interface ServerAuditExecutionMetadata {
  executionStatus: AuditExecutionStatus;
  modelIdentifier?: string;
  candidateImageAttached: boolean;
  attachedReferences: CanonicalAssetId[];
  evaluatedCriteria: string[];
  validStructuredDataReturned: boolean;
  errorCategory?: AuditErrorCategory;
  errorMessage?: string;
  timestamp: string;
}

export interface AuditCriterion {
  id: string;
  label: string;
  domain: string;
  verdict: AuditVerdict;
  observations: string;
  evidence: string;
  referenceSource: string;
  assessmentType?: AssessmentType;
}

export interface ContinuityAuditReport {
  overallVerdict: AuditVerdict;
  timestamp: string;
  summaryEs: string;
  criteria: AuditCriterion[];
  suggestedCorrections: string[];
  unassessableNotice?: string;
  auditExecutionStatus?: AuditExecutionStatus;
  serverExecutionMetadata?: ServerAuditExecutionMetadata;
}

export interface ProductionResult {
  id: string;
  createdAt: string;
  executionMode: ExecutionMode;
  sceneConfig: SceneConfig;
  canonicalStatus: Record<CanonicalAssetId, boolean>;
  inspirationAnalysis?: InspirationAnalysis;
  identityGuardReport: IdentityGuardReport;
  productionPrompt: ProductionPromptData;
  generatedImageUrl?: string;
  continuityAudit?: ContinuityAuditReport;
  generationDurationMs?: number;
  modelUsed?: string;
  quotaNotice?: string;
  generationError?: {
    category: GenerationErrorCategory | string;
    message: string;
    httpStatus?: number;
  };
}
