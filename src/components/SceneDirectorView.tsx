import React, { useState } from 'react';
import {
  AspectRatio,
  ExecutionMode,
  ExpressionType,
  GlassesOption,
  SceneConfig,
  ShotType,
} from '../lib/types';
import { INSPIRATION_PRESETS, InspirationPreset } from '../lib/samplePresets';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Upload,
  X,
  SlidersHorizontal,
  Layers,
  HelpCircle,
  Play,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface SceneDirectorViewProps {
  sceneConfig: SceneConfig;
  onChangeConfig: (newConfig: SceneConfig) => void;
  onExecute: (mode: ExecutionMode) => void;
  isProcessing: boolean;
  processingStep: string;
}

export const SceneDirectorView: React.FC<SceneDirectorViewProps> = ({
  sceneConfig,
  onChangeConfig,
  onExecute,
  isProcessing,
  processingStep,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const updateField = <K extends keyof SceneConfig>(key: K, value: SceneConfig[K]) => {
    onChangeConfig({
      ...sceneConfig,
      [key]: value,
    });
  };

  const handleInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onChangeConfig({
          ...sceneConfig,
          inspirationImage: dataUrl,
          inspirationTitle: file.name,
        });
        setSelectedPresetId('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (preset: InspirationPreset) => {
    setSelectedPresetId(preset.id);
    onChangeConfig({
      ...sceneConfig,
      inspirationImage: preset.imageUrl,
      inspirationTitle: preset.title,
      shotType: preset.suggestedShotType,
      expression: preset.suggestedExpression,
      glasses: preset.suggestedGlasses,
      sceneDescription: preset.defaultSceneText,
      clothingMode: 'inspiration',
      environmentMode: 'inspiration',
    });
  };

  const handleRemoveInspiration = () => {
    setSelectedPresetId('');
    onChangeConfig({
      ...sceneConfig,
      inspirationImage: undefined,
      inspirationTitle: undefined,
      clothingMode: 'custom',
      environmentMode: 'custom',
    });
  };

  return (
    <div className="space-y-6">
      {/* Introduction Header */}
      <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 lg:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Etapa 02 // Director de Escena</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Definición y Parámetros de Producción
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Configure el encuadre fotográfico, vestuario, entorno y expresión de Diego Navarro.
              La subida de una imagen de inspiración es opcional y <strong>no dispara automáticamente</strong> la generación de imágenes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
              Modo actual: <strong className="text-cyan-400">{sceneConfig.executionMode === 'GENERATE' ? 'GENERAR IMAGEN' : 'SOLO PREPARAR'}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Inspiration & Presets (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>A. Fotografía de Inspiración (Opcional)</span>
              </label>
              {sceneConfig.inspirationImage && (
                <button
                  type="button"
                  onClick={handleRemoveInspiration}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Quitar</span>
                </button>
              )}
            </div>

            {/* Inspiration Canvas / Upload Area */}
            {sceneConfig.inspirationImage ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3] group">
                <img
                  src={sceneConfig.inspirationImage}
                  alt="Referencia de inspiración"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <span className="text-xs text-slate-200 font-medium">
                    {sceneConfig.inspirationTitle || 'Referencia cargada'}
                  </span>
                  <label className="px-3 py-1.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 text-xs font-mono cursor-pointer hover:bg-cyan-900/80">
                    Cambiar Fotografía
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInspirationUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-xs px-2.5 py-1.5 rounded text-[11px] font-mono text-slate-300 border border-slate-800 flex items-center justify-between">
                  <span className="truncate">{sceneConfig.inspirationTitle || 'Referencia activa'}</span>
                  <span className="text-cyan-400 text-[10px]">ANALIZABLE</span>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900/30 cursor-pointer transition-colors text-center group">
                <div className="p-3 rounded-full bg-slate-800 text-slate-400 group-hover:text-cyan-400 mb-2 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-300">
                  Subir foto de Pinterest, lookbook o pose
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  JPG, PNG o WebP (Se aislará el estilo, descartando la identidad)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInspirationUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Presets List */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                O seleccione un escenario preestablecido:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INSPIRATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      selectedPresetId === preset.id
                        ? 'border-cyan-500 bg-cyan-950/20 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">
                        {preset.category}
                      </span>
                      <strong className="text-xs font-semibold text-slate-100 block line-clamp-1">
                        {preset.title}
                      </strong>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Cargar look y parámetros
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Guardrail Callout */}
            <div className="bg-[#070A11] p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                <strong>Garantía de identidad:</strong> El Analizador de Inspiración extrae prendas, iluminación y postura, pero <strong>jamás</strong> reemplaza el rostro, vello facial ni anatomía de Diego Navarro.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Scene Description & Physical Selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-5">
            {/* Natural Language Scene Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="scene-description-input"
                  className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold"
                >
                  B. Descripción de la Escena Deseada (Lenguaje Natural)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Detalles narrativos y espaciales
                </span>
              </div>
              <textarea
                id="scene-description-input"
                rows={3}
                value={sceneConfig.sceneDescription}
                onChange={(e) => updateField('sceneDescription', e.target.value)}
                placeholder="Ejemplo: Diego caminando por la calle Jorge Juan en Madrid con paso tranquilo. Lleva abrigo sastre camel sobre jersey de cuello subido. Mirada afable hacia la cámara con sonrisa leve."
                className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Selectors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              {/* Shot Type */}
              <div className="space-y-1.5">
                <label
                  htmlFor="shot-type-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Tipo de Plano (Shot Type)
                </label>
                <select
                  id="shot-type-select"
                  value={sceneConfig.shotType}
                  onChange={(e) => updateField('shotType', e.target.value as ShotType)}
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="portrait">Retrato (Primer plano cerrado)</option>
                  <option value="selfie">Selfie (Cámara frontal en mano)</option>
                  <option value="mirror_selfie">Selfie en espejo (Con iPhone 14)</option>
                  <option value="half_body">Plano medio (Cintura hacia arriba)</option>
                  <option value="full_body">Cuerpo entero (Silueta 1.83 m)</option>
                </select>
              </div>

              {/* Expression */}
              <div className="space-y-1.5">
                <label
                  htmlFor="expression-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Expresión Emocional (Canon 04)
                </label>
                <select
                  id="expression-select"
                  value={sceneConfig.expression}
                  onChange={(e) => updateField('expression', e.target.value as ExpressionType)}
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="neutral">Neutral (Calma y serenidad)</option>
                  <option value="slight_smile">Sonrisa leve (Natural y cercana)</option>
                  <option value="concentration">Concentración (Foco intelectual)</option>
                  <option value="soft_surprise">Sorpresa sutil (Ojos atentos)</option>
                  <option value="mid_speech">Hablando (Mid-speech orgánico)</option>
                  <option value="tired">Cansado (Fatiga fin de jornada)</option>
                  <option value="custom">Personalizada...</option>
                </select>
              </div>

              {/* Custom Expression input if custom selected */}
              {sceneConfig.expression === 'custom' && (
                <div className="sm:col-span-2 space-y-1">
                  <label
                    htmlFor="custom-expression-input"
                    className="text-xs font-mono text-cyan-400"
                  >
                    Detalle de expresión personalizada:
                  </label>
                  <input
                    id="custom-expression-input"
                    type="text"
                    value={sceneConfig.customExpressionText || ''}
                    onChange={(e) => updateField('customExpressionText', e.target.value)}
                    placeholder="Ej. Mirada reflexiva hacia el horizonte con ceño relajado"
                    className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Glasses */}
              <div className="space-y-1.5">
                <label
                  htmlFor="glasses-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Gafas Metálicas (Canon 03)
                </label>
                <select
                  id="glasses-select"
                  value={sceneConfig.glasses}
                  onChange={(e) => updateField('glasses', e.target.value as GlassesOption)}
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="on">Con gafas (Montura alambre plata)</option>
                  <option value="off">Sin gafas (Rostro despejado)</option>
                  <option value="contextual">Contextual (Según actividad/luz)</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label
                  htmlFor="aspect-ratio-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Relación de Aspecto
                </label>
                <select
                  id="aspect-ratio-select"
                  value={sceneConfig.aspectRatio}
                  onChange={(e) => updateField('aspectRatio', e.target.value as AspectRatio)}
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="1:1">1:1 (Cuadrado estándar)</option>
                  <option value="4:5">4:5 (Vertical editorial / feed)</option>
                  <option value="9:16">9:16 (Story móvil vertical)</option>
                  <option value="16:9">16:9 (Panorámico cinematográfico)</option>
                </select>
              </div>

              {/* Realism Style */}
              <div className="space-y-1.5">
                <label
                  htmlFor="realism-style-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Estilo Fotográfico / Realismo
                </label>
                <select
                  id="realism-style-select"
                  value={sceneConfig.realismStyle}
                  onChange={(e) =>
                    updateField(
                      'realismStyle',
                      e.target.value as SceneConfig['realismStyle']
                    )
                  }
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="casual_smartphone">
                    Fotografía casual de smartphone (Default)
                  </option>
                  <option value="documentary_35mm">Fotografía documental 35mm</option>
                  <option value="editorial_street">Editorial de moda urbana</option>
                </select>
              </div>

              {/* Clothing Source */}
              <div className="space-y-1.5">
                <label
                  htmlFor="clothing-mode-select"
                  className="text-xs font-mono text-slate-300 font-medium block"
                >
                  Fuente de Vestuario
                </label>
                <select
                  id="clothing-mode-select"
                  value={sceneConfig.clothingMode}
                  onChange={(e) =>
                    updateField('clothingMode', e.target.value as 'inspiration' | 'custom')
                  }
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="inspiration" disabled={!sceneConfig.inspirationImage}>
                    {sceneConfig.inspirationImage
                      ? 'Inspirada en foto de referencia'
                      : 'Inspiración (Requiere subir foto)'}
                  </option>
                  <option value="custom">Descripción manual de prendas</option>
                </select>
              </div>
            </div>

            {/* Custom clothing detail if selected */}
            {sceneConfig.clothingMode === 'custom' && (
              <div className="space-y-1 pt-1">
                <label
                  htmlFor="custom-clothing-input"
                  className="text-xs font-mono text-slate-300"
                >
                  Descripción de vestimenta:
                </label>
                <input
                  id="custom-clothing-input"
                  type="text"
                  value={sceneConfig.clothingCustomDescription}
                  onChange={(e) => updateField('clothingCustomDescription', e.target.value)}
                  placeholder="Ej. Cazadora vaquera oscura desestructurada sobre camiseta blanca básica"
                  className="w-full bg-[#080C14] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* Execution Mode Selector & Launch Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-2">
                  D. Modo de Ejecución de Producción
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PREPARE ONLY button */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      sceneConfig.executionMode === 'PREPARE_ONLY'
                        ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                        : 'border-slate-800 bg-[#090D14] hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="executionMode"
                      value="PREPARE_ONLY"
                      checked={sceneConfig.executionMode === 'PREPARE_ONLY'}
                      onChange={() => updateField('executionMode', 'PREPARE_ONLY')}
                      className="mt-1 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <strong className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span>SOLO PREPARAR</span>
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Analiza referencias, ejecuta Identity Guard y genera el prompt de producción sin consumir modelo de imagen.
                      </p>
                    </div>
                  </label>

                  {/* GENERATE button */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      sceneConfig.executionMode === 'GENERATE'
                        ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                        : 'border-slate-800 bg-[#090D14] hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="executionMode"
                      value="GENERATE"
                      checked={sceneConfig.executionMode === 'GENERATE'}
                      onChange={() => updateField('executionMode', 'GENERATE')}
                      className="mt-1 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <strong className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>GENERAR IMAGEN</span>
                      </strong>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Prepara el prompt, produce exactamente 1 imagen candidata con el modelo Google y ejecuta la auditoría de continuidad.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onExecute(sceneConfig.executionMode)}
                  className={`w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                    isProcessing
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white hover:shadow-cyan-500/20'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>{processingStep || 'Procesando flujo de producción...'}</span>
                    </>
                  ) : sceneConfig.executionMode === 'GENERATE' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      <span>Ejecutar Producción (Generar 1 Candidato + Auditoría)</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-cyan-200" />
                      <span>Ejecutar Análisis y Construir Prompt (Sin Generar)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
