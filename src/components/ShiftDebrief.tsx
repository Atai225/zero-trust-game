import { ArrowRight, Check, CheckCircle2, Clock3, RotateCcw, ShieldAlert, ShieldCheck, Skull, Trophy, X, XCircle, ArrowUpCircle } from 'lucide-react';
import type { Decision, FlagSource, ResolvedCase } from '../types';
import type { EndReason } from '../hooks/useShift';
import { ChannelIcon } from './ui';

interface Props {
  day: number;
  reason: EndReason;
  cases: ResolvedCase[];
  allCases: ResolvedCase[];
  security: number;
  productivity: number;
  score: number;
  shiftScore: number;
  onNext: () => void;
  onRestart: () => void;
}

const DECISION_LABEL: Record<Decision, string> = {
  approve: 'Одобрено',
  block: 'Карантин',
  escalate: 'Эскалация L2',
  expired: 'Просрочено',
};

const SOURCE_LABEL: Record<FlagSource, string> = {
  content: 'текст сообщения',
  headers: 'Raw Headers',
  sandbox: 'Sandbox',
  directory: 'справочник',
  rules: 'памятка SOC',
  interrogation: 'допрос',
};

const REASON: Record<EndReason, { title: string; text: string; cls: string; Icon: typeof Trophy }> = {
  cleared: { title: 'Очередь разобрана', text: 'Все тикеты смены обработаны до её окончания.', cls: 'text-safe', Icon: ShieldCheck },
  time: { title: 'Смена окончена', text: 'Не все тикеты разобраны вовремя — просроченные засчитаны как ошибки.', cls: 'text-amber-neon', Icon: Clock3 },
  breach: { title: 'КОМПАНИЯ ВЗЛОМАНА', text: 'Уровень безопасности упал до нуля. Злоумышленники получили доступ к инфраструктуре.', cls: 'text-threat', Icon: Skull },
  fired: { title: 'ВЫ УВОЛЕНЫ', text: 'Продуктивность упала до нуля: вы заблокировали слишком много легитимной работы.', cls: 'text-threat', Icon: ShieldAlert },
};

const rank = (acc: number, score: number) => {
  if (acc >= 0.92 && score >= 1600) return 'Легенда SOC';
  if (acc >= 0.8) return 'Охотник за угрозами';
  if (acc >= 0.6) return 'Аналитик L1';
  return 'Стажёр на испытательном сроке';
};

