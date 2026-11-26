import { Mail, MessageSquare, PhoneCall } from 'lucide-react';
import type { Channel } from '../types';
import type { ReactNode } from 'react';

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const CHANNEL_META: Record<Channel, { label: string; Icon: typeof Mail; color: string }> = {
  email: { label: 'Email', Icon: Mail, color: 'text-sys' },
  chat: { label: 'Messenger', Icon: MessageSquare, color: 'text-violet-400' },
  call: { label: 'Vishing', Icon: PhoneCall, color: 'text-amber-neon' },
};

export const ChannelIcon = ({ channel, className = 'h-4 w-4' }: { channel: Channel; className?: string }) => {
  const { Icon, color } = CHANNEL_META[channel];
  return <Icon className={`${className} ${color}`} aria-hidden />;
};

export const PanelTitle = ({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
    <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
      {icon}
      <span className="truncate">{children}</span>
    </div>
    {right}
  </div>
);

export const Waveform = ({ active = true, bars = 28, color = 'bg-amber-neon' }: { active?: boolean; bars?: number; color?: string }) => (
  <div className="flex h-10 items-center gap-[3px]" aria-hidden>
    {Array.from({ length: bars }).map((_, i) => (
      <span
        key={i}
        className={`w-[3px] origin-center rounded-full ${color} ${active ? 'animate-wave' : ''}`}
        style={{
          height: `${30 + ((i * 37) % 70)}%`,
          animationDelay: `${(i * 0.07) % 1}s`,
          animationDuration: `${0.6 + ((i * 13) % 7) / 10}s`,
          opacity: active ? 0.9 : 0.3,
          transform: active ? undefined : 'scaleY(0.3)',
        }}
      />
    ))}
  </div>
);

export const Verdict = ({ v }: { v: 'clean' | 'suspicious' | 'malicious' }) => {
  const map = {
    clean: ['ЧИСТО', 'text-safe border-safe/50 bg-safe/10'],
    suspicious: ['ПОДОЗРИТЕЛЬНО', 'text-amber-neon border-amber-neon/50 bg-amber-neon/10'],
    malicious: ['ВРЕДОНОСНО', 'text-threat border-threat/50 bg-threat/10'],
  } as const;
  const [label, cls] = map[v];
  return <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider ${cls}`}>{label}</span>;
};
