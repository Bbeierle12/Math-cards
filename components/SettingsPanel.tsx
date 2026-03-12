import React, { useState } from 'react';
import { UserSettings, UserProgress } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { XIcon } from './Icons';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userProgress: UserProgress;
  setUserProgress: (value: UserProgress | ((prev: UserProgress) => UserProgress)) => void;
  onSignInClick?: () => void;
  onEditProfileClick?: () => void;
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <div className="pr-4">
        <div className="text-sm font-medium text-gray-200 group-hover:text-white">{label}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-cyan-600' : 'bg-slate-600'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${checked ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

function SegmentedControl<T extends string>({ value, onChange, options, label, description }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  description?: string;
}) {
  return (
    <div className="py-2">
      <div className="text-sm font-medium text-gray-200 mb-1">{label}</div>
      {description && <div className="text-xs text-slate-400 mb-2">{description}</div>}
      <div className="flex rounded-lg bg-slate-700 p-0.5">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value === opt.value ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberStepper({ value, onChange, min, max, step, label, description, suffix }: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  description?: string;
  suffix?: string;
}) {
  const s = step || 1;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="pr-4">
        <div className="text-sm font-medium text-gray-200">{label}</div>
        {description && <div className="text-xs text-slate-400">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - s))}
          disabled={value <= min}
          className="w-8 h-8 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold"
        >
          -
        </button>
        <span className="text-sm font-mono w-12 text-center text-gray-200">
          {value === 0 && suffix === '' ? '\u221E' : value}{suffix}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + s))}
          disabled={value >= max}
          className="w-8 h-8 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

function RangeControl({ value, onChange, label, description }: {
  value: { min: number; max: number };
  onChange: (v: { min: number; max: number }) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="py-2">
      <div className="text-sm font-medium text-gray-200">{label}</div>
      {description && <div className="text-xs text-slate-400 mb-2">{description}</div>}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">Min:</span>
          <input
            type="number"
            value={value.min}
            onChange={e => onChange({ ...value, min: Math.min(parseInt(e.target.value) || 0, value.max - 1) })}
            className="w-16 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-center text-gray-200"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">Max:</span>
          <input
            type="number"
            value={value.max}
            onChange={e => onChange({ ...value, max: Math.max(parseInt(e.target.value) || 0, value.min + 1) })}
            className="w-16 px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-center text-gray-200"
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-left"
      >
        <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{title}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
      {open && <div className="pb-3 space-y-1">{children}</div>}
    </div>
  );
}

