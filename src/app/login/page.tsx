'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => { setName(''); setEmail(''); setPassword(''); setError(''); };
  const switchMode = (m: 'login' | 'signup') => { setMode(m); resetForm(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === 'signup' && !name)) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || (mode === 'login' ? 'Login failed' : 'Signup failed')); }
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border-2 border-white" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full border border-white" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-white" />
        </div>
        <div className="relative z-10 px-16 max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
            <svg className="w-7 h-7 text-brand-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" />
            </svg>
          </div>
          <h1 className="font-display text-4xl text-white mb-4 leading-tight">Your medical history,<br /><span className="text-brand-300">always accessible.</span></h1>
          <p className="text-brand-200/80 leading-relaxed">Keep track of every visit, prescription, and report in one secure place. Never lose an important medical document again.</p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div><p className="font-display text-2xl text-white">100%</p><p className="text-xs text-brand-300/70 mt-1">Private & Secure</p></div>
            <div><p className="font-display text-2xl text-white">∞</p><p className="text-xs text-brand-300/70 mt-1">Visits & Files</p></div>
            <div><p className="font-display text-2xl text-white">24/7</p><p className="text-xs text-brand-300/70 mt-1">Access Anywhere</p></div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75" /></svg>
            </div>
            <span className="font-display text-xl text-brand-900">MedTrack</span>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
            <button type="button" onClick={() => switchMode('login')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Sign In
            </button>
            <button type="button" onClick={() => switchMode('signup')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Create Account
            </button>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl text-slate-800 mb-2">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-sm text-slate-400">{mode === 'login' ? 'Sign in to access your medical records' : 'Start tracking your medical visits for free'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Full name</label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Jane Smith" autoComplete="name" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" autoComplete="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-350 transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="text-brand-600 font-medium hover:text-brand-700 transition-colors">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
