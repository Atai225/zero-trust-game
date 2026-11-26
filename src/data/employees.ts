import type { Employee } from '../types';

/** Корпоративный справочник ООО «НордТех» (домен nordtech.ru) */
export const EMPLOYEES: Employee[] = [
  { id: 'volkov', name: 'Андрей Волков', title: 'Генеральный директор (CEO)', department: 'Дирекция', email: 'a.volkov@nordtech.ru', phone: 'вн. 1000', messenger: '@a.volkov', status: 'office', statusText: 'В офисе' },
  { id: 'morozova', name: 'Анна Морозова', title: 'Ассистент генерального директора', department: 'Дирекция', email: 'a.morozova@nordtech.ru', phone: 'вн. 1002', messenger: '@a.morozova', status: 'office', statusText: 'В офисе' },
  { id: 'smirnova', name: 'Елена Смирнова', title: 'Главный бухгалтер', department: 'Финансы', email: 'e.smirnova@nordtech.ru', phone: 'вн. 1210', messenger: '@e.smirnova', status: 'office', statusText: 'В офисе' },
  { id: 'fedorova', name: 'Юлия Фёдорова', title: 'Бухгалтер по расчётам', department: 'Финансы', email: 'y.fedorova@nordtech.ru', phone: 'вн. 1214', messenger: '@y.fedorova', status: 'office', statusText: 'В офисе' },
  { id: 'petrov', name: 'Игорь Петров', title: 'Руководитель IT-поддержки', department: 'IT', email: 'i.petrov@nordtech.ru', phone: 'вн. 1001', messenger: '@i.petrov', status: 'office', statusText: 'В офисе' },
  { id: 'orlov', name: 'Дмитрий Орлов', title: 'DevOps-инженер', department: 'IT', email: 'd.orlov@nordtech.ru', phone: 'вн. 1105', messenger: '@d.orlov', status: 'remote', statusText: 'Удалённо' },
  { id: 'lebedev', name: 'Сергей Лебедев', title: 'Специалист IT-поддержки', department: 'IT', email: 's.lebedev@nordtech.ru', phone: '—', messenger: '@s.lebedev', status: 'fired', statusText: 'Уволен 01.10 — учётные записи подлежат блокировке' },
  { id: 'kuznetsova', name: 'Мария Кузнецова', title: 'HR-директор', department: 'HR', email: 'm.kuznetsova@nordtech.ru', phone: 'вн. 1300', messenger: '@m.kuznetsova', status: 'vacation', statusText: 'В отпуске до 15-го' },
  { id: 'egorova', name: 'Наталья Егорова', title: 'Ведущий юрист', department: 'Юридический отдел', email: 'n.egorova@nordtech.ru', phone: 'вн. 1410', messenger: '@n.egorova', status: 'sick', statusText: 'На больничном, почту не читает' },
  { id: 'sokolov', name: 'Павел Соколов', title: 'Офис-менеджер', department: 'АХО', email: 'p.sokolov@nordtech.ru', phone: 'вн. 1500', messenger: '@p.sokolov', status: 'office', statusText: 'В офисе' },
  { id: 'belova', name: 'Ольга Белова', title: 'Менеджер по закупкам', department: 'Закупки', email: 'o.belova@nordtech.ru', phone: 'вн. 1520', messenger: '@o.belova', status: 'office', statusText: 'В офисе' },
  { id: 'zaitsev', name: 'Кирилл Зайцев', title: 'Менеджер по продажам', department: 'Продажи', email: 'k.zaitsev@nordtech.ru', phone: 'вн. 1610', messenger: '@k.zaitsev', status: 'trip', statusText: 'В командировке (Казань) до пятницы' },
  { id: 'kovalev', name: 'Виктор Ковалёв', title: 'Директор по ИБ (CISO)', department: 'Безопасность', email: 'v.kovalev@nordtech.ru', phone: 'вн. 1900', messenger: '@v.kovalev', status: 'office', statusText: 'В офисе' },
  { id: 'novikov', name: 'Артём Новиков', title: 'Аналитик SOC L2', department: 'Безопасность', email: 'a.novikov@nordtech.ru', phone: 'вн. 1911', messenger: '@a.novikov', status: 'shift', statusText: 'На ночной смене (L2)' },
];

export const STATUS_COLOR: Record<Employee['status'], string> = {
  office: 'text-safe border-safe/40 bg-safe/10',
  remote: 'text-sys border-sys/40 bg-sys/10',
  shift: 'text-sys border-sys/40 bg-sys/10',
  trip: 'text-amber-neon border-amber-neon/40 bg-amber-neon/10',
  vacation: 'text-amber-neon border-amber-neon/40 bg-amber-neon/10',
  sick: 'text-amber-neon border-amber-neon/40 bg-amber-neon/10',
  fired: 'text-threat border-threat/40 bg-threat/10',
};

export const STATUS_SHORT: Record<Employee['status'], string> = {
  office: 'В офисе',
  remote: 'Удалённо',
  shift: 'На смене',
  trip: 'Командировка',
  vacation: 'Отпуск',
  sick: 'Больничный',
  fired: 'Уволен',
};
