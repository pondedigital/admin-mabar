import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Users } from "lucide-react";
import {
  CLAIM_MESSAGES,
  claimLegacyAccount,
  signIn,
  signInErrorMessage,
} from "../../lib/auth";
import { gmailError, normalizeEmail } from "../../lib/email";
import { ADMIN_REJECTED_KEY, LOGIN_MODE_KEY } from "../MabarApp";
import { buttonVariants, inputClass } from "../ui/button";
import { Field } from "../ui/Field";
import { Segmented } from "../ui/Segmented";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type View = "login" | "claim";
export type LoginMode = "pengurus" | "admin";

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("pengurus");

  return (
    <div className="flex min-h-dvh flex-col bg-foreground">
      <BrandPanel />
      <main className="mx-auto -mt-4 w-full max-w-md flex-1 rounded-t-3xl bg-background px-5 pb-10 pt-7">
        {view === "login" ? (
          <LoginForm
            email={email}
            setEmail={setEmail}
            notice={notice}
            mode={mode}
            setMode={setMode}
            onSuccess={onLoginSuccess}
            onClaim={() => {
              setNotice(null);
              setView("claim");
            }}
          />
        ) : (
          <ClaimForm
            onBack={() => setView("login")}
            onClaimed={(claimedEmail) => {
              setEmail(claimedEmail);
              setNotice(
                `Akun sudah dipindah ke ${claimedEmail}. Mulai sekarang masuk pakai Gmail ini dan password yang sama.`
              );
              setView("login");
            }}
            onSuccess={onLoginSuccess}
          />
        )}
      </main>
    </div>
  );
}

/** Court lines: the product's own subject, drawn in the brand yellow. */
function BrandPanel() {
  return (
    <div className="relative overflow-hidden px-6 pb-10 pt-12 text-white">
      <svg
        aria-hidden
        viewBox="0 0 200 120"
        className="pointer-events-none absolute -right-10 top-4 h-44 text-brand/25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="2" y="2" width="196" height="116" />
        <line x1="100" y1="2" x2="100" y2="118" />
        <line x1="2" y1="11" x2="198" y2="11" />
        <line x1="2" y1="109" x2="198" y2="109" />
        <line x1="76" y1="11" x2="76" y2="109" />
        <line x1="124" y1="11" x2="124" y2="109" />
        <line x1="14" y1="11" x2="14" y2="109" />
        <line x1="186" y1="11" x2="186" y2="109" />
        <line x1="14" y1="60" x2="76" y2="60" />
        <line x1="124" y1="60" x2="186" y2="60" />
      </svg>
      <div className="relative mx-auto max-w-md">
        <p className="text-3xl font-black tracking-tight text-brand">PONDE CLICK</p>
        <p className="mt-2 max-w-60 text-sm text-white/70">
          Atur pemain, lapangan, skor, dan kas mabar dari satu tempat.
        </p>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  describedBy,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  describedBy?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        aria-describedby={describedBy}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}

function FormAlert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive"
          : "rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success"
      }
    >
      {children}
    </p>
  );
}

