"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase ayarlı değilse sohbet ve anket özellikleri gizlenir */
export const supabaseConfigured = Boolean(url && key);
export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error("Supabase ayarlı değil");
  client ??= createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

/**
 * Kullanıcılar e-posta değil kullanıcı adıyla kaydolur. Supabase e-posta istediği için
 * kullanıcı adını bu sahte adrese çeviriyoruz (e-posta doğrulaması kapalı olmalı).
 */
export const USERNAME_DOMAIN = "kekoscore.vercel.app";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
