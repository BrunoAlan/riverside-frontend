export type TesterIdentity = { name: string; email: string };

const STORAGE_KEY = 'riverside.tester-identity';

export function readIdentity(): TesterIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // Silently ignore — private mode or storage quota exceeded.
  }
}
