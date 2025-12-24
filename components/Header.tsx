import React, { useRef, useState } from 'react';
import { Binary, ShieldCheck, FileSpreadsheet, Upload, Settings, X, Save } from 'lucide-react';
import { ValidationConfig } from '../types';

interface HeaderProps {
  onSpecsLoaded?: (file: File) => void;
  onConfigChange?: (config: ValidationConfig) => void;
  specsCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onSpecsLoaded, onConfigChange, specsCount = 0 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [startCol, setStartCol] = useState('G');
  const [endCol, setEndCol] = useState('M');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onSpecsLoaded) {
      onSpecsLoaded(e.target.files[0]);
    }
  };

  const handleSaveConfig = () => {
    if (onConfigChange) {
      onConfigChange({ startCol, endCol });
      setShowSettings(false);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Binary className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">NumExtract AI</h1>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Enterprise Data Vision</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          
          <button 
             onClick={() => setShowSettings(!showSettings)}
             className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
             title="Configure Columns"
          >
             <Settings className="w-5 h-5" />
          </button>

          {onSpecsLoaded && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  specsCount > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {specsCount > 0 ? (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{specsCount} Specs Loaded</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Load Reference Excel</span>
                  </>
                )}
              </button>
            </>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-400">v2.1 Validator</span>
          </div>
        </div>
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="absolute top-16 right-6 w-80 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 z-50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-200">Validation Configuration</h3>
                <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
            </div>
            
            <div className="space-y-3">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">Start Column</label>
                        <input 
                            type="text" 
                            value={startCol}
                            onChange={(e) => setStartCol(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-center uppercase focus:border-indigo-500 outline-none"
                            placeholder="A"
                        />
                    </div>
                    <div className="flex items-center pt-5 text-slate-600">-</div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-400 mb-1">End Column</label>
                        <input 
                            type="text" 
                            value={endCol}
                            onChange={(e) => setEndCol(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-sm text-center uppercase focus:border-indigo-500 outline-none"
                            placeholder="Z"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                    Specify the Excel column letters (e.g. G to M) where dimension data is stored.
                </p>

                <button 
                    onClick={handleSaveConfig}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                    <Save className="w-3.5 h-3.5" /> Apply Configuration
                </button>
            </div>
        </div>
      )}
    </header>
  );
};

export default Header;