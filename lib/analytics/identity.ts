export type TesterIdentity = { name: string; email: string };

const STORAGE_KEY = 'riverside.tester-identity';

export function readIdentity(): TesterIdentity | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as TesterIdentity).name === 'string' &&
      typeof (parsed as TesterIdentity).email === 'string'
    ) {
      return { name: (parsed as TesterIdentity).name, email: (parsed as TesterIdentity).email };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeIdentity(identity: TesterIdentity): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}
