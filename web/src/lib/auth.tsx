import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type User } from './api'
import { saveAccount, updateSavedAccountToken } from './savedAccounts'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  switchUser: (sessionToken: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: { displayName?: string; email?: string | null; bioLink?: string | null }) => Promise<User>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const { user, sessionToken } = await api.login(identifier, password)
    setUser(user)
    if (sessionToken) {
      saveAccount({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        sessionToken,
      })
    }
  }, [])

  const switchUser = useCallback(async (sessionToken: string) => {
    const { user, sessionToken: freshToken } = await api.switchAccount(sessionToken)
    setUser(user)
    if (freshToken) {
      updateSavedAccountToken(user.id, freshToken)
    }
  }, [])

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const updateProfile = useCallback(
    async (data: { displayName?: string; email?: string | null; bioLink?: string | null }) => {
      const res = await api.updateProfile(data)
      setUser(res.user)
      return res.user
    },
    [],
  )

  const value = useMemo(
    () => ({ user, loading, signIn, switchUser, signOut, updateProfile }),
    [user, loading, signIn, switchUser, signOut, updateProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
