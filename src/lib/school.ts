export const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
export type Term = (typeof TERMS)[number];

export const EVALUATION_TYPES = ["quiz", "test", "exam", "assignment", "project"] as const;
export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;
export const DISCIPLINE_TYPES = ["fault", "punishment"] as const;
export const DISCIPLINE_SEVERITIES = ["low", "medium", "high"] as const;
export const DISCIPLINE_STATUSES = ["open", "resolved"] as const;
export const PAYMENT_METHODS = ["cash", "bank transfer", "mobile money", "cheque"] as const;
export const EXPENSE_CATEGORIES = [
  "salaries",
  "utilities",
  "maintenance",
  "supplies",
  "transport",
  "general",
] as const;
export const STOCK_CATEGORIES = ["stationery", "cleaning", "furniture", "lab", "sports", "other"] as const;

export const today = () => new Date().toISOString().slice(0, 10);

export function money(value: number | null | undefined) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export function receiptNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `RCP-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function countBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "unspecified";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function sumBy<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "unspecified";
    map.set(k, (map.get(k) ?? 0) + amount(row));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}
