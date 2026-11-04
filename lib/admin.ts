/**
 * Yönetici kullanıcı adları: duyuru bildirimi gönderebilirler.
 * Vercel'de ADMIN_USERNAMES="kerem,ali" ile değiştirilebilir; yoksa yalnızca "kerem".
 */
export const ADMINS = (process.env.ADMIN_USERNAMES ?? process.env.NEXT_PUBLIC_ADMIN_USERNAMES ?? "kerem")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isAdmin = (username?: string | null) => !!username && ADMINS.includes(username.toLowerCase());
