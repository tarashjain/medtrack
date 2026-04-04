'use client';

import { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  visitId: string;
  category: 'prescription' | 'report';
  onUploaded: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;
type Mode = 'idle' | 'camera' | 'preview';

export default function FileUpload({ visitId, category, onUploaded, onError, onSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) { onError('Only PDF, JPG, JPEG, and PNG files are allowed.'); return; }
    if (file.size > MAX_SIZE) { onError('File must be under 10MB.'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      const res = await fetch(`/api/visits/${visitId}/files`, { method: 'POST', body: formData });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Upload failed'); }
      onSuccess(`${file.name} uploaded successfully`);
      onUploaded();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = async () => {
    setCameraError('');
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {
      setCameraError('Camera access denied. Please allow camera permission and try again.');
      setMode('idle');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
    stopStream();
    setMode('preview');
  };

  const cancelCamera = () => { stopStream(); setCapturedImage(null); setMode('idle'); };

  const uploadCaptured = async () => {
    if (!capturedImage) return;
    const blob = await (await fetch(capturedImage)).blob();
    const file = new File([blob], `${category}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' });
    cancelCamera();
    await uploadFile(file);
  };

  // Camera UI
  if (mode === 'camera' || mode === 'preview') {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-black">
        <canvas ref={canvasRef} className="hidden" />
        {mode === 'camera' && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-56 object-cover" />
            <div className="flex items-center justify-between px-4 py-2.5 bg-black/90">
              <button type="button" onClick={cancelCamera} className="text-sm text-white/60 hover:text-white">Cancel</button>
              <button type="button" onClick={capture} className="w-11 h-11 rounded-full bg-white flex items-center justify-center active:scale-95">
                <div className="w-8 h-8 rounded-full border-2 border-slate-300" />
              </button>
              <div className="w-12" />
            </div>
          </>
        )}
        {mode === 'preview' && capturedImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured" className="w-full max-h-56 object-contain" />
            <div className="flex gap-2 px-3 py-2.5 bg-slate-900">
              <button type="button" onClick={() => { setCapturedImage(null); openCamera(); }} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/80">Retake</button>
              <button type="button" onClick={uploadCaptured} disabled={uploading} className="flex-1 py-2 rounded-lg bg-brand-600 text-sm text-white font-medium disabled:opacity-50 flex items-center justify-center gap-1.5">
                {uploading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {uploading ? 'Uploading…' : 'Use Photo'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Idle UI — compact row layout, works great on mobile
  return (
    <div className="space-y-2">
      {cameraError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{cameraError}</p>
      )}

      {uploading ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
          <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-slate-500">Uploading…</p>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:border-brand-300'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
        >
          <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-600 truncate">Browse or drop a file</p>
              <p className="text-xs text-slate-400">PDF, JPG, PNG · Max 10MB</p>
            </div>
          </label>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200 flex-shrink-0" />

          {/* Camera button inline */}
          <button type="button" onClick={openCamera} className="flex items-center gap-1.5 flex-shrink-0 text-sm text-slate-500 hover:text-brand-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            <span className="hidden sm:inline">Camera</span>
          </button>
        </div>
      )}
    </div>
  );
}