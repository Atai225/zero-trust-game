export type Channel = 'email' | 'chat' | 'call';
export type Decision = 'approve' | 'block' | 'escalate' | 'expired';
export type Day = 1 | 2 | 3;

/** Где игрок мог заметить красный флаг — нужно для разбора полётов */
export type FlagSource = 'content' | 'headers' | 'sandbox' | 'directory' | 'rules' | 'interrogation';

export interface RedFlag {
  text: string;
  source: FlagSource;
}

export interface SandboxLinkReport {
  displayText: string;
  /** Что видит пользователь при наведении (может отличаться от реального) */
  shownUrl: string;
  realUrl: string;
  redirectChain: string[];
  domain: string;
  domainAge: string;
  domainAgeDays: number;
  registrar: string;
  ssl: string;
  verdict: 'clean' | 'suspicious' | 'malicious';
  notes: string;
}

export interface SandboxFileReport {
  name: string;
  size: string;
  type: string;
  sha256: string;
  verdict: 'clean' | 'suspicious' | 'malicious';
  behavior: string[];
}

export interface RawHeaders {
  from: string;
  replyTo: string;
  returnPath: string;
  spf: 'PASS' | 'FAIL' | 'SOFTFAIL' | 'NONE';
  dkim: 'PASS' | 'FAIL' | 'NONE';
  dmarc: 'PASS' | 'FAIL' | 'NONE';
  ip: string;
  received: string;
  messageId: string;
}

export interface InterrogationOption {
  question: string;
  answer: string;
}

export interface TranscriptLine {
  speaker: 'caller' | 'employee';
  text: string;
}

export interface Scenario {
  id: string;
  day: Day;
  channel: Channel;
  isMalicious: boolean;
  /** Тип: «Фишинг», «BEC-атака», «Легитимное» и т.д. */
  category: string;
  /** Секунд на решение после поступления тикета */
  ttl: number;
  /** Через сколько секунд от начала смены приходит тикет */
  arrivesAt: number;
  severity: number; // 1..3 — насколько больно пропустить атаку
  sender: {
    name: string;
    address: string; // email, @handle или номер телефона
    title?: string;
  };
  recipient: string;
  subject: string;
  /** Абзацы. Ссылка вставляется токеном {{link:id}} */
  body: string[];
  transcript?: TranscriptLine[];
  links: (SandboxLinkReport & { id: string })[];
  attachments: (SandboxFileReport & { id: string })[];
  headers?: RawHeaders;
  interrogation: InterrogationOption[];
  /** id сотрудника, за которого выдаёт себя отправитель (для подсказок в разборе) */
  claimsToBe?: string;
  redFlags: RedFlag[];
  greenFlags: string[];
  explanation: string;
  generated?: boolean;
}

export type EmployeeStatus = 'office' | 'remote' | 'vacation' | 'sick' | 'fired' | 'trip' | 'shift';

export interface Employee {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  messenger: string;
  status: EmployeeStatus;
  statusText: string;
}

export interface TicketState {
  scenario: Scenario;
  arrivedAt: number; // секунда смены
  remaining: number;
  read: boolean;
  viewedHeaders: boolean;
  sandboxed: Set<string>;
  directoryViewed: Set<string>;
  rulesViewed: boolean;
  asked: string[];
  chat: { from: 'you' | 'them'; text: string }[];
}

export interface ResolvedCase {
  scenario: Scenario;
  decision: Decision;
  correct: boolean;
  scoreDelta: number;
  timeSpent: number;
  usedTools: Set<FlagSource>;
}

export interface Settings {
  sound: boolean;
  crt: boolean;
  provider: 'openai' | 'gemini';
  apiKey: string;
  /** Необязательно: своя модель (по умолчанию gpt-4o-mini / gemini-2.5-flash) */
  model: string;
}

export interface ToastMsg {
  id: number;
  kind: 'success' | 'error' | 'info' | 'warn';
  title: string;
  text?: string;
}
