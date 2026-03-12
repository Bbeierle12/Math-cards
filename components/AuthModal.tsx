import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { XIcon, GoogleIcon, GitHubIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGitHub } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Display name is required');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName.trim());
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    setLoading(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithGitHub();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-xl font-bold text-cyan-400">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Tab toggle */}
          <div className="flex rounded-lg bg-slate-700 p-0.5 mb-5">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'signin' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'signup' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <GoogleIcon className="w-5 h-5" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <GitHubIcon className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-600" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-600" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
