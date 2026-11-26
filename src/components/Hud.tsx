import { Clock, Settings as Cog, ShieldCheck, Gauge, Trophy, ArrowUpCircle, Bot } from 'lucide-react';
import { fmtTime } from './ui';

interface Props {
  day: number;
  timeLeft: number;
  security: number;
  productivity: number;
  score: number;
  escalations: number;
  aiActive: boolean;
  onSettings: () => void;
}

const barColor = (v: number) => (v > 60 ? 'bg-safe' : v > 30 ? 'bg-amber-neon' : 'bg-threat');
const textColor = (v: number) => (v > 60 ? 'text-safe' : v > 30 ? 'text-amber-neon' : 'text-threat');

const Meter = ({ label, short, value, icon }: { label: string; short: string; value: number; icon: React.ReactNode }) => (
  <div className="min-w-0 flex-1 sm:max-w-[200px]">
    <div className="flex items-center justify-between gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
      <span className="flex items-center gap-1 truncate">
        {icon}
        <span className="hidden md:inline">{label}</span>
        <span className="md:hidden">{short}</span>
      </span>
      <span className={`font-bold ${textColor(value)}`}>{value}%</span>
    </div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

export function Hud({ day, timeLeft, security, productivity, score, escalations, aiActive, onSettings }: Props) {
  const low = timeLeft <= 30;
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel px-3 py-2 sm:flex-nowrap">
      <div className="flex items-center gap-3">
        <div className="hidden font-mono leading-none sm:block">
          <div className="text-[13px] font-bold tracking-[0.2em] text-slate-100">ZERO TRUST</div>
          <div className="mt-0.5 text-[10px] tracking-[0.3em] text-sys">SecOS v2.4</div>
        </div>
        <div className="rounded border border-line bg-panel2 px-2 py-1 font-mono text-xs text-slate-300">
          СМЕНА <span className="font-bold text-sys">{day}</span>/3
        </div>
        <div className={`flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-sm font-bold ${low ? 'animate-pulse border-threat/60 text-threat' : 'border-line text-amber-neon'}`}>
          <Clock className="h-3.5 w-3.5" />
          {fmtTime(timeLeft)}
        </div>
      </div>

      <div className="order-last flex w-full items-center gap-3 sm:order-none sm:w-auto sm:flex-1">
        <Meter label="Безопасность" short="Безоп." value={security} icon={<ShieldCheck className="h-3 w-3" />} />
        <Meter label="Продуктивность" short="Продукт." value={productivity} icon={<Gauge className="h-3 w-3" />} />
        <div className="shrink-0 text-right font-mono">
          <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            <Trophy className="h-3 w-3" /> Счёт
          </div>
          <div className="text-sm font-bold text-sys">{score.toLocaleString('ru-RU')}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {aiActive && (
          <span className="hidden items-center gap-1 rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 font-mono text-[10px] uppercase text-violet-300 md:flex" title="ИИ-режим активен">
            <Bot className="h-3 w-3" /> AI
          </span>
        )}
        <span className="flex items-center gap-1 rounded border border-amber-neon/40 bg-amber-neon/10 px-2 py-1 font-mono text-[11px] text-amber-neon" title="Заряды эскалации на L2">
          <ArrowUpCircle className="h-3.5 w-3.5" /> L2 ×{escalations}
        </span>
        <button onClick={onSettings} className="rounded border border-line p-1.5 text-slate-400 hover:border-sys hover:text-sys" aria-label="Настройки">
          <Cog className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
