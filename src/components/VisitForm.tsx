'use client';

import { useState, useRef, useCallback, FormEvent } from 'react';
import TagSelector from '@/components/TagSelector';
import { useRouter } from 'next/navigation';

type ParsedFields = {
  doctorName: string;
  hospital: string;
  visitDate: string;
  reason: string;
  notes: string;
  tags: string[];
};

type CameraMode = 'idle' | 'camera' | 'preview';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

export default function VisitForm() {
  const router = useRouter();

  // Prescription state
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsed, setParsed] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('idle');
  const [cameraError, setCameraError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Form state
  const [form, setForm] = useState<ParsedFields>({
    visitDate: new Date().toISOString().split('T')[0],
    doctorName: '',
    hospital: '',
    reason: '',
    notes: '',
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  // ── File handling ──────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED.includes(file.type)) { setParseError('Only PDF, JPG, JPEG, or PNG files are allowed.'); return; }
    if (file.size > MAX_SIZE) { setParseError('File must be under 10MB.'); return; }
    setPrescriptionFile(file);
    setParseError('');
    setParsed(false);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPrescriptionPreview(url);
    } else {
      setPrescriptionPreview(null);
    }
    await parseWithGemini(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parseWithGemini = async (file: File) => {
    setParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-prescription', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Parsing failed');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Parsing failed');
      }
      const { parsed: data } = json as { parsed: ParsedFields };
      setForm(prev => ({
        visitDate: data.visitDate || prev.visitDate,
        doctorName: data.doctorName || prev.doctorName,
        hospital: data.hospital || prev.hospital,
        reason: data.reason || prev.reason,
        notes: data.notes || prev.notes,
        tags: data.tags?.length ? data.tags : prev.tags,
      }));
      setParsed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setParseError(`Could not extract details (${msg}). Fill in the fields manually.`);
    } finally {
      setParsing(false);
    }
  };

  const removePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
    setParsed(false);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Camera ─────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = async () => {
    setCameraError('');
    setCameraMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {
      setCameraError('Camera access denied. Allow camera permission and try again.');
      setCameraMode('idle');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPrescriptionPreview(dataUrl);
    stopStream();
    setCameraMode('preview');
  };

  const confirmCapture = async () => {
    if (!prescriptionPreview) return;
    const res = await fetch(prescriptionPreview);
    const blob = await res.blob();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = new File([blob], `prescription-${timestamp}.jpg`, { type: 'image/jpeg' });
    setCameraMode('idle');
    await handleFile(file);
  };

  const cancelCamera = () => {
    stopStream();
    setPrescriptionPreview(null);
    setCameraMode('idle');
  };

  // ── Submit ─────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.visitDate || !form.doctorName || !form.hospital || !form.reason) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      // 1. Create the visit
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create visit'); }
      const { visit } = await res.json();

      // 2. Upload prescription if one was captured/selected
      if (prescriptionFile) {
        const fd = new FormData();
        fd.append('file', prescriptionFile);
        fd.append('category', 'prescription');
        await fetch(`/api/visits/${visit.id}/files`, { method: 'POST', body: fd });
      }

      router.push(`/visits/${visit.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
  const labelClass = 'block text-sm font-medium text-slate-600 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Step 1: Prescription upload ── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">1</span>
          </div>
          <p className="text-sm font-medium text-slate-700">Upload or photograph a prescription <span className="text-slate-400 font-normal">(optional — we'll auto-fill the form)</span></p>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Camera view */}
        {cameraMode === 'camera' && (
          <div className="rounded-xl overflow-hidden bg-black relative mb-2">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr" />
              <div className="absolute bottom-14 left-3 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl" />
              <div className="absolute bottom-14 right-3 w-5 h-5 border-b-2 border-r-2 border-white rounded-br" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-black/80">
              <button type="button" onClick={cancelCamera} className="text-sm text-white/70 hover:text-white">Cancel</button>
              <button type="button" onClick={capture} className="w-12 h-12 rounded-full bg-white flex items-center justify-center active:scale-95">
                <div className="w-9 h-9 rounded-full border-2 border-slate-300" />
              </button>
              <div className="w-12" />
            </div>
          </div>
        )}

        {/* Captured preview (pre-confirm) */}
        {cameraMode === 'preview' && prescriptionPreview && (
          <div className="rounded-xl overflow-hidden bg-black mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prescriptionPreview} alt="Captured" className="w-full max-h-64 object-contain" />
            <div className="flex gap-3 px-4 py-3 bg-slate-900">
              <button type="button" onClick={() => { setPrescriptionPreview(null); openCamera(); }} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10">Retake</button>
              <button type="button" onClick={confirmCapture} className="flex-1 py-2 rounded-lg bg-brand-600 text-sm text-white font-medium hover:bg-brand-700">Use Photo</button>
            </div>
          </div>
        )}

        {/* File selected — show status */}
        {prescriptionFile && cameraMode === 'idle' && (
          <div className="space-y-3">
            {prescriptionPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prescriptionPreview} alt="Prescription" className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-white" />
            )}
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${parsing ? 'border-brand-200 bg-brand-50' : parsed ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
              {parsing ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin flex-shrink-0" />
                  <p className="text-sm text-brand-700">Analyzing prescription with AI…</p>
                </>
              ) : parsed ? (
                <>
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <p className="text-sm text-green-700">Fields filled from prescription — review and edit below</p>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                  <p className="text-sm text-slate-600 truncate flex-1">{prescriptionFile.name}</p>
                </>
              )}
              <button type="button" onClick={removePrescription} className="ml-auto text-slate-400 hover:text-slate-600 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {parseError && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{parseError}</p>}
          </div>
        )}

        {/* Upload options (when no file selected and not in camera mode) */}
        {!prescriptionFile && cameraMode === 'idle' && (
          <div className="space-y-2">
            {cameraError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{cameraError}</p>}
            <div
              className={`rounded-xl border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:border-brand-300 hover:bg-brand-50/30'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <label className="flex items-center gap-3 py-4 px-4 cursor-pointer">
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Browse or drop a file</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG · Max 10MB</p>
                </div>
              </label>
            </div>
            <button type="button" onClick={openCamera} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              Take a photo with camera
            </button>
          </div>
        )}
      </div>

      {/* ── Step 2: Visit details ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">2</span>
          </div>
          <p className="text-sm font-medium text-slate-700">Visit details <span className="text-slate-400 font-normal">(review and complete)</span></p>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Visit Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.visitDate} onChange={(e) => update('visitDate', e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Doctor Name <span className="text-red-400">*</span></label>
              <input type="text" value={form.doctorName} onChange={(e) => update('doctorName', e.target.value)} placeholder="Dr. Jane Smith" className={inputClass} required />
            </div>
          </div>

          <div>
            <label className={labelClass}>Hospital / Clinic <span className="text-red-400">*</span></label>
            <input type="text" value={form.hospital} onChange={(e) => update('hospital', e.target.value)} placeholder="Mount Sinai Hospital" className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>Reason for Visit <span className="text-red-400">*</span></label>
            <input type="text" value={form.reason} onChange={(e) => update('reason', e.target.value)} placeholder="Annual checkup, follow-up, etc." className={inputClass} required />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Medications, dosage, instructions, follow-up…" rows={4} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className={labelClass}>
              Tags
              {parsed && form.tags.length > 0 && (
                <span className="ml-2 text-xs font-normal text-brand-600">✓ AI suggested {form.tags.length} tag{form.tags.length > 1 ? 's' : ''}</span>
              )}
            </label>
            <TagSelector selected={form.tags} onChange={(tags) => setForm(prev => ({ ...prev, tags }))} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading || parsing} className="px-6 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Creating…' : 'Create Visit'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}