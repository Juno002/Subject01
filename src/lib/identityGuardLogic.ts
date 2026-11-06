import { CanonicalAsset, CanonicalAssetId, IdentityGuardReport, InspirationAnalysis, SceneConfig } from './types';

export function runIdentityGuardValidation(
  canonicalAssets: CanonicalAsset[],
  sceneConfig: SceneConfig,
  inspirationAnalysis?: InspirationAnalysis
): IdentityGuardReport {
  const connectedMap = new Map<CanonicalAssetId, boolean>();
  canonicalAssets.forEach((asset) => {
    connectedMap.set(asset.id, asset.isConnected);
  });

  const missingAssets: CanonicalAssetId[] = [];
  (['01_FACE_MASTER', '02_BODY_MASTER', '03_ACCESSORIES_MASTER', '04_EXPRESSIONS_MASTER'] as CanonicalAssetId[]).forEach(
    (id) => {
      if (!connectedMap.get(id)) {
        missingAssets.push(id);
      }
    }
  );

  const detectedConflicts: IdentityGuardReport['detectedConflicts'] = [];
  const immutableConstraints: string[] = [];
  const contextNegativeConstraints: string[] = [];

  // 1. Mandatory Authority Check: 01_FACE_MASTER
  const hasFaceMaster = connectedMap.get('01_FACE_MASTER') === true;
  if (!hasFaceMaster) {
    detectedConflicts.push({
      type: 'MISSING_CANON',
      severity: 'HIGH',
      description:
        'CRÍTICO: 01_FACE_MASTER no está conectado. La identidad de Diego Navarro carece de anclaje facial verificado.',
      resolution:
        'Conectar 01_FACE_MASTER en la Bóveda Canónica para autorizar la fisonomía oficial.',
    });
  } else {
    immutableConstraints.push(
      'MANDATO FISONÓMICO: Diego Navarro, varón de 32 años, tez oliva cálida mediterránea, mandíbula angulada natural, ojos castaño avellana almendrados, cejas pobladas oscuras, cabello castaño oscuro con rizos naturales definidos en la parte superior y barba de 3 días densa y recortada simétrica.'
    );
  }

  // 2. Mandatory Authority Check: 02_BODY_MASTER
  const hasBodyMaster = connectedMap.get('02_BODY_MASTER') === true;
  if (!hasBodyMaster) {
    detectedConflicts.push({
      type: 'MISSING_CANON',
      severity: 'MEDIUM',
      description:
        'AVISO: 02_BODY_MASTER desconectado. Las proporciones anatómicas corporales (1.83 m, constitución atlética esbelta) operarán sin referencia visual directa.',
      resolution:
        'Conectar 02_BODY_MASTER para garantizar consistencia volumétrica del torso y postura.',
    });
  } else {
    immutableConstraints.push(
      'MANDATO ANATÓMICO: Estatura exacta 1.83 m, constitución atlética natural sin hipertrofia, hombros anchos proporcionados, vello natural moderado en antebrazos.'
    );
  }

  // 3. Authority Check: 03_ACCESSORIES_MASTER
  const hasAccessoriesMaster = connectedMap.get('03_ACCESSORIES_MASTER') === true;
  if (!hasAccessoriesMaster && sceneConfig.glasses !== 'off') {
    detectedConflicts.push({
      type: 'MISSING_CANON',
      severity: 'LOW',
      description:
        'AVISO: 03_ACCESSORIES_MASTER desconectado mientras se solicitan gafas o accesorios. Riesgo de desviación de montura metálica a pasta.',
      resolution:
        'Conectar 03_ACCESSORIES_MASTER para fijar montura metálica redonda y reloj Bauhaus.',
    });
  }

  // 4. Glasses Conflict Analysis
  if (sceneConfig.glasses === 'off') {
    immutableConstraints.push(
      'RESTRICCIÓN DE ACCESORIOS: Sin gafas. Desactivar explícitamente cualquier tipo de lente, montura o gafas de sol.'
    );
    contextNegativeConstraints.push('glasses, spectacles, eyewear, sunglasses, frames');
  } else if (sceneConfig.glasses === 'on') {
    immutableConstraints.push(
      'ACCESORIO CANÓNICO OBLIGATORIO: Gafas de montura metálica circular plateada mate, puente fino y patillas minimalistas (Canon 03). Prohibida montura de pasta negra o formas rectangulares gruesas.'
    );
    contextNegativeConstraints.push('thick plastic glasses, black acetate frames, colorful eyewear, aviator glasses');
  }

  // 5. Inspiration Image Conflict Analysis
  if (inspirationAnalysis) {
    // Check physique conflict
    detectedConflicts.push({
      type: 'PHYSIQUE_MISMATCH',
      severity: 'MEDIUM',
      description:
        'DISOCIACIÓN DE IDENTIDAD: La fotografía de inspiración contiene un modelo con fisonomía ajena. Se aislan exclusivamente las prendas, paleta cromática y lenguaje postural.',
      resolution:
        'Regla estricta de barrera: Se adapta el corte de la ropa a los 1.83 m y complexión atlética de Diego, descartando al sujeto de origen.',
    });

    detectedConflicts.push({
      type: 'FACIAL_STRUCTURE',
      severity: 'HIGH',
      description:
        'BLOQUEO FACIAL DE INSPIRACIÓN: Se prohíbe terminantemente transferir el peinado, color de ojos, edad o rasgos del modelo de referencia al sujeto Diego Navarro.',
      resolution:
        'El Face Master 01 sustituye al 100% la cabeza y rasgos faciales de cualquier persona en la foto de inspiración.',
    });
  }

  // Baseline negative constraints
  contextNegativeConstraints.push(
    'generic stock photo model, plastic airbrushed skin, CGI render look, exaggerated muscles, bodybuilder physique, distorted hands, extra fingers, missing fingers, asymmetry, bleached skin, blonde hair, baby face, aged face, fake studio glamour'
  );

  // Overall status evaluation
  let status: IdentityGuardReport['status'] = 'APPROVED';
  if (!hasFaceMaster) {
    status = 'BLOCKED';
  } else if (missingAssets.length > 0 || detectedConflicts.some((c) => c.severity === 'HIGH')) {
    status = 'CONDITIONAL_APPROVAL';
  }

  const explanationEs = !hasFaceMaster
    ? 'VALIDACIÓN RECHAZADA: La Bóveda Canónica carece de 01_FACE_MASTER. No se puede garantizar la identidad de Diego Navarro.'
    : missingAssets.length > 0
    ? `APROBACIÓN CONDICIONADA: 01_FACE_MASTER está activo garantizando la fisonomía facial. Se detectaron ${missingAssets.length} activos canónicos desconectados (${missingAssets.join(', ')}). Los parámetros faltantes se suplen mediante restricciones canónicas textuales forzadas.`
    : 'APROBACIÓN TOTAL: Los 4 activos canónicos están en línea. Los límites inmutables de Diego Navarro están blindados y disociados de la inspiración externa.';

  return {
    timestamp: new Date().toISOString(),
    status,
    connectedAssetsCount: 4 - missingAssets.length,
    missingAssets,
    fixedAttributesEnforced: {
      facialIdentity:
        'Diego Navarro (32 años, mediterráneo, mandíbula angulada, ojos castaños cálidos, cabello corto rizado natural y barba recortada de 3 días según Character Reference Sheet).',
      anatomyAndPhysique:
        'Estatura 1.83 m, constitución atlética esbelta, postura urbana contemporánea.',
      accessoriesCompliance:
        sceneConfig.glasses === 'off'
          ? 'Gafas deshabilitadas según directiva de escena.'
          : 'Gafas metálicas redondas y reloj Bauhaus plateado con correa de cuero marrón.',
      skinAndHair:
        'Piel con textura cutánea natural porosa y tono oliva cálido; cabello castaño oscuro con rizos definidos en la parte superior.',
    },
    detectedConflicts,
    immutableConstraints,
    contextNegativeConstraints,
    explanationEs,
  };
}
