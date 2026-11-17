import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const authProviders = {
  google: Boolean(supabase),
  github: Boolean(supabase),
};

export type AiAction = {
  type: "add_task" | "delete_task" | "complete_task" | "create_subject";
  taskId?: number;
  title?: string;
  category?: "Academic" | "Coding" | "Personal";
  due?: string;
  priority?: "High" | "Medium" | "Low";
  reason?: string;
  subjectName?: string;
  code?: string;
  topics?: string[];
};

export async function signInWithOAuth(provider: "google" | "github") {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function saveUserData(userId: string, tasks: unknown[], habits: unknown[], extras: { focusSessions?: unknown[]; activityDates?: string[]; activeTimeByDate?: Record<string, number>; streakCoins?: number; streakFreezes?: number } = {}) {
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
    .select("tasks, habits, focus_sessions, activity_dates, active_time_by_date, streak_coins, streak_freezes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requestAiCoach(feature: "coach" | "challenge" | "review" | "explainer", prompt: string, context: unknown = {}) {
  if (!supabase) throw new Error("AI Coach requires Supabase configuration.");
  const { data, error } = await supabase.functions.invoke("ai-coach", { body: { feature, prompt, context } });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const details = await error.context.clone().json() as { error?: string };
        if (details.error) message = details.error;
      } catch {
        // Keep the SDK error when the function response is not JSON.
      }
    }
    throw new Error(message.includes("404") || message.toLowerCase().includes("not found")
      ? "AI Coach is not deployed yet. Deploy the supabase/functions/ai-coach Edge Function, then try again."
      : message);
  }
  if (!data?.content) throw new Error("AI Coach returned an empty response.");
  return { content: data.content as string, actions: (data.actions ?? []) as AiAction[] };
}
