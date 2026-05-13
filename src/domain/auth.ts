import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";

export interface AuthState {
  configured: boolean;
  session: Session | null;
  user: User | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!isSupabaseConfigured()) {
    client = null;
    return client;
  }
  client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

export async function getAuthState(): Promise<AuthState> {
  const supabase = getSupabaseClient();
  if (!supabase) return { configured: false, session: null, user: null };
  const { data } = await supabase.auth.getSession();
  return {
    configured: true,
    session: data.session,
    user: data.session?.user ?? null
  };
}

export function onAuthChange(callback: (state: AuthState) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({ configured: true, session, user: session?.user ?? null });
  });
  return () => data.subscription.unsubscribe();
}

export async function signIn(credentials: AuthCredentials): Promise<AuthState> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw error;
  return { configured: true, session: data.session, user: data.user };
}

export async function signUp(credentials: AuthCredentials): Promise<AuthState> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) throw error;
  return { configured: true, session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

