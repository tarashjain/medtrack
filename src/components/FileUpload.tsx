'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  visitId: string;
  category: 'prescription' | 'report';
  onUploaded: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

export default function FileUpload({ visitId, category, onUploaded, onError, onSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!ALLOWED.includes(file.type)) {
      onError('Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      onError('File must be under 10MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const res = await fetch(`/api/visits/${visitId}/files`, { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      onSuccess(`${file.name} uploaded successfully`);
      onUploaded();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
        dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30'
      } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <label className="flex flex-col items-center gap-2 py-6 px-4 cursor-pointer">
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
        {uploading ? (
          <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">{uploading ? 'Uploading…' : 'Drop a file here or click to browse'}</p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, JPEG, PNG · Max 10MB</p>
        </div>
      </label>
    </div>
  );
}
