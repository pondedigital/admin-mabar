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
    <div className="relative min-h-dvh bg-foreground text-white">
      <LoginBackdrop />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-10">
        <Hero />
        <div className="relative">
          {/* Animated gradient halo behind the card. */}
          <div
            aria-hidden
            className="login-ring absolute -inset-px rounded-[1.6rem] opacity-70 blur-[3px]"
          />
          <div
            className="animate-rise-delayed relative rounded-[1.5rem] border border-white/12 bg-background/95 p-5 text-foreground shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
            style={{ animationDelay: "160ms" }}
          >
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
          </div>
        </div>
        <p className="text-center text-xs text-white/35">PONDE CLICK · sistem mabar badminton</p>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="animate-rise-delayed text-center" style={{ animationDelay: "40ms" }}>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/75 backdrop-blur">
        <span className="size-1.5 rounded-full bg-accent2 shadow-[0_0_10px_var(--color-accent2)]" />
        Sistem mabar digital
      </span>
      <h1 className="mt-4 text-4xl font-black tracking-tight">
        PONDE <span className="text-brand">CLICK</span>
      </h1>
      <p className="mx-auto mt-2 max-w-72 text-sm text-white/60">
        Atur pemain, lapangan, skor, dan kas mabar dari satu tempat.
      </p>
    </div>
  );
}

/** Animated, on-brand backdrop: glowing court grid, drifting auroras, a shuttle arc. */
function LoginBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Warm top glow + cool floor. */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_80%_at_50%_-10%,rgba(255,207,51,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(100%_60%_at_50%_120%,rgba(15,122,110,0.18),transparent_60%)]" />

      {/* Court / tech grid. */}
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="login-grid-glow absolute inset-0 h-full w-full text-brand"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.6}
        opacity={0.4}
      >
        <rect x="40" y="20" width="320" height="260" />
        <line x1="200" y1="20" x2="200" y2="280" />
        <line x1="40" y1="78" x2="360" y2="78" />
        <line x1="40" y1="222" x2="360" y2="222" />
        <line x1="112" y1="78" x2="112" y2="222" />
        <line x1="288" y1="78" x2="288" y2="222" />
        <line x1="40" y1="150" x2="112" y2="150" />
        <line x1="288" y1="150" x2="360" y2="150" />
        <g className="text-white" strokeWidth={0.3} opacity={0.5}>
          <line x1="0" y1="110" x2="400" y2="110" />
          <line x1="0" y1="190" x2="400" y2="190" />
        </g>
      </svg>

      {/* Drifting brand glows. */}
      <div className="login-aurora login-aurora-a left-[-12%] top-[6%] size-72 bg-brand/25" />
      <div className="login-aurora login-aurora-b right-[-16%] top-[28%] size-80 bg-accent2/25" />

      {/* Shuttlecock arcing across the top. */}
      <div className="login-shuttle absolute left-0 top-0">
        <div className="login-float">
          <ShuttleGlyph />
        </div>
      </div>
    </div>
  );
}

function ShuttleGlyph() {
  return (
    <span className="relative block">
      <span className="absolute -inset-2 rounded-full bg-brand/40 blur-md" />
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-brand"
      >
        <path d="M8 3l2 11M16 3l-2 11M12 3v11M6 4l3 10h6l3-10" />
        <path d="M9 14h6v2a3 3 0 0 1-6 0z" />
      </svg>
    </span>
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
          { value: "pengurus", label: "Host", icon: Users },
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
