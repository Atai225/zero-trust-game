import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day, ResolvedCase, Settings, ToastMsg } from './types';
import type { CareerStats, EndReason, ShiftState } from './hooks/useShift';
import { setSoundEnabled, sound } from './utils/sound';
import { BootScreen, Briefing } from './components/Screens';
import { ShiftScreen } from './components/ShiftScreen';
import { ShiftDebrief } from './components/ShiftDebrief';
import { SettingsModal } from './components/SettingsModal';
import { Toasts } from './components/Toasts';

type Screen = 'boot' | 'briefing' | 'shift' | 'debrief';

const STORAGE_KEY = 'ztns-settings-v1';
const DEFAULT_SETTINGS: Settings = { sound: true, crt: true, provider: 'openai', apiKey: '', model: '' };
const START: CareerStats = { security: 100, productivity: 100, score: 0 };

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [screen, setScreen] = useState<Screen>('boot');
  const [day, setDay] = useState<Day>(1);
  const [career, setCareer] = useState<CareerStats>(START);
  const [allCases, setAllCases] = useState<ResolvedCase[]>([]);
  const [last, setLast] = useState<{ reason: EndReason; cases: ResolvedCase[]; shiftScore: number } | null>(null);
  const [shiftKey, setShiftKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setSoundEnabled(settings.sound);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage может быть недоступен — не критично */
    }
  }, [settings]);

  // пауза, когда вкладка не активна
  useEffect(() => {
    const h = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  const toast = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3800);
  }, []);

  const closeToast = useCallback((id: number) => setToasts((l) => l.filter((x) => x.id !== id)), []);

  const startShift = () => {
    sound.boot();
    setShiftKey((k) => k + 1);
    setScreen('shift');
  };

  const handleEnd = useCallback(
    (s: ShiftState) => {
      const reason = s.ended ?? 'time';
      setLast({ reason, cases: s.resolved, shiftScore: s.score - career.score });
      setAllCases((all) => [...all, ...s.resolved]);
      setCareer({ security: s.security, productivity: s.productivity, score: s.score });
      setToasts([]);
      if (reason === 'breach' || reason === 'fired') sound.error();
      else sound.success();
      setScreen('debrief');
    },
    [career.score],
  );

  const nextDay = () => {
    sound.click();
    setDay((d) => (Math.min(3, d + 1) as Day));
    // между сменами немного восстанавливаем показатели
    setCareer((c) => ({ ...c, security: Math.min(100, c.security + 10), productivity: Math.min(100, c.productivity + 10) }));
    setScreen('briefing');
  };

  const restart = () => {
    sound.click();
    setDay(1);
    setCareer(START);
    setAllCases([]);
    setLast(null);
    setScreen('briefing');
  };

  return (
    <div className={`relative h-[100dvh] overflow-hidden bg-ink text-slate-200 ${settings.crt ? 'crt-on' : ''}`}>
      {screen === 'boot' && (
        <BootScreen
          onStart={() => {
            sound.click();
            setScreen('briefing');
          }}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'briefing' && <Briefing day={day} onStart={startShift} />}
      {screen === 'shift' && (
        <ShiftScreen
          key={shiftKey}
          day={day}
          career={career}
          settings={settings}
          paused={settingsOpen || hidden}
          onOpenSettings={() => setSettingsOpen(true)}
          onEnd={handleEnd}
          toast={toast}
        />
      )}
      {screen === 'debrief' && last && (
        <ShiftDebrief
          day={day}
          reason={last.reason}
          cases={last.cases}
          allCases={allCases}
          security={career.security}
          productivity={career.productivity}
          score={career.score}
          shiftScore={last.shiftScore}
          onNext={nextDay}
          onRestart={restart}
        />
      )}

      <Toasts items={toasts} onClose={closeToast} />
      {settingsOpen && <SettingsModal settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}
      {settingsOpen && screen === 'shift' && (
        <div className="pointer-events-none fixed left-1/2 top-3 z-[60] -translate-x-1/2 rounded border border-amber-neon/50 bg-panel px-3 py-1 font-mono text-xs text-amber-neon">⏸ ПАУЗА</div>
      )}
      {settings.crt && <div className="crt-overlay" aria-hidden />}
    </div>
  );
}
