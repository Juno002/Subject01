import React, { useState } from 'react';
import { CanonicalAsset, CanonicalAssetId } from '../lib/types';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Upload,
  Maximize2,
  Lock,
  AlertOctagon,
  Sparkles,
  Info,
} from './Icons';

interface CanonVaultViewProps {
  canonicalAssets: CanonicalAsset[];
  onToggleConnection: (id: CanonicalAssetId) => void;
  onUpdateAssetImage: (id: CanonicalAssetId, newImageUrl: string) => void;
}

export const CanonVaultView: React.FC<CanonVaultViewProps> = ({
  canonicalAssets,
  onToggleConnection,
  onUpdateAssetImage,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<CanonicalAsset | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    assetId: CanonicalAssetId
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce canonical reference format: PNG only
    if (file.type && file.type !== 'image/png') {
      console.warn('Solo se admiten referencias canónicas en formato PNG.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && dataUrl.startsWith('data:image/png')) {
        onUpdateAssetImage(assetId, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="space-y-6">
      {/* Top Banner & Safeguard Statement */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/20 border border-slate-800 rounded-xl p-5 lg:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Bóveda Canónica // Repositorio Maestro de Identidad</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Activos de Referencia de Diego Navarro
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Cada activo posee autoridad exclusiva y delimitada sobre su ámbito. Las referencias
              canónicas son inmutables y <strong>nunca son sobreescritas</strong> de forma
              automática por las imágenes generadas durante la producción.
            </p>
          </div>

          <div className="bg-[#090D14] border border-cyan-500/20 rounded-lg p-3.5 flex items-start gap-3 min-w-[280px]">
            <AlertOctagon className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-slate-200 block">
                Principio de Autoridad Canónica
              </span>
              <p className="text-slate-400 leading-relaxed">
                Ninguna imagen de inspiración externa puede sustituir el rostro (Face Master) ni la
                anatomía (Body Master).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Canonical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {canonicalAssets.map((asset) => (
          <div
            key={asset.id}
            className={`flex flex-col bg-[#0D121F] border rounded-xl overflow-hidden transition-all duration-200 ${
              asset.isConnected
                ? 'border-slate-800 hover:border-slate-700 shadow-md'
                : 'border-red-950/60 bg-red-950/10 opacity-80'
            }`}
          >
            {/* Card Header */}
            <div className="px-5 py-3.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/50">
                  {asset.code}
                </span>
                <h3 className="font-semibold text-slate-200 text-sm tracking-tight">
                  {asset.title}
                </h3>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-medium ${
                    asset.isConnected ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {asset.isConnected ? 'CONECTADO' : 'DESCONECTADO'}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleConnection(asset.id)}
                  aria-label={`Alternar conexión de ${asset.title}`}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    asset.isConnected ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      asset.isConnected ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Visual Canvas Display */}
            <div className="relative bg-[#070A11] p-3 aspect-[4/3] flex items-center justify-center overflow-hidden group">
              <img
                src={asset.imageUrl}
                alt={`Lámina canónica: ${asset.title}`}
                className="w-full h-full object-contain rounded-md transition-transform duration-300 group-hover:scale-[1.01]"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                <button
                  onClick={() => setSelectedAsset(asset)}
                  className="px-3 py-1.5 rounded-md bg-slate-800/90 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 hover:bg-slate-700 border border-slate-700"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Inspeccionar</span>
                </button>
                <label className="px-3 py-1.5 rounded-md bg-slate-800/90 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 hover:bg-slate-700 border border-slate-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Cargar Imagen</span>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => handleFileUpload(e, asset.id)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Status pill top-left */}
              <div className="absolute top-4 left-4">
                {asset.isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 backdrop-blur-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60 backdrop-blur-xs">
                    <XCircle className="w-3 h-3" />
                    DESCONECTADO
                  </span>
                )}
              </div>
            </div>

            {/* Details & Domain Authority */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                      Autoridad exclusiva sobre:
                    </span>
                    <p className="text-xs font-medium text-slate-200 leading-snug">
                      {asset.authorityDomain}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {asset.description}
                </p>
              </div>

              {/* Views & Specs tags */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                  <span>Vistas registradas:</span>
                  <span className="text-cyan-400">{asset.anglesOrViews.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {asset.anglesOrViews.map((view, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-800"
                    >
                      {view}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Modal */}
      {selectedAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-[#0B101B] border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-xs text-cyan-400">{selectedAsset.code}</span>
                <h3 className="text-lg font-bold text-slate-100">{selectedAsset.title}</h3>
                <p className="text-xs text-slate-400">{selectedAsset.subtitle}</p>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
              >
                Cerrar (ESC)
              </button>
            </div>

            <div className="aspect-[4/3] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={selectedAsset.imageUrl}
                alt={selectedAsset.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Especificaciones Técnicas Canónicas
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                {selectedAsset.technicalSpecs.map((spec, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