function LoginForm({
  email,
  setEmail,
  notice,
  mode,
  setMode,
  onSuccess,
  onClaim,
}: {
  email: string;
  setEmail: (value: string) => void;
  notice: string | null;
  mode: LoginMode;
  setMode: (mode: LoginMode) => void;
  onSuccess: () => void;
  onClaim: () => void;
}) {
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = mode === "admin";

  // Returning here after the router rejected a non-admin admin login.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ADMIN_REJECTED_KEY)) {
        sessionStorage.removeItem(ADMIN_REJECTED_KEY);
        setMode("admin");
        setFormError("Akun ini tidak punya akses admin.");
      }
    } catch {
      /* ignore storage errors */
    }
  }, [setMode]);

  // Someone typing an old username (no "@") gets pointed to the claim flow.
  const looksLikeUsername = email.trim().length > 0 && !email.includes("@");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldError = gmailError(email);
    setEmailError(fieldError);
    setFormError(null);
    if (fieldError) return;

    try {
      // Hand the chosen mode to the router so it can gate a non-admin who
      // picked "Admin" (see MabarApp).
      sessionStorage.setItem(LOGIN_MODE_KEY, mode);
    } catch {
      /* ignore storage errors */
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      onSuccess();
    } catch (err) {
      setFormError(signInErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Segmented
        label="Masuk sebagai"
        value={mode}
        onChange={(next) => {
          setMode(next);
          setFormError(null);
        }}
        options={[
          { value: "pengurus", label: "Pengurus PB", icon: Users },
          { value: "admin", label: "Admin", icon: ShieldCheck },
        ]}
      />
      <h1 className="text-xl font-bold">{isAdmin ? "Masuk sebagai Admin" : "Masuk"}</h1>
      {isAdmin && (
        <p className="-mt-3 text-sm text-muted-foreground">
          Khusus admin platform PONDE untuk menambah user.
        </p>
      )}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <Field
        label="Gmail"
        error={emailError ?? undefined}
        hint={
          !isAdmin && looksLikeUsername ? (
            <>
              Masih pakai username lama?{" "}
              <button type="button" onClick={onClaim} className="font-semibold text-foreground underline">
                Pindahkan ke Gmail dulu
              </button>
            </>
          ) : undefined
        }
      >
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={emailError ? true : undefined}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => email && setEmailError(gmailError(email))}
            placeholder="nama@gmail.com"
            className={inputClass}
          />
        )}
      </Field>

      <Field label="Password">
        {({ id, describedBy }) => (
          <PasswordInput
            id={id}
            describedBy={describedBy}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        )}
      </Field>

      <button
        type="submit"
        disabled={isSubmitting || !email || !password}
        className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}
      >
        {isSubmitting ? "Memeriksa…" : isAdmin ? "Masuk sebagai Admin" : "Masuk"}
      </button>

      {!isAdmin && (
        <div className="space-y-3 border-t border-border pt-5 text-sm">
          <p>
            <span className="text-muted-foreground">Punya akun lama dengan username? </span>
            <button type="button" onClick={onClaim} className="font-semibold underline">
              Pindahkan ke Gmail
            </button>
          </p>
          <p className="text-muted-foreground">
            Belum punya akun? Akun dibuat oleh admin PONDE. Lupa password juga hubungi admin.
          </p>
        </div>
      )}
    </form>
  );
}

function ClaimForm({
  onBack,
  onClaimed,
  onSuccess,
}: {
  onBack: () => void;
  onClaimed: (email: string) => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldError = gmailError(email);
    setEmailError(fieldError);
    setFormError(null);
    if (fieldError) return;

    setIsSubmitting(true);
    try {
      const result = await claimLegacyAccount(username, password, email);
      if (result !== "ok") {
        setFormError(CLAIM_MESSAGES[result] ?? "Gagal memindahkan akun. Coba lagi.");
        return;
      }
      const claimedEmail = normalizeEmail(email);
      try {
        await signIn(claimedEmail, password);
        onSuccess();
      } catch {
        // Claim worked but auto sign-in did not: send them to the login form.
        onClaimed(claimedEmail);
      }
    } catch (err) {
      setFormError(
        err instanceof TypeError
          ? "Tidak bisa terhubung. Periksa koneksi internet kamu."
          : "Gagal memindahkan akun. Coba lagi, atau hubungi admin PONDE."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-3" })}
      >
        <ArrowLeft size={16} aria-hidden /> Kembali
      </button>
      <div>
        <h1 className="text-xl font-bold">Pindahkan akun lama ke Gmail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cukup sekali. PB, pemain, dan riwayat mabar kamu tetap sama. Setelah ini kamu masuk pakai
          Gmail, bukan username.
        </p>
      </div>
      {formError && <FormAlert tone="error">{formError}</FormAlert>}

      <Field label="Username lama">
        {({ id }) => (
          <input
            id={id}
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Password lama" hint="Password ini tetap dipakai setelah pindah ke Gmail.">
        {({ id, describedBy }) => (
          <PasswordInput
            id={id}
            describedBy={describedBy}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        )}
      </Field>
      <Field label="Gmail kamu" error={emailError ?? undefined}>
        {({ id, describedBy }) => (
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={emailError ? true : undefined}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => email && setEmailError(gmailError(email))}
            placeholder="nama@gmail.com"
            className={inputClass}
          />
        )}
      </Field>

      <button
        type="submit"
        disabled={isSubmitting || !username || !password || !email}
        className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}
      >
        {isSubmitting ? "Memindahkan…" : "Pindahkan ke Gmail"}
      </button>
    </form>
  );
}
