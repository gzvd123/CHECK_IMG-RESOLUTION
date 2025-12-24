import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResult from './components/AnalysisResult';
import BatchProcessor from './components/BatchProcessor';
import { AnalysisState, AnalysisInput, SpecRow, ValidationConfig, BatchState, BatchItem } from './types';
import { analyzeContent } from './services/geminiService';
import { parseSpecFile, findMatchingSpec, findAllMatchingSpecs, validateDimensions } from './utils/validation';
import { Activity, ArrowLeft } from 'lucide-react';

const App: React.FC = () => {
  // Single Mode State
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchState, setBatchState] = useState<BatchState>({
    items: [],
    isProcessing: false,
    progress: 0,
    total: 0
  });

  // Shared Config State
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [currentSpecFile, setCurrentSpecFile] = useState<File | null>(null);
  const [specConfig, setSpecConfig] = useState<ValidationConfig>({ startCol: 'G', endCol: 'M' });

  // Re-parse specs when config or file changes
  useEffect(() => {
    if (currentSpecFile) {
        parseSpecFile(currentSpecFile, specConfig)
            .then((parsed) => {
                setSpecs(parsed);
                console.log(`Reparsed ${parsed.length} specs with config`, specConfig);
            })
            .catch(err => console.error("Failed to reparse specs", err));
    }
  }, [specConfig, currentSpecFile]);

  const handleSpecsLoaded = async (file: File) => {
    setCurrentSpecFile(file); // This triggers the useEffect
  };

  const handleConfigChange = (newConfig: ValidationConfig) => {
      setSpecConfig(newConfig);
  };

  // --- Single Analysis ---
  const handleAnalysis = async (data: AnalysisInput) => {
    setIsBatchMode(false);
    setAnalysis({
      isLoading: true,
      result: null,
      error: null,
    });

    try {
      const geminiResult = await analyzeContent(data);
      let validationResult;
      
      if (specs.length > 0 && data.fileName) {
         const match = findMatchingSpec(data.fileName, specs);
         if (match) {
           validationResult = validateDimensions(geminiResult.dimensions, match);
         } else {
           validationResult = { status: 'NO_MATCH', matches: [], missing: [], extra: [] } as any;
         }
      }

      setAnalysis({
        isLoading: false,
        result: geminiResult,
        error: null,
        validation: validationResult
      });
    } catch (error: any) {
      setAnalysis({
        isLoading: false,
        result: null,
        error: error.message || "Unknown error occurred during extraction",
      });
    }
  };

  // --- Batch Setup ---
  const handleBatchSelection = (files: File[]) => {
    setIsBatchMode(true);
    
    // Pre-calculate matches to give immediate feedback
    const items: BatchItem[] = files.map((file, index) => ({
        id: `batch-${index}-${Date.now()}`,
        file,
        status: 'PENDING',
        matchedSpecs: specs.length > 0 ? findAllMatchingSpecs(file.name, specs) : []
    }));

    setBatchState({
        items,
        isProcessing: false,
        progress: 0,
        total: items.length
    });
  };

  // --- Batch Execution ---
  const processBatch = async () => {
    if (batchState.isProcessing) return;

    setBatchState(prev => ({ ...prev, isProcessing: true }));

    const items = [...batchState.items];
    
    for (let i = 0; i < items.length; i++) {
        // Skip items already processed
        if (items[i].status === 'COMPLETED' || items[i].status === 'SKIPPED') continue;

        // CRITICAL UPDATE: Cost Optimization
        // If no specs match this image, SKIP it immediately. Do NOT call AI.
        if (items[i].matchedSpecs.length === 0) {
            items[i].status = 'SKIPPED';
            items[i].error = "Skipped: No matching Spec Row found";
            
            // Update state to show skipped status
            setBatchState(prev => ({ 
                ...prev, 
                items: [...items], 
                progress: i + 1 
            }));
            
            continue; // Move to next item immediately
        }

        // Only proceed to AI if we have matches
        items[i].status = 'PROCESSING';
        setBatchState(prev => ({ ...prev, items: [...items] }));

        try {
            // Convert file to base64
            const base64Content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result as string;
                    resolve(res.split(',')[1]); // remove data url prefix
                };
                reader.onerror = reject;
                reader.readAsDataURL(items[i].file);
            });

            // 1. Call AI (Once per image)
            const aiResult = await analyzeContent({
                type: 'image',
                content: base64Content,
                mimeType: items[i].file.type,
                fileName: items[i].file.name
            });

            items[i].aiResponse = aiResult;

            // 2. Validate against ALL matched specs
            // We already know length > 0 because of the check above
            items[i].validations = items[i].matchedSpecs.map(spec => 
                validateDimensions(aiResult.dimensions, spec)
            );

            items[i].status = 'COMPLETED';

        } catch (err: any) {
            console.error(`Error processing ${items[i].file.name}`, err);
            items[i].status = 'ERROR';
            items[i].error = err.message;
        }

        // Update progress
        setBatchState(prev => ({ 
            ...prev, 
            items: [...items], 
            progress: i + 1 
        }));

        // Simple delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
    }

    setBatchState(prev => ({ ...prev, isProcessing: false }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <Header 
        onSpecsLoaded={handleSpecsLoaded} 
        onConfigChange={handleConfigChange}
        specsCount={specs.length} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Intro / Status Line */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Ready for numeric ingestion. Supported formats: JPG, PNG.</span>
                {specs.length > 0 && (
                    <span className="text-emerald-500 ml-2 flex items-center gap-1">
                        • Reference Specs Active 
                        <span className="text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {specConfig.startCol}-{specConfig.endCol}
                        </span>
                    </span>
                )}
            </div>

            {isBatchMode && (
                <button 
                    onClick={() => setIsBatchMode(false)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Single View
                </button>
            )}
        </div>

        {isBatchMode ? (
            <div className="h-[calc(100vh-200px)] min-h-[600px]">
                <BatchProcessor 
                    batchState={batchState}
                    onStart={processBatch}
                    onCancel={() => {}} 
                />
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)] min-h-[600px]">
                {/* Left Column: Input Source */}
                <div className="flex flex-col h-full">
                    <FileUpload 
                        onDataSelected={handleAnalysis} 
                        onBatchSelected={handleBatchSelection}
                    />
                </div>

                {/* Right Column: Results */}
                <div className="flex flex-col h-full">
                    <AnalysisResult 
                        isLoading={analysis.isLoading} 
                        result={analysis.result} 
                        error={analysis.error} 
                        validation={analysis.validation}
                    />
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;