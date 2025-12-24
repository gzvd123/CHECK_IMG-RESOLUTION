import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, ScanLine, FileDigit, FolderOpen } from 'lucide-react';
import { AnalysisInput } from '../types';

// Add type definition for directory support
declare global {
  namespace React {
    interface InputHTMLAttributes<T> {
      webkitdirectory?: string;
      directory?: string;
    }
  }
}

interface FileUploadProps {
  onDataSelected: (data: AnalysisInput) => void;
  onBatchSelected: (files: File[]) => void;
}

interface PreviewState {
  content: string; // url for image
  fileName: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataSelected, onBatchSelected }) => {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    try {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const matches = result.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            setPreview({
              content: result,
              fileName: file.name
            });
            onDataSelected({
              type: 'image',
              content: matches[2],
              mimeType: matches[1],
              fileName: file.name
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert('Format not supported. Please upload an Image (JPG/PNG).');
      }
    } catch (err) {
      console.error("File processing error", err);
      alert("Error processing file.");
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const imageFiles = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            onBatchSelected(imageFiles);
        } else {
            alert("No images found in the selected folder.");
        }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearData = () => {
    setPreview(null);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!preview ? (
        <div
          className={`group flex-1 border border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 relative overflow-hidden ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/50'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Decorative background grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
              isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
            }`}>
              {isDragging ? <ScanLine className="w-10 h-10 animate-pulse" /> : <UploadCloud className="w-10 h-10" />}
            </div>
            
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Upload Analysis Target</h3>
            <p className="text-slate-500 text-sm text-center max-w-xs mb-8 leading-relaxed">
              Analyze a single image or batch process a folder.
            </p>
            
            <div className="flex gap-4">
                <label className="relative inline-flex group/btn cursor-pointer">
                <div className="absolute transition-all duration-200 rounded-lg -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-20 group-hover/btn:opacity-50 blur"></div>
                <div className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white transition-all duration-200 bg-slate-900 border border-slate-700 rounded-lg group-hover/btn:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <FileDigit className="w-4 h-4 mr-2 text-indigo-400" />
                    Select Image
                </div>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onChange}
                />
                </label>

                <div className="relative inline-flex group/btn">
                    <button 
                        onClick={() => folderInputRef.current?.click()}
                        className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-slate-300 transition-all duration-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <FolderOpen className="w-4 h-4 mr-2 text-amber-400" />
                        Scan Folder
                    </button>
                    <input
                        ref={folderInputRef}
                        type="file"
                        webkitdirectory=""
                        directory=""
                        className="hidden"
                        onChange={onFolderChange}
                    />
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl p-4">
          {/* Tech overlay lines */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>

          <img
            src={preview.content}
            alt="Analysis Target"
            className="max-w-full max-h-[600px] object-contain"
          />
          
          <button
            onClick={clearData}
            className="absolute top-4 right-4 p-2 bg-slate-950/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg backdrop-blur-md transition-all border border-slate-800 hover:border-red-500/30 z-20"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
             <label className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold tracking-wide uppercase py-2.5 px-6 rounded-full cursor-pointer border border-slate-700 hover:border-slate-500 flex items-center gap-2 transition-all shadow-xl backdrop-blur-md">
                <ImageIcon className="w-4 h-4" />
                <span>Change Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onChange}
                />
             </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;