import type { Day, Scenario, Settings, SandboxFileReport, SandboxLinkReport } from '../types';
import { EMPLOYEES } from '../data/employees';
import { RULES } from '../data/rules';

/**
 * Динамическая генерация сценариев и ответов отправителя через OpenAI или Gemini.
 * Все запросы идут прямо из браузера; ключ хранится только в localStorage.
 * При любой ошибке игра продолжает работать на локальной базе.
 */

const DEFAULT_MODEL = { openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash' } as const;

export const hasAi = (s: Settings) => s.apiKey.trim().length > 10;

async function callLLM(settings: Settings, system: string, user: string, json: boolean): Promise<string> {
  const model = settings.model.trim() || DEFAULT_MODEL[settings.provider];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    if (settings.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
        body: JSON.stringify({
          model,
          temperature: 0.9,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.apiKey.trim() },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.9, ...(json ? { responseMimeType: 'application/json' } : {}) },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  } finally {
    clearTimeout(timer);
  }
}

const directoryForPrompt = () =>
  EMPLOYEES.map((e) => `${e.id}: ${e.name}, ${e.title}, ${e.email}, ${e.phone}, статус: ${e.statusText}`).join('\n');

const SCENARIO_SCHEMA = `{
  "channel": "email" | "chat" | "call",
  "isMalicious": boolean,
  "category": "краткий тип атаки или 'Легитимное'",
  "sender": { "name": string, "address": "email / @handle / телефон", "title": string },
  "recipient": string,
  "subject": string,
  "body": ["абзац", "... ссылку вставляй токеном {{link:ID}} отдельным абзацем"],
  "transcript": [{ "speaker": "caller" | "employee", "text": string }]  // только для call
  "links": [{ "id": string, "displayText": string, "shownUrl": string, "realUrl": string, "redirectChain": [string], "domain": string, "domainAge": "например 'Создан 3 дня назад'", "domainAgeDays": number, "registrar": string, "ssl": string, "verdict": "clean"|"suspicious"|"malicious", "notes": string }],
  "attachments": [{ "id": string, "name": string, "size": string, "type": string, "sha256": "64 hex", "verdict": "clean"|"suspicious"|"malicious", "behavior": [string] }],
  "headers": { "from": string, "replyTo": string, "returnPath": string, "spf": "PASS"|"FAIL"|"SOFTFAIL"|"NONE", "dkim": "PASS"|"FAIL"|"NONE", "dmarc": "PASS"|"FAIL"|"NONE", "ip": string, "received": string, "messageId": string }, // только для email
  "interrogation": [{ "question": string, "answer": string }] // ровно 3
  "claimsToBe": "id сотрудника из справочника или null",
  "redFlags": [{ "text": string, "source": "content"|"headers"|"sandbox"|"directory"|"rules"|"interrogation" }],
  "greenFlags": [string],
  "explanation": "1-2 предложения разбора"
}`;

const rnd = (n: number) => Math.floor(Math.random() * n);

/** Приводит ответ модели к безопасной структуре Scenario */
function normalize(raw: Record<string, unknown>, day: Day): Scenario {
  const r = raw as Partial<Scenario> & Record<string, unknown>;
  const channel = (['email', 'chat', 'call'] as const).includes(r.channel as never) ? (r.channel as Scenario['channel']) : 'email';
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
  const verdict = (v: unknown): SandboxLinkReport['verdict'] =>
    v === 'clean' || v === 'suspicious' || v === 'malicious' ? v : 'suspicious';

  const links = arr<Record<string, unknown>>(r.links).slice(0, 3).map((l, i) => {
    const realUrl = str(l.realUrl, str(l.shownUrl, 'https://example.com'));
    return {
      id: str(l.id, `l${i}`),
      displayText: str(l.displayText, realUrl),
      shownUrl: str(l.shownUrl, realUrl),
      realUrl,
      redirectChain: arr<string>(l.redirectChain).length ? arr<string>(l.redirectChain) : [realUrl],
      domain: str(l.domain, (() => { try { return new URL(realUrl).hostname; } catch { return realUrl; } })()),
      domainAge: str(l.domainAge, 'неизвестно'),
      domainAgeDays: typeof l.domainAgeDays === 'number' ? l.domainAgeDays : 365,
      registrar: str(l.registrar, '—'),
      ssl: str(l.ssl, '—'),
      verdict: verdict(l.verdict),
      notes: str(l.notes),
    };
  });
  const attachments = arr<Record<string, unknown>>(r.attachments).slice(0, 3).map((a, i) => ({
    id: str(a.id, `a${i}`),
    name: str(a.name, 'file.bin'),
    size: str(a.size, '—'),
    type: str(a.type, 'file'),
    sha256: str(a.sha256, Array.from({ length: 64 }, () => '0123456789abcdef'[rnd(16)]).join('')),
    verdict: verdict(a.verdict) as SandboxFileReport['verdict'],
    behavior: arr<string>(a.behavior),
  }));

  let body = arr<string>(r.body).filter((p) => typeof p === 'string');
  // гарантируем, что каждая ссылка где-то показана
  links.forEach((l) => {
    if (!body.some((p) => p.includes(`{{link:${l.id}}}`))) body = [...body, `{{link:${l.id}}}`];
  });

  const interrogation = arr<{ question: string; answer: string }>(r.interrogation)
    .filter((q) => q && typeof q.question === 'string')
    .slice(0, 3);
  while (interrogation.length < 3) interrogation.push({ question: 'Подтвердите, пожалуйста, ваш запрос.', answer: 'Да, всё верно, сделайте, пожалуйста.' });

  const isMalicious = Boolean(r.isMalicious);
  return {
    id: `ai-${Date.now()}-${rnd(1e6)}`,
    day,
    channel,
    isMalicious,
    category: str(r.category, isMalicious ? 'Атака (ИИ)' : 'Легитимное'),
    ttl: 170,
    arrivesAt: 0,
    severity: isMalicious ? 2 : 1,
    sender: {
      name: str(r.sender?.name, 'Неизвестный'),
      address: str(r.sender?.address, 'unknown'),
      title: str(r.sender?.title) || undefined,
    },
    recipient: str(r.recipient, 'вам'),
    subject: str(r.subject, channel === 'email' ? '(без темы)' : 'Сообщение'),
    body: body.length ? body : ['(пустое сообщение)'],
    transcript: channel === 'call' ? arr(r.transcript) : undefined,
    links,
    attachments,
    headers: channel === 'email' && r.headers && typeof r.headers === 'object' ? (r.headers as Scenario['headers']) : undefined,
    interrogation,
    claimsToBe: str(r.claimsToBe) || undefined,
    redFlags: arr<{ text: string; source: string }>(r.redFlags)
      .filter((f) => f && typeof f.text === 'string')
      .map((f) => ({
        text: f.text,
        source: (['content', 'headers', 'sandbox', 'directory', 'rules', 'interrogation'].includes(f.source) ? f.source : 'content') as Scenario['redFlags'][number]['source'],
      })),
    greenFlags: arr<string>(r.greenFlags),
    explanation: str(r.explanation, 'Сценарий сгенерирован ИИ.'),
    generated: true,
  };
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateScenario(settings: Settings, day: Day): Promise<Scenario> {
  const malicious = Math.random() < 0.62;
  const channel = (['email', 'chat', 'call'] as const)[rnd(3)];
  const rules = RULES.filter((r) => r.day <= day).map((r) => `- ${r.text}`).join('\n');
  const system =
    'Ты — геймдизайнер обучающего симулятора SOC-аналитика «ZERO TRUST: NIGHT SHIFT». ' +
    'Компания: ООО «НордТех», корпоративный домен nordtech.ru. Генерируй реалистичные, но вымышленные кейсы на русском языке. ' +
    'Не используй реальные вредоносные ссылки — только вымышленные домены. Отвечай строго JSON без пояснений.';
  const user = `Сгенерируй один кейс для смены ${day} (сложность ${day}/3).
Канал: ${channel}. Кейс ${malicious ? 'ВРЕДОНОСНЫЙ (атака социальной инженерии)' : 'ЛЕГИТИМНЫЙ, но выглядящий срочно/подозрительно'}.
Красные флаги должны быть обнаружимы через инструменты: заголовки, песочницу ссылок/файлов, справочник сотрудников, правила или допрос.

Справочник сотрудников:
${directoryForPrompt()}

Правила SOC:
${rules}

Формат JSON:
${SCENARIO_SCHEMA}`;
  const text = await callLLM(settings, system, user, true);
  return normalize(extractJson(text), day);
}

export async function askSender(
  settings: Settings,
  scenario: Scenario,
  question: string,
  history: { from: 'you' | 'them'; text: string }[],
): Promise<string> {
  const system = `Ты играешь роль отправителя сообщения в обучающем симуляторе кибербезопасности. Отвечай по-русски, коротко (1–3 предложения), в характере.
Ты: ${scenario.sender.name} (${scenario.sender.address}${scenario.sender.title ? ', ' + scenario.sender.title : ''}).
Твоё сообщение: «${scenario.subject}. ${scenario.body.join(' ').replace(/\{\{link:\w+\}\}/g, '[ссылка]')}».
${scenario.isMalicious
    ? 'Ты — злоумышленник. Не признавайся. Уходи от проверок, дави срочностью и авторитетом, отказывайся от перезвона по известному номеру, путайся в деталях, которых не знаешь.'
    : 'Ты — настоящий сотрудник/контрагент. Отвечай спокойно и конкретно, охотно предлагай способы проверки (перезвонить, номер заявки).'}`;
  const convo = history.map((m) => `${m.from === 'you' ? 'Аналитик' : 'Ты'}: ${m.text}`).join('\n');
  const text = await callLLM(settings, system, `${convo}\nАналитик: ${question}\nТы:`, false);
  return text.trim().replace(/^Ты:\s*/, '') || '…';
}

export async function testConnection(settings: Settings): Promise<string> {
  const t = await callLLM(settings, 'Отвечай одним словом.', 'Скажи «OK».', false);
  return t.trim();
}
