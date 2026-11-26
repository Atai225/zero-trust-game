import { useEffect, useState } from 'react';
import { ArrowUpCircle, Ban, CheckCircle2, Power, Settings as Cog, ShieldHalf } from 'lucide-react';
import type { Day } from '../types';
import { DAY_INFO, RULES } from '../data/rules';

const BOOT_LINES = [
  'SecOS v2.4 (build 2611) — защищённая загрузка…',
  '[ OK ] Монтирование /var/soc/queue',
  '[ OK ] Почтовый шлюз mx1.nordtech.ru — подключён',
  '[ OK ] NordChat DLP-мост — подключён',
  '[ OK ] Запись звонков АТС — подключена',
  '[ OK ] Песочница detonate-03 — готова',
  '[WARN] Ночная смена: L2 доступен ограниченно (2 эскалации)',
  'Добро пожаловать, аналитик L1.',
];

export function BootScreen({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLines((l) => (l >= BOOT_LINES.length ? l : l + 1)), 220);
    return () => clearInterval(t);
  }, []);
  const ready = lines >= BOOT_LINES.length;

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-2xl py-6">
        <div className="mb-6 flex items-center gap-3">
          <ShieldHalf className="h-10 w-10 text-sys" />
          <div>
            <h1 className="font-mono text-3xl font-bold tracking-[0.15em] text-white sm:text-4xl">ZERO TRUST</h1>
            <div className="font-mono text-sm tracking-[0.5em] text-amber-neon">NIGHT SHIFT</div>
          </div>
        </div>

        <div className="min-h-[200px] rounded-lg border border-line bg-panel p-4 font-mono text-[12px] leading-relaxed sm:text-[13px]">
          {BOOT_LINES.slice(0, lines).map((l, i) => (
            <div key={i} className={l.includes('[WARN]') ? 'text-amber-neon' : l.includes('[ OK ]') ? 'text-safe' : 'text-slate-300'}>
              {l}
            </div>
          ))}
          {!ready && <span className="animate-blink text-sys">█</span>}
        </div>

        {ready && (
          <div className="mt-5 animate-slideIn">
            <p className="mb-4 text-sm leading-relaxed text-slate-400">
              Вы — дежурный аналитик SOC компании «НордТех». Почтовый фильтр и DLP задерживают подозрительные письма, чаты и звонки. Ваша задача — решить судьбу каждого
              тикета: пропустить легитимное и остановить атаки. Блокировать всё подряд нельзя — бизнес встанет.
            </p>
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded border border-safe/40 bg-safe/5 p-2.5 text-xs text-safe"><CheckCircle2 className="h-4 w-4 shrink-0" /> Одобрить легитимное (A)</div>
              <div className="flex items-center gap-2 rounded border border-threat/40 bg-threat/5 p-2.5 text-xs text-threat"><Ban className="h-4 w-4 shrink-0" /> Блокировать атаки (B)</div>
              <div className="flex items-center gap-2 rounded border border-amber-neon/40 bg-amber-neon/5 p-2.5 text-xs text-amber-neon"><ArrowUpCircle className="h-4 w-4 shrink-0" /> 2 эскалации на L2 (E)</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onStart} className="flex items-center gap-2 rounded-md border border-sys bg-sys/15 px-6 py-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-sys hover:bg-sys/25">
                <Power className="h-4 w-4" /> Заступить на смену
              </button>
              <button onClick={onSettings} className="flex items-center gap-2 rounded-md border border-line px-4 py-3 font-mono text-xs uppercase tracking-wider text-slate-400 hover:border-slate-500 hover:text-slate-200">
                <Cog className="h-4 w-4" /> Настройки / API
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Briefing({ day, onStart }: { day: Day; onStart: () => void }) {
  const info = DAY_INFO[day];
  const rules = RULES.filter((r) => r.day === day);
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <div className="w-full max-w-xl animate-slideIn py-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-sys">Брифинг перед сменой</div>
        <h1 className="mt-1 font-mono text-2xl font-bold text-white sm:text-3xl">{info.title}</h1>
        <p className="mt-2 text-slate-400">{info.subtitle}</p>
        <div className="mt-5 rounded-lg border border-amber-neon/40 bg-amber-neon/5 p-4">
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-amber-neon">{day === 1 ? 'Базовые правила SOC' : 'Новые правила в памятке'}</div>
          <ul className="space-y-2">
            {rules.map((r) => (
              <li key={r.id} className="flex gap-2 text-sm leading-snug text-slate-200">
                <span className="text-amber-neon">›</span> {r.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 font-mono text-xs text-slate-500">
          Длительность смены: {Math.round(info.duration / 60)} мин · у каждого тикета свой таймер · проверка инструментами даёт бонус к очкам.
        </p>
        <button onClick={onStart} className="mt-5 flex items-center gap-2 rounded-md border border-sys bg-sys/15 px-6 py-3 font-mono text-sm font-bold uppercase tracking-[0.2em] text-sys hover:bg-sys/25">
          <Power className="h-4 w-4" /> Начать смену {day}
        </button>
      </div>
    </div>
  );
}
