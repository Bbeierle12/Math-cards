import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOutIcon } from './Icons';

interface ProfileBadgeProps {
  onSignInClick: () => void;
  onEditProfileClick: () => void;
  isDark: boolean;
}

export default function ProfileBadge({ onSignInClick, onEditProfileClick, isDark }: ProfileBadgeProps) {
  const { user, userProfile, loading, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isDark
            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }`}
      >
        Sign In
      </button>
    );
  }

  const displayName = userProfile?.displayName || user.user_metadata?.display_name || user.user_metadata?.full_name || 'User';
  const photoURL = userProfile?.photoURL || user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
          isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'
        }`}
      >
        {photoURL ? (
          <img src={photoURL} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isDark ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white'
          }`}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={`text-sm font-medium hidden sm:inline ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
          {displayName}
        </span>
      </button>

      {dropdownOpen && (
        <div className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-50 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => { setDropdownOpen(false); onEditProfileClick(); }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors rounded-t-lg ${
              isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => { setDropdownOpen(false); signOut(); }}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors rounded-b-lg flex items-center gap-2 ${
              isDark ? 'text-red-400 hover:bg-slate-700' : 'text-red-500 hover:bg-gray-100'
            }`}
          >
            <LogOutIcon className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
