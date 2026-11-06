import { IdentityGuardReport, InspirationAnalysis, ProductionPromptData, SceneConfig } from './types';

export function buildProductionPrompt(
  sceneConfig: SceneConfig,
  identityGuard: IdentityGuardReport,
  inspirationAnalysis?: InspirationAnalysis
): ProductionPromptData {
  // Shot perspective mapping
  const shotDescriptions: Record<SceneConfig['shotType'], string> = {
    portrait:
      'Close-up intimate photographic portrait (head and shoulders framing, 50mm to 85mm prime lens perspective, shallow depth of field focusing on Diego’s authentic eye gaze and skin pores).',
    selfie:
      'High-angle handheld casual smartphone selfie taken with front camera, natural arm reach perspective, subtle wide-angle barrel distortion, authentic relaxed moment.',
    mirror_selfie:
      'Casual mirror selfie in clean interior, subject visible in mirror reflection holding a Midnight iPhone 14 in slim black silicone case with both or single hand, authentic ambient bathroom/bedroom/fitting-room reflections.',
    half_body:
      'Medium shot (half-body portrait from waist up, 35mm documentary focal length, balanced spatial framing with architectural background).',
    full_body:
      'Full-length environmental street style photograph capturing complete head-to-toe silhouette (1.83m tall athletic lean build, natural walking or standing posture, grounded footwear perspective).',
  };

  // Expression mapping
  const expressionDescriptions: Record<SceneConfig['expression'], string> = {
    neutral:
      'Direct authentic neutral expression, relaxed mouth, steady focused warm brown almond-shaped eyes, calm confident demeanor.',
    slight_smile:
      'Gentle subtle smile, slight upturned corners of the mouth, natural warmth in eyes with authentic soft crow’s feet wrinkles, approachable and pleasant.',
    concentration:
      'Intense focus and quiet concentration, subtle brow tension, contemplative gaze inspecting surroundings or an object, thoughtful intellectual mood.',
    soft_surprise:
      'Subtle spontaneous surprise, slightly raised dark natural eyebrows, slightly parted lips, alert and attentive eyes without caricature.',
    mid_speech:
      'Captured mid-conversation, mouth naturally parted as if articulating a thought, dynamic natural engagement, candid conversational realism.',
    tired:
      'End-of-day tired expression, relaxed lowered eyelids with faint natural dark circles, fatigue in facial muscles, authentic exhausted yet dignified look.',
    custom: sceneConfig.customExpressionText
      ? `Custom expression: ${sceneConfig.customExpressionText}`
      : 'Natural relaxed facial expression.',
  };

  // Realism style mapping
  const realismDescriptions: Record<SceneConfig['realismStyle'], string> = {
    casual_smartphone:
      'Shot on modern smartphone (iPhone 14 standard main camera f/1.8), organic candid snapshot lighting, natural unretouched skin texture with visible micro-pores and subtle blemishes, authentic lens flare, dynamic range reflecting real overcast or daylight conditions, zero digital HDR over-sharpening, absolutely no beauty filter or plastic glaze.',
    documentary_35mm:
      'Documentary street photography on 35mm film stock, organic fine grain, authentic natural color science, muted filmic contrast, realistic atmospheric light, photojournalistic truthfulness.',
    editorial_street:
      'High-end fashion editorial street snapshot, natural open-shade illumination, crisp textile texture definition, subtle bokeh separation from urban backdrop, restrained natural grading.',
  };

  // Wardrobe determination
  let clothingDirectives = '';
  if (sceneConfig.clothingMode === 'inspiration' && inspirationAnalysis) {
    clothingDirectives = `WARDROBE & STYLING (Transferred from inspiration reference): ${inspirationAnalysis.clothingAndLayering}. Adapted to Diego's 1.83m lean athletic proportions.`;
  } else if (sceneConfig.clothingCustomDescription) {
    clothingDirectives = `WARDROBE & STYLING: ${sceneConfig.clothingCustomDescription}. Tailored for Diego's 1.83m athletic frame.`;
  } else {
    clothingDirectives =
      'WARDROBE & STYLING: Clean modern menswear, relaxed dark knit sweater, layered overcoat, tailored dark trousers, minimalist understated palette.';
  }

  // Accessories determination
  let accessoriesDirectives = '';
  if (sceneConfig.glasses === 'on') {
    accessoriesDirectives +=
      ' ACCESSORIES MANDATE: Wearing Diego Navarro’s canonical round metallic silver wireframe glasses (Canon 03), thin bridge, minimalist temples. ';
  } else if (sceneConfig.glasses === 'off') {
    accessoriesDirectives +=
      ' ACCESSORIES MANDATE: NO glasses or spectacles worn. Diego’s bare face and warm almond eyes fully visible. ';
  } else {
    accessoriesDirectives +=
      ' ACCESSORIES MANDATE: Eyewear contextual to lighting; if glasses are worn they MUST be the canonical round silver metallic frames. ';
  }
  accessoriesDirectives +=
    'Diego wears his canonical minimalist 38mm silver Bauhaus watch with ivory dial and dark brown leather topstitched strap on left wrist (if wrist is in frame).';

  // Environment determination
  let environmentDirectives = '';
  if (sceneConfig.environmentMode === 'inspiration' && inspirationAnalysis) {
    environmentDirectives = `ENVIRONMENT & BACKDROP: ${inspirationAnalysis.environmentDetails}. Lighting: ${inspirationAnalysis.lightingDetails}.`;
  } else if (sceneConfig.environmentCustomDescription) {
    environmentDirectives = `ENVIRONMENT & BACKDROP: ${sceneConfig.environmentCustomDescription}.`;
  } else {
    environmentDirectives = `ENVIRONMENT & BACKDROP: ${sceneConfig.sceneDescription || 'Contemporary urban Madrid street architecture, natural daytime ambient light.'}`;
  }

  // Canonical Bindings
  const canonicalBindings: string[] = [];
  if (!identityGuard.missingAssets.includes('01_FACE_MASTER')) {
    canonicalBindings.push('LINKED: 01_FACE_MASTER (Supreme authority on facial anatomy, hair texture, skin tone & beard)');
  } else {
    canonicalBindings.push('WARNING: 01_FACE_MASTER disconnected — relying on fallback textual identity anchors');
  }

  if (!identityGuard.missingAssets.includes('02_BODY_MASTER')) {
    canonicalBindings.push('LINKED: 02_BODY_MASTER (Authority on 1.83m height, athletic lean physique, posture)');
  }

  if (!identityGuard.missingAssets.includes('03_ACCESSORIES_MASTER')) {
    canonicalBindings.push('LINKED: 03_ACCESSORIES_MASTER (Round silver wire glasses, Bauhaus ivory watch, Midnight iPhone 14)');
  }

  if (!identityGuard.missingAssets.includes('04_EXPRESSIONS_MASTER')) {
    canonicalBindings.push('LINKED: 04_EXPRESSIONS_MASTER (Canonical microexpression fidelity)');
  }

  const technicalDirectives = `FRAMING & COMPOSITION: ${shotDescriptions[sceneConfig.shotType]} ASPECT RATIO: ${sceneConfig.aspectRatio}. CAMERA & LIGHTING: ${realismDescriptions[sceneConfig.realismStyle]}`;

  const sceneDirectives = `SUBJECT & ACTION: Diego Navarro in scene: "${sceneConfig.sceneDescription || 'Casual moment captured on camera'}". EXPRESSION: ${expressionDescriptions[sceneConfig.expression]}. ${environmentDirectives}`;

  const negativeDirectives = `STRICT NEGATIVE PROMPT / RESTRAINTS: ${identityGuard.contextNegativeConstraints.join(', ')}`;

  // Construct full cohesive model prompt
  const fullModelPrompt = `[CANONICAL IDENTITY LOCK — SUBJECT 01: DIEGO NAVARRO]
PRIMARY SUBJECT: Adult male character named Diego Navarro, exactly 32 years old, Spanish/Mediterranean descent, warm olive-tan skin tone with natural unretouched texture and pores. Facial features: structured masculine jawline with organic definition, almond-shaped warm brown/hazel eyes, full natural dark eyebrows, short naturally curly dark brown hair with distinct curly ringlets on top and neat tapered sides, dense well-groomed 3-day stubble beard and mustache conforming 100% to official Character Reference Sheet (01_FACE_MASTER).
PHYSIQUE: 1.83m (6'0") tall, lean athletic build, proportionate torso, relaxed natural posture (Canon 02_BODY_MASTER).

[SCENE DIRECTIVES]
${sceneDirectives}

[WARDROBE & CANONICAL ACCESSORIES]
${clothingDirectives}
${accessoriesDirectives}

[PHOTOGRAPHIC SPECIFICATIONS & PERSPECTIVE]
${technicalDirectives}

[IDENTITY PRESERVATION MANDATE — IDENTITY GUARD]
CRITICAL: Do NOT borrow facial structure, hair color, eye shape, or ethnicity from any uploaded inspiration photograph. Diego Navarro's canonical face and body proportions must be strictly preserved. Preserve original facial bone structure, skin complexion, and authentic human photographic realism.

[NEGATIVE RESTRICTIONS]
${negativeDirectives}`;

  return {
    title: `PROMPT-DN-${sceneConfig.shotType.toUpperCase()}-${sceneConfig.aspectRatio}`,
    fullModelPrompt,
    canonicalBindings,
    sceneDirectives,
    clothingDirectives,
    technicalDirectives,
    negativeDirectives,
    aspectRatio: sceneConfig.aspectRatio,
    modelTarget: 'gemini-3.1-flash-lite-image / Gemini Multimodal Vision',
    supportsDirectVisionReference: true,
    noticeEs:
      'Prompt de producción estructurado según estándares de Subject 01 Alpha v0.2. Incluye anclajes biométricos fisonómicos, enlaces a bóveda canónica y barreras contra absorción de rasgos de la imagen de inspiración.',
  };
}
