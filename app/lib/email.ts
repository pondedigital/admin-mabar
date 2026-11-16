/** Lower-cased, trimmed form used for every comparison and for Supabase Auth. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

// googlemail.com is Google's alias domain for the same Gmail inboxes.
const GMAIL_PATTERN = /^[a-z0-9](?:[a-z0-9.+_-]*[a-z0-9])?@(?:gmail|googlemail)\.com$/;

/** Accounts sign in with a Google mail address only (see docs/auth-gmail.md). */
export const isGmail = (value: string) => GMAIL_PATTERN.test(normalizeEmail(value));

/** Message for the email field, or null when the value is acceptable. */
export function gmailError(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return "Isi alamat Gmail kamu.";
  if (!email.includes("@")) return "Masukkan alamat Gmail lengkap, contoh nama@gmail.com.";
  if (!isGmail(email)) return "Gunakan alamat Gmail (berakhiran @gmail.com).";
  return null;
}