export default function SettingsPanel({ isOpen, onClose, userProgress, setUserProgress, onSignInClick, onEditProfileClick }: SettingsPanelProps) {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { user, userProfile, signOut } = useAuth();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  if (!isOpen) return null;

  const handleResetProgress = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    setUserProgress({
      topicProgress: {},
      totalProblemsAttempted: 0,
      totalCorrect: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    setShowResetConfirm(false);
  };

  const handleRestoreDefaults = () => {
    if (!showRestoreConfirm) {
      setShowRestoreConfirm(true);
      return;
    }
    resetSettings();
    setShowRestoreConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-cyan-400">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-2">
          <Section title="Account">
            {user ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-3">
                  {(userProfile?.photoURL || user.user_metadata?.avatar_url) ? (
                    <img src={userProfile?.photoURL || user.user_metadata?.avatar_url} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-sm font-bold text-white">
                      {(userProfile?.displayName || user.user_metadata?.display_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{userProfile?.displayName || user.user_metadata?.display_name}</div>
                    <div className="text-xs text-slate-400 truncate">{user.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { onClose(); onEditProfileClick?.(); }}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-sm text-slate-400">Sign in to sync your progress across devices.</p>
                <button
                  type="button"
                  onClick={() => { onClose(); onSignInClick?.(); }}
                  className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              </div>
            )}
          </Section>

          <Section title="Practice Preferences">
            <SegmentedControl
              value={settings.practiceMode}
              onChange={v => updateSettings({ practiceMode: v })}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'speed-drill', label: 'Speed Drill' },
                { value: 'thoughtful', label: 'Thoughtful' },
              ]}
              label="Practice Mode"
              description="Controls session pacing"
            />
            <NumberStepper
              value={settings.problemsPerSession}
              onChange={v => updateSettings({ problemsPerSession: v })}
              min={0}
              max={50}
              step={5}
              label="Problems Per Session"
              description="0 = unlimited"
              suffix=""
            />
            <Toggle
              checked={settings.showHintsAutomatically}
              onChange={v => updateSettings({ showHintsAutomatically: v })}
              label="Auto-Show Hints"
              description="Reveal hints after an incorrect attempt"
            />
            <Toggle
              checked={settings.showExplanationOnIncorrect}
              onChange={v => updateSettings({ showExplanationOnIncorrect: v })}
              label="Show Explanation on Incorrect"
              description="Display explanation after a wrong answer"
            />
          </Section>

          <Section title="Difficulty & Progression">
            <NumberStepper
              value={settings.masteryThreshold}
              onChange={v => updateSettings({ masteryThreshold: v })}
              min={3}
              max={50}
              label="Mastery Threshold"
              description="Correct answers needed to master a topic"
            />
            <RangeControl
              value={settings.numberRange}
              onChange={v => updateSettings({ numberRange: v })}
              label="Number Range"
              description="Controls magnitude of generated operands"
            />
            <Toggle
              checked={settings.allowNegatives}
              onChange={v => updateSettings({ allowNegatives: v })}
              label="Allow Negatives"
              description="Include negative numbers in basic arithmetic"
            />
            <SegmentedControl
              value={settings.unlockMode}
              onChange={v => updateSettings({ unlockMode: v })}
              options={[
                { value: 'sequential', label: 'Sequential' },
                { value: 'free', label: 'Free' },
              ]}
              label="Unlock Mode"
              description="Sequential: topics gated by mastery. Free: all unlocked."
            />
          </Section>

          <Section title="Timer / Speed Drill" defaultOpen={false}>
            <Toggle
              checked={settings.timerEnabled}
              onChange={v => updateSettings({ timerEnabled: v })}
              label="Enable Timer"
              description="Show a per-problem countdown"
            />
            {settings.timerEnabled && (
              <NumberStepper
                value={settings.timerDurationSeconds}
                onChange={v => updateSettings({ timerDurationSeconds: v })}
                min={10}
                max={300}
                step={10}
                label="Timer Duration"
                suffix="s"
              />
            )}
            <Toggle
              checked={settings.autoAdvanceOnCorrect}
              onChange={v => updateSettings({ autoAdvanceOnCorrect: v })}
              label="Auto-Advance on Correct"
              description="Automatically proceed to next question"
            />
          </Section>

          <Section title="Appearance" defaultOpen={false}>
            <SegmentedControl
              value={settings.theme}
              onChange={v => updateSettings({ theme: v })}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' },
              ]}
              label="Theme"
            />
            <Toggle
              checked={settings.animationsEnabled}
              onChange={v => updateSettings({ animationsEnabled: v })}
              label="Animations"
              description="Toggle shake/pop/fade animations"
            />
            <SegmentedControl
              value={settings.fontSize}
              onChange={v => updateSettings({ fontSize: v })}
              options={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
              label="Font Size"
              description="Scale problem text and inputs"
            />
          </Section>

          <Section title="Audio & Feedback" defaultOpen={false}>
            <Toggle
              checked={settings.soundEnabled}
              onChange={v => updateSettings({ soundEnabled: v })}
              label="Sound Effects"
              description="Play sounds on correct/incorrect"
            />
            <Toggle
              checked={settings.hapticFeedback}
              onChange={v => updateSettings({ hapticFeedback: v })}
              label="Haptic Feedback"
              description="Vibrate on mobile for wrong answers"
            />
          </Section>

          <Section title="Data & Privacy" defaultOpen={false}>
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  showRestoreConfirm
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {showRestoreConfirm ? 'Confirm Restore Defaults?' : 'Restore Default Settings'}
              </button>
              <button
                type="button"
                onClick={handleResetProgress}
                className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  showResetConfirm
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {showResetConfirm ? 'Are you sure? All progress will be lost!' : 'Reset All Progress'}
              </button>
              {(showResetConfirm || showRestoreConfirm) && (
                <button
                  type="button"
                  onClick={() => { setShowResetConfirm(false); setShowRestoreConfirm(false); }}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
