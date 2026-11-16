import { useState, type FormEvent } from "react";
import { Check, Copy, LogOut, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { ADMIN_CREATE_MESSAGES, adminCreateUser } from "../../lib/admin";
import { signOut } from "../../lib/auth";
import { gmailError } from "../../lib/email";
import { buttonVariants, inputClass } from "../ui/button";
import { cardClass, EmptyState, SectionHeader } from "../ui/Section";
import { Field } from "../ui/Field";

interface CreatedUser {
  email: string;
  pbName: string;
  password: string;
}

interface AdminPanelProps {
  email: string | null;
}

/** Readable temporary password: two short words + digits, no ambiguous chars. */
function randomPassword() {
  const words = ["mabar", "smash", "kok", "servis", "net", "rally", "drive", "lob"];
  const w = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${w()}-${w()}-${n}`;
}

export function AdminPanel({ email }: AdminPanelProps) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pbName, setPbName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedUser[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const canSubmit =
    newEmail.trim() !== "" && password.length >= 6 && pbName.trim().length >= 2 && !isSubmitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldError = gmailError(newEmail);
    setEmailError(fieldError);
    setFormError(null);
    if (fieldError) return;
    if (password.length < 6) {
      setFormError("Password minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminCreateUser(newEmail, password, pbName);
      if (result !== "ok") {
        setFormError(ADMIN_CREATE_MESSAGES[result] ?? "Gagal membuat user. Coba lagi.");
        return;
      }
      setCreated((list) => [
        { email: newEmail.trim().toLowerCase(), pbName: pbName.trim(), password },
        ...list,
      ]);
      setNewEmail("");
      setPassword("");
      setPbName("");
    } catch (err) {
      setFormError(
        err instanceof TypeError
          ? "Tidak bisa terhubung. Periksa koneksi internet."
          : "Gagal membuat user. Coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = async (user: CreatedUser, index: number) => {
    const text = `PONDE CLICK\nPB: ${user.pbName}\nEmail: ${user.email}\nPassword: ${user.password}\nMasuk di aplikasi lalu ganti password lewat admin bila perlu.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 2000);
    } catch {
      setFormError("Tidak bisa menyalin otomatis. Salin manual dari daftar di bawah.");
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="surface-ink sticky top-0 z-10 text-white shadow-pop">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <span className="surface-brand flex size-9 shrink-0 items-center justify-center rounded-full text-foreground shadow-brand">
            <ShieldCheck size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight">Panel Admin</h1>
            <p className="truncate text-xs text-white/65">{email ?? "Platform admin"}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex size-10 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
            aria-label="Keluar"
          >
            <LogOut size={20} aria-hidden />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 p-4">
        <form onSubmit={handleSubmit} className={`${cardClass} space-y-4 p-4`} noValidate>
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-foreground" aria-hidden />
            <h2 className="font-semibold">Tambah user baru</h2>
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Field label="Email (Gmail)" error={emailError ?? undefined}>
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={emailError ? true : undefined}
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => newEmail && setEmailError(gmailError(newEmail))}
                placeholder="nama@gmail.com"
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Password sementara" hint="Minimal 6 karakter. Kirim ke user yang bersangkutan.">
            {({ id, describedBy }) => (
              <div className="flex gap-2">
                <input
                  id={id}
                  aria-describedby={describedBy}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="minimal 6 karakter"
                  className={`${inputClass} tabular`}
                />
                <button
                  type="button"
                  onClick={() => setPassword(randomPassword())}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                  aria-label="Buat password acak"
                >
                  <RefreshCw size={18} aria-hidden />
                </button>
              </div>
            )}
          </Field>

          <Field label="Nama PB" hint="PB baru dibuat otomatis. Jika nama sudah ada, user ditambahkan ke PB itu.">
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                type="text"
                value={pbName}
                onChange={(e) => setPbName(e.target.value)}
                maxLength={60}
                placeholder="Contoh: PB Smash Senayan"
                className={inputClass}
              />
            )}
          </Field>

          <button
            type="submit"
            disabled={!canSubmit}
            className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}
          >
            {isSubmitting ? "Membuat…" : "Buat user"}
          </button>
        </form>

        <section aria-labelledby="created-title">
          <SectionHeader
            id="created-title"
            title="Dibuat sesi ini"
            meta={created.length > 0 ? created.length : undefined}
          />
          {created.length === 0 ? (
            <EmptyState
              title="Belum ada user dibuat"
              description="User yang kamu buat akan muncul di sini, lengkap dengan kredensialnya untuk dikirim."
            />
          ) : (
            <ul className={`${cardClass} divide-y divide-border`}>
              {created.map((user, index) => (
                <li key={`${user.email}-${index}`} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.pbName} · sandi: <span className="tabular">{user.password}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCredentials(user, index)}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check size={16} aria-hidden /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={16} aria-hidden /> Salin
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            Catatan sandi hanya tampil selama sesi ini terbuka. Salin dan kirim ke user sekarang.
          </p>
        </section>
      </main>
    </div>
  );
}
