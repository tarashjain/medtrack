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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopStream();
    setMode('preview');
  };

  const retake = async () => {
    setCapturedImage(null);
    await openCamera();
  };

  const cancelCamera = () => {
    stopStream();
    setCapturedImage(null);
    setMode('idle');
  };

  const uploadCaptured = async () => {
    if (!capturedImage) return;
    const res = await fetch(capturedImage);
    const blob = await res.blob();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `${category}-${timestamp}.jpg`, { type: 'image/jpeg' });
    cancelCamera();
    await uploadFile(file);
  };

  // Camera / preview UI
  if (mode === 'camera' || mode === 'preview') {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-black relative">
        <canvas ref={canvasRef} className="hidden" />

        {mode === 'camera' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-72 object-cover"
            />
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border border-white/30 rounded-lg" />
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
              <button type="button" onClick={cancelCamera} className="text-sm text-white/70 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
              >
                <div className="w-10 h-10 rounded-full border-2 border-slate-300" />
              </button>
              <div className="w-12" />
            </div>
          </>
        )}

        {mode === 'preview' && capturedImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Captured" className="w-full max-h-72 object-contain bg-black" />
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-900">
              <button type="button" onClick={retake} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10 transition-colors">
                Retake
              </button>
              <button
                type="button"
                onClick={uploadCaptured}
                disabled={uploading}
                className="flex-1 py-2 rounded-lg bg-brand-600 text-sm text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {uploading ? 'Uploading…' : 'Use Photo'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default idle UI
  return (
    <div className="space-y-2">
      {cameraError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          <p className="text-xs text-red-600">{cameraError}</p>
        </div>
      )}

      {/* Drop zone */}
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

      {/* Camera button */}
      <button
        type="button"
        onClick={openCamera}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
      >
        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>
        Take a photo with camera
      </button>
    </div>
  );
}