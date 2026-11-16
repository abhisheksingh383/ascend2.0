import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function envFlag(value: unknown) {
  return value === true || value === "true" || value === "1";
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const authProviders = {
  google: envFlag(import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED),
  github: envFlag(import.meta.env.VITE_SUPABASE_GITHUB_ENABLED),
};

export async function signInWithOAuth(provider: "google" | "github") {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  if (!authProviders[provider]) {
    throw new Error(`${provider} sign-in is not enabled. Configure the provider in Supabase and set its Vite flag.`);
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function saveUserData(userId: string, tasks: unknown[], habits: unknown[], extras: { focusSessions?: unknown[]; activityDates?: string[]; streakCoins?: number; streakFreezes?: number } = {}) {
  if (!supabase) return;
  const { error } = await supabase.from("user_workspaces").upsert({
    user_id: userId,
    tasks,
    habits,
    ...extras,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadUserData(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_workspaces")
    .select("tasks, habits, focus_sessions, activity_dates, streak_coins, streak_freezes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
