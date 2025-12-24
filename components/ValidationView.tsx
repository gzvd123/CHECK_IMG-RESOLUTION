import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Search, Box } from 'lucide-react';
import { ValidationResult } from '../types';

interface ValidationViewProps {
  validation: ValidationResult;
}

const ValidationView: React.FC<ValidationViewProps> = ({ validation }) => {
  const { status, matchedRow, matches, missing, extra } = validation;

  const getStatusColor = () => {
    switch (status) {
      case 'PERFECT': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'MISSING': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'EXTRA': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'MISMATCH': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-700 bg-slate-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'PERFECT': return <CheckCircle2 className="w-6 h-6" />;
      case 'MISSING': return <AlertTriangle className="w-6 h-6" />;
      case 'EXTRA': return <Search className="w-6 h-6" />;
      case 'MISMATCH': return <XCircle className="w-6 h-6" />;
      default: return <Search className="w-6 h-6" />;
    }
  };

  if (status === 'NO_MATCH') {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 mb-6">
        <div className="flex items-center gap-3 text-slate-400">
           <Search className="w-5 h-5" />
           <span className="text-sm">No matching product found in loaded Excel specs for this filename.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Header Card */}
      <div className={`p-4 rounded-xl border ${getStatusColor()}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-bold text-lg leading-tight">{status} MATCH</h3>
              <p className="text-[10px] opacity-70 uppercase tracking-wider font-semibold">Validation Status</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="text-right text-xs font-mono opacity-70">
              <div>Expected: {matches.length + missing.length}</div>
              <div>Detected: {matches.length + extra.length}</div>
            </div>
          </div>
        </div>
        
        {/* Matched Product Banner */}
        <div className="mt-4 pt-3 border-t border-inherit/20 flex items-start gap-3">
            <div className="mt-0.5 opacity-80">
                <Box className="w-4 h-4" />
            </div>
            <div>
                <p className="text-[10px] opacity-60 uppercase tracking-widest font-semibold mb-0.5">Matched Product</p>
                <div className="text-base font-semibold text-slate-100 tracking-tight">
                    {matchedRow?.productName} <span className="text-slate-500 text-sm font-normal">{matchedRow?.size}</span>
                </div>
            </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Matched */}
        {matches.length > 0 && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-emerald-500 mb-2 uppercase flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Validated ({matches.length})
            </h4>
            <div className="space-y-1">
              {matches.map((m, i) => (
                <div key={i} className="flex justify-between text-sm font-mono text-emerald-300 bg-emerald-500/5 px-2 py-1 rounded">
                   <span>{m.expected}</span>
                   <span className="text-emerald-600 mx-2">≈</span>
                   <span>{m.detected}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing */}
        {missing.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Missing Specs ({missing.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {missing.map((m, i) => (
                <span key={i} className="text-sm font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                   {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Extra/Unexpected */}
        {extra.length > 0 && (
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-blue-500 mb-2 uppercase flex items-center gap-2">
              <Search className="w-3 h-3" /> Unexpected Data ({extra.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {extra.map((m, i) => (
                <span key={i} className="text-sm font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                   {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationView;