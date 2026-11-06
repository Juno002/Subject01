/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { CanonVaultView } from './components/CanonVaultView';
import { SceneDirectorView } from './components/SceneDirectorView';
import { IdentityGuardView } from './components/IdentityGuardView';
import { ProductionReviewView } from './components/ProductionReviewView';
import { INITIAL_CANONICAL_ASSETS } from './lib/canonicalAssets';
import {
  CanonicalAsset,
  CanonicalAssetId,
  ExecutionMode,
  IdentityGuardReport,
  InspirationAnalysis,
  ProductionResult,
  SceneConfig,
} from './lib/types';
import { runIdentityGuardValidation } from './lib/identityGuardLogic';
import { buildProductionPrompt } from './lib/promptBuilderLogic';
import { runContinuityAudit } from './lib/auditLogic';

export default function App() {
  const [activeTab, setActiveTab] = useState<'canon' | 'director' | 'guard' | 'review'>('director');
  const [canonicalAssets, setCanonicalAssets] = useState<CanonicalAsset[]>(INITIAL_CANONICAL_ASSETS);

  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    shotType: 'half_body',
    expression: 'slight_smile',
    glasses: 'on',
    clothingMode: 'inspiration',
    clothingCustomDescription: '',
    environmentMode: 'inspiration',
    environmentCustomDescription: '',
    sceneDescription:
      'Diego caminando tranquilamente por la calle Jorge Juan en Madrid un martes por la tarde. Lleva un abrigo de lana color camel sobre un jersey de cuello mockneck grafito. Mirada afable hacia la cámara con leve sonrisa natural.',
    aspectRatio: '4:5',
    realismStyle: 'casual_smartphone',
    executionMode: 'GENERATE',
  });

  const [inspirationAnalysis, setInspirationAnalysis] = useState<InspirationAnalysis | null>(null);
  const [guardReport, setGuardReport] = useState<IdentityGuardReport | null>(null);
  const [productionResult, setProductionResult] = useState<ProductionResult | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Toggle canonical asset connection (e.g. to test missing reference handling)
  const handleToggleConnection = (id: CanonicalAssetId) => {
    setCanonicalAssets((prev) =>
      prev.map((asset) =>
        asset.id === id ? { ...asset, isConnected: !asset.isConnected } : asset
      )
    );
  };

  // Upload or replace canonical master asset image
  const handleUpdateAssetImage = (id: CanonicalAssetId, newImageUrl: string) => {
    setCanonicalAssets((prev) =>
      prev.map((asset) =>
        asset.id === id ? { ...asset, imageUrl: newImageUrl, lastUpdated: 'Personalizado' } : asset
      )
    );
  };

  // Main Production Execution Engine
  const handleExecute = async (mode: ExecutionMode) => {
    setIsProcessing(true);
    const updatedConfig = { ...sceneConfig, executionMode: mode };
    setSceneConfig(updatedConfig);

    try {
      let currentInspirationAnalysis = inspirationAnalysis;

      // Step 1: Inspiration Analyzer (if inspiration image provided)
      if (updatedConfig.inspirationImage) {
        setProcessingStep('1/4 Analizando fotografía de inspiración...');
        try {
          const res = await fetch('/api/analyze-inspiration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: updatedConfig.inspirationImage,
              sceneContext: updatedConfig.sceneDescription,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            currentInspirationAnalysis = data.analysis;
            setInspirationAnalysis(data.analysis);
          }
        } catch (err) {
          console.warn('Error en /api/analyze-inspiration, continuando con fallback:', err);
        }
      }

      // Step 2: Identity Guard (Pre-Generation Validation)
      setProcessingStep('2/4 Validando fisonomía en Identity Guard...');
      const identityReport = runIdentityGuardValidation(
        canonicalAssets,
        updatedConfig,
        currentInspirationAnalysis || undefined
      );
      setGuardReport(identityReport);

      // If Face Master is disconnected, Identity Guard blocks the production
      if (identityReport.status === 'BLOCKED') {
        setIsProcessing(false);
        setActiveTab('guard');
        return;
      }

      // Step 3: Production Prompt Builder
      setProcessingStep('3/4 Compilando prompt de producción y anclajes...');
      const promptData = buildProductionPrompt(
        updatedConfig,
        identityReport,
        currentInspirationAnalysis || undefined
      );

      let generatedImageUrl: string | undefined = undefined;
      let modelUsed = 'Prompt Engine v0.2';
      let quotaNotice: string | undefined = undefined;

      // Step 4: Image Generation (if GENERATE mode)
      if (mode === 'GENERATE') {
        setProcessingStep('4/4 Generando candidato con modelo de imagen...');
        const faceAsset = canonicalAssets.find((a) => a.id === '01_FACE_MASTER');

        try {
          const genRes = await fetch('/api/generate-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productionPrompt: promptData.fullModelPrompt,
              aspectRatio: updatedConfig.aspectRatio,
              faceMasterBase64: faceAsset?.isConnected ? faceAsset.imageUrl : undefined,
              shotType: updatedConfig.shotType,
              expression: updatedConfig.expression,
              glasses: updatedConfig.glasses,
              sceneDescription: updatedConfig.sceneDescription,
            }),
          });

          if (genRes.ok) {
            const genData = await genRes.json();
            generatedImageUrl = genData.imageUrl;
            modelUsed = genData.modelUsed || 'gemini-3.1-flash-lite-image';
            quotaNotice = genData.quotaNotice;
          }
        } catch (genErr) {
          console.warn('Error en /api/generate-candidate:', genErr);
        }
      }

      // Step 5: Continuity Auditor (Post-Generation)
      setProcessingStep('Auditando continuidad de 9 criterios contra el canon...');
      const canonicalStatusMap: Record<CanonicalAssetId, boolean> = {
        '01_FACE_MASTER': canonicalAssets.find((a) => a.id === '01_FACE_MASTER')?.isConnected ?? false,
        '02_BODY_MASTER': canonicalAssets.find((a) => a.id === '02_BODY_MASTER')?.isConnected ?? false,
        '03_ACCESSORIES_MASTER': canonicalAssets.find((a) => a.id === '03_ACCESSORIES_MASTER')?.isConnected ?? false,
        '04_EXPRESSIONS_MASTER': canonicalAssets.find((a) => a.id === '04_EXPRESSIONS_MASTER')?.isConnected ?? false,
      };

      let modelAuditNotes = {};
      let auditStatus: 'SUCCESS' | 'FAILED' | 'UNSUPPORTED_FORMAT' | 'EMPTY' | 'MALFORMED' | 'NOT_RUN' = 'NOT_RUN';
      let auditErrorMessage: string | undefined = undefined;
      let serverExecutionMetadata: any = undefined;

      if (generatedImageUrl) {
        try {
          const auditRes = await fetch('/api/audit-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateImageBase64: generatedImageUrl,
              sceneConfig: updatedConfig,
              productionPrompt: promptData.fullModelPrompt,
              connectedAssets: canonicalStatusMap,
            }),
          });
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            modelAuditNotes = auditData.modelAuditNotes || {};
            serverExecutionMetadata = auditData.executionMetadata;
            auditStatus =
              serverExecutionMetadata?.executionStatus ||
              auditData.auditStatus ||
              (Object.keys(modelAuditNotes).length > 0 ? 'SUCCESS' : 'EMPTY');
            auditErrorMessage = serverExecutionMetadata?.errorMessage || auditData.auditMessage;
          } else {
            auditStatus = 'FAILED';
            auditErrorMessage = `HTTP ${auditRes.status}`;
          }
        } catch (auditErr: any) {
          auditStatus = 'FAILED';
          auditErrorMessage = auditErr?.message || String(auditErr);
        }
      }

      const auditReport = runContinuityAudit({
        sceneConfig: updatedConfig,
        canonicalStatus: canonicalStatusMap,
        hasGeneratedImage: Boolean(generatedImageUrl),
        modelAuditNotes,
        auditStatus,
        auditErrorMessage,
        serverExecutionMetadata,
      });

      const finalResult: ProductionResult = {
        id: `PROD-${Date.now()}`,
        createdAt: new Date().toLocaleTimeString('es-ES'),
        executionMode: mode,
        sceneConfig: updatedConfig,
        canonicalStatus: canonicalStatusMap,
        inspirationAnalysis: currentInspirationAnalysis || undefined,
        identityGuardReport: identityReport,
        productionPrompt: promptData,
        generatedImageUrl,
        continuityAudit: auditReport,
        modelUsed,
        quotaNotice,
      };

      setProductionResult(finalResult);
      setActiveTab('review');
    } catch (error) {
      console.error('Error during production workflow:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Action: Prepare corrected prompt based on audit feedback
  const handlePrepareCorrectedPrompt = () => {
    if (!productionResult?.continuityAudit) return;
    const correctionsText = productionResult.continuityAudit.suggestedCorrections.join('. ');
    setSceneConfig((prev) => ({
      ...prev,
      sceneDescription: `${prev.sceneDescription} (Ajuste de Continuidad: ${correctionsText})`,
    }));
    setActiveTab('director');
  };

  const handleNewProduction = () => {
    setProductionResult(null);
    setActiveTab('director');
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-[#E2E8F0] flex flex-col font-sans">
      {/* Workstation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        canonicalAssets={canonicalAssets}
        hasResults={Boolean(productionResult)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'canon' && (
          <CanonVaultView
            canonicalAssets={canonicalAssets}
            onToggleConnection={handleToggleConnection}
            onUpdateAssetImage={handleUpdateAssetImage}
          />
        )}

        {activeTab === 'director' && (
          <SceneDirectorView
            sceneConfig={sceneConfig}
            onChangeConfig={setSceneConfig}
            onExecute={handleExecute}
            isProcessing={isProcessing}
            processingStep={processingStep}
          />
        )}

        {activeTab === 'guard' && (
          <IdentityGuardView
            guardReport={guardReport}
            inspirationAnalysis={inspirationAnalysis}
            hasInspirationImage={Boolean(sceneConfig.inspirationImage)}
          />
        )}

        {activeTab === 'review' && (
          <ProductionReviewView
            productionResult={productionResult}
            onReviseScene={() => setActiveTab('director')}
            onPrepareCorrectedPrompt={handlePrepareCorrectedPrompt}
            onNewProduction={handleNewProduction}
          />
        )}
      </main>

      {/* Persistent Status & Safeguard Footer */}
      <footer className="bg-[#05070D] border-t border-slate-900 px-4 sm:px-8 py-3 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>
            SUBJECT 01 — Identity Studio <strong>Alpha v0.2</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Diego Navarro Canonical Architecture</span>
        </div>
        <p className="text-[11px] text-slate-500 text-center sm:text-right">
          Prototipo de laboratorio experimental. No constituye un sistema de certificación biométrica.
        </p>
      </footer>
    </div>
  );
}
