export interface SavedAccount {
  id: string
  username: string
  displayName: string
  email?: string | null
  role: 'admin' | 'kol'
  sessionToken: string
  lastUsedAt: string
}

const STORAGE_KEY = 'publishfast_saved_accounts'

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime(),
      )
    }
    return []
  } catch {
    return []
  }
}

export function saveAccount(account: Omit<SavedAccount, 'lastUsedAt'>) {
  try {
    const existing = getSavedAccounts().filter((a) => a.id !== account.id)
    const updated: SavedAccount[] = [
      {
        ...account,
        lastUsedAt: new Date().toISOString(),
      },
      ...existing,
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to save account to localStorage:', err)
  }
}

export function removeSavedAccount(id: string) {
  try {
    const existing = getSavedAccounts().filter((a) => a.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // ignore
  }
}

export function updateSavedAccountToken(id: string, newToken: string) {
  try {
    const existing = getSavedAccounts()
    const found = existing.find((a) => a.id === id)
    if (found) {
      found.sessionToken = newToken
      found.lastUsedAt = new Date().toISOString()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
    }
  } catch {
    // ignore
  }
}
