import React from 'react';
import { IdentityGuardReport, InspirationAnalysis } from '../lib/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  EyeOff,
  Sparkles,
  Camera,
  Shirt,
  Scissors,
} from 'lucide-react';

interface IdentityGuardViewProps {
  guardReport: IdentityGuardReport | null;
  inspirationAnalysis?: InspirationAnalysis | null;
  hasInspirationImage: boolean;
}

export const IdentityGuardView: React.FC<IdentityGuardViewProps> = ({
  guardReport,
  inspirationAnalysis,
  hasInspirationImage,
}) => {
  if (!guardReport) {
    return (
      <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">
            Identity Guard en Espera
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure la escena en el <strong>Director de Escena</strong> y pulse "Ejecutar" para
            desencadenar el análisis de inspiración y el blindaje fisonómico de Diego Navarro.
          </p>
        </div>
      </div>
    );
  }

  const statusColors = {
    APPROVED: {
      bg: 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300',
      badge: 'bg-emerald-900/60 text-emerald-200 border-emerald-700',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      label: 'APROBADO // IDENTIDAD BLINDADA',
    },
    CONDITIONAL_APPROVAL: {
      bg: 'bg-amber-950/20 border-amber-800/60 text-amber-300',
      badge: 'bg-amber-900/60 text-amber-200 border-amber-700',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      label: 'APROBACIÓN CONDICIONADA',
    },
    BLOCKED: {
      bg: 'bg-rose-950/20 border-rose-800/60 text-rose-300',
      badge: 'bg-rose-900/60 text-rose-200 border-rose-700',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      label: 'PRODUCCIÓN BLOQUEADA // FALTA 01_FACE_MASTER',
    },
  }[guardReport.status];

  return (
    <div className="space-y-6">
      {/* Status Header Banner */}
      <div className={`p-5 lg:p-6 rounded-xl border ${statusColors.bg} space-y-3 shadow-lg`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {statusColors.icon}
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${statusColors.badge}`}>
                {statusColors.label}
              </span>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight mt-1">
                Validación de Identidad Previa a Generación
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span>Activos Conectados:</span>
            <strong className="text-cyan-400">{guardReport.connectedAssetsCount}/4</strong>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
          {guardReport.explanationEs}
        </p>
      </div>

      {/* 3. INSPIRATION ANALYZER SECTION (If image provided) */}
      {hasInspirationImage && inspirationAnalysis && (
        <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Analizador de Inspiración // Interpretación Estructurada
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              DISOCIACIÓN DE IDENTIDAD ACTIVA
            </span>
          </div>

          {/* Identity Separation Callout Box */}
          <div className="bg-[#080C14] border border-cyan-900/40 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold">
              <UserCheck className="w-4 h-4" />
              <span>PROTOCOLO DE SEPARACIÓN: SUJETO DE ORIGEN DESCARTADO</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {inspirationAnalysis.identitySeparationNotice}
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Adaptación física: {inspirationAnalysis.physiqueAdaptationNotes}
            </p>
          </div>

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase flex items-center gap-1">
                <Shirt className="w-3 h-3" /> Prendas y Capas
              </span>
              <p className="text-slate-300">{inspirationAnalysis.clothingAndLayering}</p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase flex items-center gap-1">
                <Camera className="w-3 h-3" /> Postura y Encuadre
              </span>
              <p className="text-slate-300">{inspirationAnalysis.subjectPose}</p>
              <p className="text-[11px] text-slate-400">{inspirationAnalysis.cameraAngleAndFraming}</p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                Iluminación y Entorno
              </span>
              <p className="text-slate-300">{inspirationAnalysis.lightingDetails}</p>
              <p className="text-[11px] text-slate-400">{inspirationAnalysis.environmentDetails}</p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 uppercase">
                Elementos Transferibles
              </span>
              <ul className="space-y-0.5 text-slate-300">
                {inspirationAnalysis.transferableElements.map((el, i) => (
                  <li key={i} className="flex items-center gap-1 text-[11px]">
                    <span className="text-cyan-400">•</span>
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 4. IDENTITY GUARD FINDINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fixed Attributes Enforced (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Atributos Canónicos Inmutables Fijados para Diego Navarro</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase">
                Fisonomía Facial (01_FACE_MASTER)
              </span>
              <p className="text-slate-300">{guardReport.fixedAttributesEnforced.facialIdentity}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase">
                Anatomía y Talla (02_BODY_MASTER)
              </span>
              <p className="text-slate-300">{guardReport.fixedAttributesEnforced.anatomyAndPhysique}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase">
                Accesorios Verificados (03_ACCESSORIES)
              </span>
              <p className="text-slate-300">{guardReport.fixedAttributesEnforced.accessoriesCompliance}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 space-y-1">
              <span className="font-mono text-[10px] text-cyan-400 uppercase">
                Textura Cutánea y Barba
              </span>
              <p className="text-slate-300">{guardReport.fixedAttributesEnforced.skinAndHair}</p>
            </div>
          </div>

          {/* Immutable constraints list */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">
              Reglas de Anclaje Incondicionales:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {guardReport.immutableConstraints.map((c, i) => (
                <li key={i} className="flex items-start gap-2 bg-[#090D14] p-2.5 rounded border border-slate-800/80">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conflicts and Negative Constraints (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Detected Conflicts */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Conflictos Detectados y Resolución ({guardReport.detectedConflicts.length})</span>
            </h3>

            {guardReport.detectedConflicts.length === 0 ? (
              <p className="text-xs text-emerald-400 font-mono bg-emerald-950/20 p-3 rounded border border-emerald-900/40">
                ✓ No se detectaron conflictos entre la inspiración y el canon.
              </p>
            ) : (
              <div className="space-y-2.5">
                {guardReport.detectedConflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-300">
                        {conflict.type}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          conflict.severity === 'HIGH'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {conflict.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-snug">{conflict.description}</p>
                    <p className="text-cyan-400 text-[11px] font-mono leading-snug">
                      ↳ Protocolo: {conflict.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context Negative Constraints */}
          <div className="bg-[#0D121F] border border-slate-800 rounded-xl p-5 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-rose-400" />
              <span>Restricciones Negativas Forzadas</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Filtros inyectados al modelo para prevenir piel plástica, embellecimiento artificial y rasgos ajenos:
            </p>
            <div className="p-3 rounded-lg bg-[#070A11] border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
              {guardReport.contextNegativeConstraints.join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
