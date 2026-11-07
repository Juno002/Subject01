import React from 'react';
import { ShieldCheck, Sparkles, Layers, Sliders, Eye, AlertTriangle } from './Icons';
import { CanonicalAsset } from '../lib/types';

interface HeaderProps {
  activeTab: 'canon' | 'director' | 'guard' | 'review';
  setActiveTab: (tab: 'canon' | 'director' | 'guard' | 'review') => void;
  canonicalAssets: CanonicalAsset[];
  hasResults: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  canonicalAssets,
  hasResults,
}) => {
  const connectedCount = canonicalAssets.filter((a) => a.isConnected).length;
  const totalCount = canonicalAssets.length;
  const isAllConnected = connectedCount === totalCount;

  return (
    <header className="sticky top-0 z-40 bg-[#070A11]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm tracking-tighter shadow-inner">
            S01
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-slate-100 tracking-tight">
                SUBJECT 01 <span className="text-slate-400 font-normal">— Identity Studio</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
                ALPHA v0.2
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                SUJETO: DIEGO NAVARRO
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Gestión de identidad visual persistente y producción fotográfica verosímil
            </p>
          </div>
        </div>

        {/* Status Indicators & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Canonical Health pill */}
          <button
            onClick={() => setActiveTab('canon')}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors border ${
              isAllConnected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40'
            }`}
            title="Ver estado de activos canónicos en la Bóveda"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isAllConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>
              CANON: {connectedCount}/{totalCount}
            </span>
          </button>

          {/* Nav Tabs */}
          <nav className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('canon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'canon'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bóveda Canónica</span>
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'director'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Director de Escena</span>
            </button>
            <button
              onClick={() => setActiveTab('guard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'guard'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Identity Guard</span>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'review'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Revisión</span>
              {hasResults && (
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
