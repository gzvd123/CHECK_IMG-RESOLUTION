import React, { useState } from 'react';
import { BatchState, BatchItem } from '../types';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Download, Play, FolderOpen, Ban } from 'lucide-react';
import { utils, write } from 'xlsx';

interface BatchProcessorProps {
  batchState: BatchState;
  onStart: () => void;
  onCancel: () => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ batchState, onStart, onCancel }) => {
  
  const getStatusIcon = (status: BatchItem['status']) => {
    switch(status) {
        case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        case 'PROCESSING': return <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />;
        case 'ERROR': return <XCircle className="w-4 h-4 text-red-500" />;
        case 'SKIPPED': return <Ban className="w-4 h-4 text-slate-600" />;
        default: return <div className="w-4 h-4 rounded-full border border-slate-600" />;
    }
  };

  const downloadReport = () => {
    // Flatten data for CSV
    // One image might have multiple validation rows
    const rows: any[] = [];
    
    batchState.items.forEach(item => {
        // If skipped, we only export the filename and status
        if (item.status === 'SKIPPED') {
            rows.push({
                'File Name': item.file.name,
                'Processing Status': 'SKIPPED',
                'Reason': 'No matching product spec found in Excel',
                'Detected Dimensions': 'N/A',
                'Matched Product': 'N/A',
                'Validation Status': 'N/A'
            });
            return;
        }

        const detectedDims = item.aiResponse?.dimensions.join(' x ') || 'N/A';
        const aiSummary = item.aiResponse?.raw_text || '';
        
        if (item.validations && item.validations.length > 0) {
            item.validations.forEach(val => {
                rows.push({
                    'File Name': item.file.name,
                    'Processing Status': item.status,
                    'Reason': '',
                    'Detected Dimensions': detectedDims,
                    'Matched Product': val.matchedRow?.productName || 'N/A',
                    'Expected Dimensions': val.matchedRow?.expectedDimensions.join(' x ') || 'N/A',
                    'Validation Status': val.status,
                    'Missing': val.missing.join(', '),
                    'Extra': val.extra.join(', '),
                    'AI Observation': aiSummary
                });
            });
        } else {
            // Error case or processing failed
            rows.push({
                'File Name': item.file.name,
                'Processing Status': item.status,
                'Reason': item.error || 'Unknown Error',
                'Detected Dimensions': detectedDims,
                'Matched Product': 'NO MATCH',
                'Expected Dimensions': '',
                'Validation Status': 'ERROR',
                'Missing': '',
                'Extra': '',
                'AI Observation': item.error || aiSummary
            });
        }
    });

    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Batch Report");
    
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Batch_Report_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.xlsx`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                Batch Processor
            </h3>
            <p className="text-sm text-slate-500 mt-1">
                {batchState.total} images queued • {batchState.progress} processed
            </p>
        </div>
        
        <div className="flex gap-3">
             {batchState.isProcessing ? (
                 <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Processing...</span>
                 </div>
             ) : (
                batchState.progress === batchState.total && batchState.total > 0 ? (
                    <button 
                        onClick={downloadReport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                ) : (
                    <button 
                        onClick={onStart}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" /> Start Processing
                    </button>
                )
             )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
         <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${(batchState.progress / Math.max(batchState.total, 1)) * 100}%` }}
         ></div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase sticky top-0 z-10">
                <tr>
                    <th className="p-4 font-semibold border-b border-slate-800 w-16">Status</th>
                    <th className="p-4 font-semibold border-b border-slate-800">File Name</th>
                    <th className="p-4 font-semibold border-b border-slate-800">Matched Specs</th>
                    <th className="p-4 font-semibold border-b border-slate-800">Extracted</th>
                    <th className="p-4 font-semibold border-b border-slate-800">Validation</th>
                </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800">
                {batchState.items.map((item) => {
                    const matchedCount = item.matchedSpecs.length;
                    
                    if (item.status === 'SKIPPED') {
                        return (
                             <tr key={item.id} className="bg-slate-900/50 hover:bg-slate-800/20 transition-colors opacity-50">
                                <td className="p-4 text-center">
                                    {getStatusIcon(item.status)}
                                </td>
                                <td className="p-4 text-slate-500 font-medium truncate max-w-[200px] line-through decoration-slate-600" title={item.file.name}>
                                    {item.file.name}
                                </td>
                                <td className="p-4 text-slate-600 italic">
                                    No Match
                                </td>
                                <td className="p-4 text-slate-700 font-mono">
                                    -
                                </td>
                                <td className="p-4 text-slate-700">
                                    Skipped to save tokens
                                </td>
                            </tr>
                        );
                    }

                    const primaryValidation = item.validations?.[0]; // Show first match status for brevity
                    let valStatusColor = "text-slate-500";
                    if(primaryValidation?.status === 'PERFECT') valStatusColor = "text-emerald-400";
                    else if(primaryValidation?.status === 'MISMATCH') valStatusColor = "text-red-400";
                    else if(primaryValidation?.status === 'MISSING') valStatusColor = "text-amber-400";

                    return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 text-center">
                                {getStatusIcon(item.status)}
                            </td>
                            <td className="p-4 text-slate-200 font-medium truncate max-w-[200px]" title={item.file.name}>
                                {item.file.name}
                            </td>
                            <td className="p-4 text-slate-400">
                                {matchedCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-xs">
                                        {matchedCount} Match{matchedCount > 1 ? 'es' : ''}
                                    </span>
                                ) : (
                                    <span className="text-slate-600 italic">None</span>
                                )}
                            </td>
                            <td className="p-4 text-indigo-300 font-mono">
                                {item.aiResponse?.dimensions.join(' x ') || '-'}
                            </td>
                            <td className={`p-4 font-semibold ${valStatusColor}`}>
                                {item.validations?.length ? (
                                    <div className="flex flex-col gap-1">
                                        {item.validations.map((v, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className={
                                                    v.status === 'PERFECT' ? 'text-emerald-400' :
                                                    v.status === 'MISMATCH' ? 'text-red-400' : 'text-amber-400'
                                                }>{v.status}</span>
                                                <span className="text-slate-600">vs</span>
                                                <span className="text-slate-400 truncate max-w-[150px]" title={v.matchedRow?.productName}>
                                                    {v.matchedRow?.productName}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    '-'
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatchProcessor;