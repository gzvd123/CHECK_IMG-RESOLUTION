import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, AlertOctagon, Copy, Check, Database } from 'lucide-react';
import { GeminiResponse, ValidationResult } from '../types';
import ValidationView from './ValidationView';

interface AnalysisResultProps {
  isLoading: boolean;
  result: GeminiResponse | null;
  error: string | null;
  validation?: ValidationResult;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ isLoading, result, error, validation }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.markdown_table);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
        <Loader2 className="w-10 h-10 animate-spin mb-6 text-indigo-500" />
        <p className="text-lg font-medium text-slate-200 tracking-tight">Processing Numeric Data...</p>
        <div className="flex gap-2 mt-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-100"></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-200"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-slate-900 rounded-2xl border border-red-900/30 flex flex-col items-center justify-center p-8 text-red-400">
        <AlertOctagon className="w-12 h-12 mb-4 opacity-80" />
        <h3 className="text-lg font-semibold mb-2 text-red-300">Analysis Failed</h3>
        <p className="text-center text-sm opacity-80">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-12 text-slate-600">
        <Database className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-sm font-medium uppercase tracking-widest opacity-60">Awaiting Input Data</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full max-h-[800px] relative group">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-50"></div>

      <div className="p-5 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wide">Analysis Report</h3>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-indigo-400"
          title="Copy Markdown"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto custom-markdown">
        
        {validation && <ValidationView validation={validation} />}

        <div className="mb-6">
           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI Observation</h4>
           <div className="text-slate-300 text-sm leading-relaxed">
             <ReactMarkdown>
               {result.raw_text || result.markdown_table}
             </ReactMarkdown>
           </div>
        </div>

        {result.markdown_table && result.raw_text !== result.markdown_table && (
             <ReactMarkdown
             remarkPlugins={[remarkGfm]}
             components={{
               table: ({node, ...props}) => <table className="w-full text-sm text-left border-collapse my-4" {...props} />,
               thead: ({node, ...props}) => <thead className="text-xs text-slate-400 uppercase bg-slate-800/50" {...props} />,
               th: ({node, ...props}) => <th className="px-4 py-3 border border-slate-700 font-semibold tracking-wider" {...props} />,
               td: ({node, ...props}) => <td className="px-4 py-3 border border-slate-800 text-slate-300 font-mono" {...props} />,
               tr: ({node, ...props}) => <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors" {...props} />,
             }}
           >
             {result.markdown_table}
           </ReactMarkdown>
        )}
      </div>
    </div>
  );
};

export default AnalysisResult;