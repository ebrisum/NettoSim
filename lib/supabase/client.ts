"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const notConfiguredError = { message: "Supabase is not configured." };

const stubAuth = {
  getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  signOut: () => Promise.resolve({ error: null }),
  signInWithPassword: () =>
    Promise.resolve({
      data: { user: null, session: null },
      error: notConfiguredError,
    }),
  signUp: () =>
    Promise.resolve({
      data: { user: null, session: null },
      error: notConfiguredError,
    }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
};

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : ({ auth: stubAuth } as unknown as ReturnType<typeof createClient>);
