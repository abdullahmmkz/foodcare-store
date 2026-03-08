const LOCAL_TOKEN_KEY = "fc_token";

export function getLocalToken(): string | null {
  try {
    return localStorage.getItem(LOCAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setLocalToken(token: string): void {
  try {
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
  } catch { /* ignore */ }
}

export function clearLocalToken(): void {
  try {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
  } catch { /* ignore */ }
}