export function ShiftDebrief({ day, reason, cases, allCases, security, productivity, score, shiftScore, onNext, onRestart }: Props) {
  const gameOver = reason === 'breach' || reason === 'fired';
  const isFinal = gameOver || day >= 3;
  const correct = cases.filter((c) => c.correct).length;
  const totalCorrect = allCases.filter((c) => c.correct).length;
  const acc = allCases.length ? totalCorrect / allCases.length : 0;
  const anyExpired = cases.some((c) => c.decision === 'expired');
  const R = reason === 'cleared' && anyExpired ? REASON.time : REASON[reason];

  return (
    <div className="h-full overflow-y-auto bg-ink">
      <div className="mx-auto max-w-4xl p-3 sm:p-6">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.3em] text-sys">Shift Debrief · смена {day}</div>
        <div className={`flex items-center gap-3 ${R.cls}`}>
          <R.Icon className="h-8 w-8 shrink-0" />
          <h1 className="font-mono text-2xl font-bold tracking-wide sm:text-3xl">{R.title}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">{R.text}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Верных решений', `${correct}/${cases.length}`, correct === cases.length ? 'text-safe' : 'text-amber-neon'],
            ['Очки за смену', `${shiftScore >= 0 ? '+' : ''}${shiftScore}`, shiftScore >= 0 ? 'text-sys' : 'text-threat'],
            ['Безопасность', `${security}%`, security > 60 ? 'text-safe' : security > 30 ? 'text-amber-neon' : 'text-threat'],
            ['Продуктивность', `${productivity}%`, productivity > 60 ? 'text-safe' : productivity > 30 ? 'text-amber-neon' : 'text-threat'],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-lg border border-line bg-panel p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
              <div className={`mt-1 font-mono text-xl font-bold ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        <h2 className="mb-2 mt-6 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">Разбор кейсов</h2>
        <div className="space-y-3">
          {cases.map((c) => {
            const sc = c.scenario;
            return (
              <article key={sc.id} className={`rounded-lg border bg-panel p-3 sm:p-4 ${c.correct ? 'border-safe/30' : 'border-threat/40'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 rounded border border-line bg-ink p-1.5"><ChannelIcon channel={sc.channel} /></div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100">{sc.subject}</div>
                      <div className="break-all font-mono text-xs text-slate-500">{sc.sender.name} · {sc.sender.address}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase">
                    <span className={`rounded border px-1.5 py-0.5 ${sc.isMalicious ? 'border-threat/50 text-threat' : 'border-safe/50 text-safe'}`}>
                      {sc.isMalicious ? sc.category : 'Легитимное'}
                    </span>
                    <span className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-slate-300">
                      {c.decision === 'escalate' ? <ArrowUpCircle className="h-3 w-3 text-amber-neon" /> : c.correct ? <CheckCircle2 className="h-3 w-3 text-safe" /> : <XCircle className="h-3 w-3 text-threat" />}
                      {DECISION_LABEL[c.decision]}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 font-bold ${c.scoreDelta >= 0 ? 'bg-sys/10 text-sys' : 'bg-threat/10 text-threat'}`}>
                      {c.scoreDelta >= 0 ? '+' : ''}{c.scoreDelta}
                    </span>
                  </div>
                </div>

                {sc.isMalicious ? (
                  <ul className="mt-3 space-y-1">
                    {sc.redFlags.map((f, i) => {
                      const seen = c.usedTools.has(f.source);
                      const spotted = f.source === 'content' ? c.correct : seen;
                      return (
                        <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                          {spotted ? (
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-safe" />
                          ) : (
                            <X className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${c.correct ? 'text-amber-neon' : 'text-threat'}`} />
                          )}
                          <span className={spotted ? 'text-slate-300' : 'text-slate-200'}>
                            {f.text}
                            <span className={`ml-1.5 font-mono text-[10px] ${spotted ? 'text-slate-500' : c.correct ? 'text-amber-neon' : 'text-threat'}`}>
                              [{SOURCE_LABEL[f.source]}{!spotted && f.source !== 'content' ? ' — не проверено' : !spotted ? ' — пропущено' : ''}]
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {sc.greenFlags.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-slate-300">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-safe" /> {g}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 border-t border-line pt-2 text-[13px] leading-snug text-slate-400">{sc.explanation}</p>
              </article>
            );
          })}
          {cases.length === 0 && <p className="text-sm text-slate-500">В эту смену не было разобрано ни одного кейса.</p>}
        </div>

        {isFinal && (
          <div className="mt-6 rounded-lg border border-sys/40 bg-sys/5 p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-sys">Итог карьеры</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="text-xs text-slate-500">Звание</div>
                <div className="font-mono text-xl font-bold text-white">{gameOver ? 'Отстранён от смен' : rank(acc, score)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Точность</div>
                <div className="font-mono text-xl font-bold text-sys">{Math.round(acc * 100)}%</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Итоговый счёт</div>
                <div className="font-mono text-xl font-bold text-amber-neon">{score.toLocaleString('ru-RU')}</div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 pb-6">
          {!isFinal && (
            <button onClick={onNext} className="flex items-center gap-2 rounded-md border border-safe/60 bg-safe/10 px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-safe hover:bg-safe/20">
              Следующая смена <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button onClick={onRestart} className="flex items-center gap-2 rounded-md border border-line px-5 py-3 font-mono text-sm uppercase tracking-wider text-slate-300 hover:border-sys hover:text-sys">
            <RotateCcw className="h-4 w-4" /> {isFinal ? 'Играть заново' : 'Начать сначала'}
          </button>
        </div>
      </div>
    </div>
  );
}
