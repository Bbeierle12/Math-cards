import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { XIcon } from './Icons';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user, userProfile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.user_metadata?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const photoURL = userProfile?.photoURL || user.user_metadata?.avatar_url;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-xl font-bold text-cyan-400">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 pb-6 space-y-4">
          <div className="flex justify-center">
            {photoURL ? (
              <img src={photoURL} alt="" className="w-20 h-20 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-cyan-600 flex items-center justify-center text-2xl font-bold text-white">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center">Avatar is set by your sign-in provider</p>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
