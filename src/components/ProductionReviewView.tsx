import React, { useState } from 'react';
import { ProductionResult } from '../lib/types';
import {
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  Maximize2,
  FileCode,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Camera,
} from 'lucide-react';

interface ProductionReviewViewProps {
  productionResult: ProductionResult | null;
  onReviseScene: () => void;
  onPrepareCorrectedPrompt: () => void;
  onNewProduction: () => void;
}

export const ProductionReviewView: React.FC<ProductionReviewViewProps> = ({
  productionResult,
  onReviseScene,
  onPrepareCorrectedPrompt,
  onNewProduction,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!productionResult) {
    return (
      <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Camera className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">
            Sin Corrida de Producción Activa
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Diríjase al <strong>Director de Escena</strong> y seleccione "SOLO PREPARAR" o
            "GENERAR IMAGEN" para visualizar los resultados de la auditoría y el candidato fotográfico.
          </p>
        </div>
      </div>
    );
  }

  const {
    sceneConfig,
    productionPrompt,
    generatedImageUrl,
    continuityAudit,
    identityGuardReport,
    executionMode,
    modelUsed,
  } = productionResult;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(productionPrompt.fullModelPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `DiegoNavarro_Candidate_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const verdictStyles = {
    PASS: {
      bg: 'bg-emerald-950/30 border-emerald-800 text-emerald-300',
      badge: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      label: 'PASS // APROBADO',
    },
    REVIEW: {
      bg: 'bg-amber-950/30 border-amber-800 text-amber-300',
      badge: 'bg-amber-900/60 text-amber-200 border-amber-700',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      label: 'REVIEW // REVISIÓN REQUERIDA',
    },
    FAIL: {
      bg: 'bg-rose-950/30 border-rose-800 text-rose-300',
      badge: 'bg-rose-900/60 text-rose-200 border-rose-700',
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
      label: 'FAIL // DISCREPANCIA CRÍTICA',
    },
    UNVERIFIED: {
      bg: 'bg-slate-900/60 border-slate-700 text-slate-300',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
      label: 'UNVERIFIED // NO VERIFICADO',
    },
  }[continuityAudit?.overallVerdict || 'UNVERIFIED'];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Etapa 04 // Revisión de Producción</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            Informe de Producción y Auditoría de Continuidad
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modo: <strong className="text-cyan-400">{executionMode}</strong> • Modelo:{' '}
            <span className="font-mono text-slate-300">{modelUsed || 'Prompt Compiler v0.2'}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {generatedImageUrl && (
            <button
              onClick={handleDownloadImage}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar Candidato</span>
            </button>
          )}

          <button
            onClick={onReviseScene}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Modificar en Director</span>
          </button>

          <button
            onClick={onNewProduction}
            className="px-3.5 py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 border border-cyan-800/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nueva Producción</span>
          </button>
        </div>
      </div>

      {/* Main Review Layout: Left (Image/Preview) & Right (Auditor Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generated Candidate & Scene Recap (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Candidate Image Card */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl overflow-hidden space-y-3">
            <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Candidato Fotográfico Generado</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                NO AGREGAR AL CANON
              </span>
            </div>

            <div className="px-4 pb-4">
              {generatedImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/5] group flex items-center justify-center">
                  <img
                    src={generatedImageUrl}
                    alt="Candidato de producción de Diego Navarro"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="px-3 py-1.5 rounded-md bg-slate-800 text-cyan-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Inspeccionar Zoom</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-800 rounded-lg text-center space-y-2 bg-[#090D14]">
                  <p className="text-xs text-slate-400">
                    Modo <strong>SOLO PREPARAR</strong> ejecutado.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Se generó y auditó el prompt de producción sin consumir cuota del modelo de imagen.
                  </p>
                  <button
                    onClick={onReviseScene}
                    className="mt-2 text-xs font-mono text-cyan-400 hover:underline"
                  >
                    Cambiar a modo GENERAR en Director de Escena →
                  </button>
                </div>
              )}
            </div>

            {/* Scene Recap Details */}
            <div className="p-4 bg-slate-900/30 border-t border-slate-800 text-xs space-y-2">
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider block">
                Parámetros de la Escena:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Plano:</span>
                  <span className="capitalize">{sceneConfig.shotType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Expresión:</span>
                  <span className="capitalize">{sceneConfig.expression}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Gafas:</span>
                  <span className="capitalize">{sceneConfig.glasses}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Aspect Ratio:</span>
                  <span>{sceneConfig.aspectRatio}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Used References Status Card */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block">
              Conexión de Activos Canónicos Durante la Corrida:
            </span>
            <ul className="space-y-1.5 text-xs">
              {productionPrompt.canonicalBindings.map((binding, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 bg-[#080C14] p-2 rounded border border-slate-800/80 font-mono text-[11px] text-slate-300"
                >
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{binding}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Continuity Auditor & Production Prompt (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 7. CONTINUITY AUDITOR REPORT CARD */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold block">
                  Auditor de Continuidad // Post-Generación
                </span>
                <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
                  Evaluación de Fidelidad y Ausencia de Discrepancias
                </h3>
              </div>

              {/* Status Badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${verdictStyles.bg}`}
              >
                {verdictStyles.icon}
                <span>{verdictStyles.label}</span>
              </div>
            </div>

            {/* Auditor Summary Statement */}
            <div className="bg-[#090D14] p-3.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong className="text-slate-100 block mb-1">Dictamen del Auditor:</strong>
              {continuityAudit?.summaryEs}
            </div>

            {/* Criteria Evaluation List (9 Points) */}
            <div className="space-y-2.5">
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider block">
                Desglose de los 9 Criterios de Continuidad:
              </span>

              <div className="space-y-2">
                {continuityAudit?.criteria.map((crit) => {
                  const critBadge = {
                    PASS: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
                    REVIEW: 'bg-amber-950/60 text-amber-300 border-amber-800',
                    FAIL: 'bg-rose-950/60 text-rose-300 border-rose-800',
                    UNVERIFIED: 'bg-slate-800 text-slate-400 border-slate-700',
                  }[crit.verdict];

                  return (
                    <div
                      key={crit.id}
                      className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200">{crit.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${critBadge}`}>
                          {crit.verdict}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{crit.observations}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>Evidencia: {crit.evidence}</span>
                        <span className="text-cyan-400">Ref: {crit.referenceSource}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Occlusion Safeguard Notice */}
            {continuityAudit?.unassessableNotice && (
              <div className="p-3 rounded-lg bg-[#070A11] border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>{continuityAudit.unassessableNotice}</p>
              </div>
            )}

            {/* Suggested Corrections */}
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="font-mono text-[10px] text-amber-400 uppercase tracking-wider block">
                Observaciones y Correcciones Sugeridas:
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {continuityAudit?.suggestedCorrections.map((corr, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{corr}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  onClick={onPrepareCorrectedPrompt}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
                >
                  Preparar Prompt Corregido con Observaciones
                </button>
              </div>
            </div>
          </div>

          {/* Inspectable Production Prompt */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">
                  Prompt de Producción para Modelo de Imagen (Inspectable)
                </span>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono flex items-center gap-1 border border-slate-700"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="relative">
              <pre
                className={`bg-[#070A11] p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto transition-all ${
                  isPromptExpanded ? 'max-h-none' : 'max-h-48 overflow-y-hidden'
                }`}
              >
                {productionPrompt.fullModelPrompt}
              </pre>
              {!isPromptExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070A11] to-transparent pointer-events-none" />
              )}
            </div>

            <button
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
              className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center justify-center gap-1 border border-slate-800"
            >
              {isPromptExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Contraer Prompt</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Ver Prompt Completo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Modal for Generated Image */}
      {isImageModalOpen && generatedImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#0B101B] border border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Inspección de Detalle Fotográfico // Diego Navarro
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Candidato #01 • {sceneConfig.shotType.toUpperCase()} • {sceneConfig.aspectRatio}
                </span>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Cerrar (ESC)
              </button>
            </div>

            <div className="aspect-[4/5] max-h-[70vh] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={generatedImageUrl}
                alt="Ampliación del candidato"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
