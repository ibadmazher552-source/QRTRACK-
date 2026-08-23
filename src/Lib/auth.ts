import { supabase } from './supabase'

type Session = { email: string; workspaceId: string }

const toSession = (user: { id: string; email?: string | null } | null): Session | null =>
  user ? { email: user.email || '', workspaceId: user.id } : null

export const authService = {
  session(): Session | null {
    return null
  },
  async restore(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession()
    return toSession(data.session?.user || null)
  },
  async create(email: string, password: string, _remember: boolean) {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Account could not be created.')
    if (!data.session) throw new Error('Account created. Please check your email to confirm your account, then sign in.')
    return toSession(data.user)!
  },
  async signIn(email: string, password: string, _remember: boolean) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) throw new Error(error.message)
    return toSession(data.user)!
  },
  remember(_session: Session, _remember: boolean) {},
  signOut() { void supabase.auth.signOut() },
  onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => callback(toSession(session?.user || null)))
  },
}
