import { useState } from 'react';
import { Bot, KeyRound, Loader2, Monitor, Volume2, VolumeX, X } from 'lucide-react';
import type { Settings } from '../types';
import { testConnection } from '../services/aiGenerator';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

const Toggle = ({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-md border border-line bg-panel2 px-3 py-2.5 hover:border-slate-600"
    role="switch"
    aria-checked={on}
  >
    <span className="flex items-center gap-2 text-sm text-slate-200">
      {icon}
      {label}
    </span>
    <span className={`relative h-5 w-9 rounded-full transition ${on ? 'bg-safe' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
  </button>
);

export function SettingsModal({ settings, onChange, onClose }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testConnection(settings);
      setTestResult({ ok: true, text: `Подключено. Ответ модели: «${r.slice(0, 40)}»` });
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : 'Ошибка подключения' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-md animate-slideIn overflow-y-auto rounded-lg border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Настройки"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-sys">Настройки SecOS</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-line hover:text-white" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <Toggle
            on={settings.sound}
            onClick={() => set({ sound: !settings.sound })}
            label="Звуковые эффекты"
            icon={settings.sound ? <Volume2 className="h-4 w-4 text-sys" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          />
          <Toggle on={settings.crt} onClick={() => set({ crt: !settings.crt })} label="Эффект CRT-монитора" icon={<Monitor className="h-4 w-4 text-sys" />} />

          <div className="rounded-md border border-line bg-panel2 p-3">
            <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-amber-neon">
              <Bot className="h-4 w-4" /> ИИ-режим (необязательно)
            </div>
            <p className="mb-3 text-[13px] leading-snug text-slate-400">
              С ключом в каждую смену добавляется сгенерированный кейс, а в «Допросе» можно задавать свои вопросы. Без ключа игра полностью работает на встроенной базе.
            </p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(['openai', 'gemini'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => set({ provider: p })}
                  className={`rounded border px-2 py-1.5 font-mono text-xs ${settings.provider === p ? 'border-sys bg-sys/10 text-sys' : 'border-line text-slate-400 hover:border-slate-600'}`}
                >
                  {p === 'openai' ? 'OpenAI' : 'Gemini'}
                </button>
              ))}
            </div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="apikey">API-ключ</label>
            <div className="mb-2 flex items-center gap-2 rounded border border-line bg-ink px-2 focus-within:border-sys">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <input
                id="apikey"
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
                placeholder={settings.provider === 'openai' ? 'sk-…' : 'AIza…'}
                className="w-full bg-transparent py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600"
              />
            </div>
            <label className="mb-1 block text-xs text-slate-400" htmlFor="model">Модель (по умолчанию {settings.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash'})</label>
            <input
              id="model"
              value={settings.model}
              onChange={(e) => set({ model: e.target.value })}
              placeholder="оставьте пустым"
              className="mb-3 w-full rounded border border-line bg-ink px-2 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sys"
            />
            <button
              onClick={runTest}
              disabled={!settings.apiKey.trim() || testing}
              className="flex w-full items-center justify-center gap-2 rounded border border-sys/50 bg-sys/10 py-2 font-mono text-xs uppercase tracking-wider text-sys hover:bg-sys/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Проверить подключение
            </button>
            {testResult && <p className={`mt-2 break-words text-xs ${testResult.ok ? 'text-safe' : 'text-threat'}`}>{testResult.text}</p>}
            <p className="mt-2 text-[11px] text-slate-500">Ключ хранится только в localStorage этого браузера и отправляется напрямую провайдеру.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
