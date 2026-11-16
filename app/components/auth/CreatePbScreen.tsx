import { useState, type FormEvent } from "react";
import { createMyPb, createPbErrorMessage } from "../../lib/services/pbs";
import { buttonVariants, inputClass } from "../ui/button";
import { Field } from "../ui/Field";

interface CreatePbScreenProps {
  email: string | null;
  onCreated: (pbId: number) => void;
  onSignOut: () => void;
}

/** First-run step for an account that is not admin of any PB yet. */
export function CreatePbScreen({ email, onCreated, onSignOut }: CreatePbScreenProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = name.trim();
  const isValid = trimmed.length >= 2 && trimmed.length <= 60;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      onCreated(await createMyPb(trimmed));
    } catch (err) {
      setError(createPbErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-foreground">
      <div className="mx-auto w-full max-w-md px-6 pb-10 pt-12 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Langkah terakhir</p>
        <p className="mt-2 text-2xl font-bold">Buat PB kamu</p>
        <p className="mt-2 text-sm text-white/70">
          Pemain, sesi mabar, dan kas disimpan per PB. Kamu otomatis jadi admin PB ini.
        </p>
      </div>
      <main className="mx-auto -mt-4 w-full max-w-md flex-1 rounded-t-3xl bg-background px-5 pb-10 pt-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
          <Field label="Nama PB" hint="Muncul di header, resume tagihan, dan laporan keuangan.">
            {({ id, describedBy }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoFocus
                placeholder="Contoh: PB Smash Senayan"
                className={inputClass}
              />
            )}
          </Field>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}
          >
            {isSubmitting ? "Membuat PB…" : "Buat PB"}
          </button>
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            {email ? <>Masuk sebagai {email}. </> : null}
            Seharusnya masuk ke PB yang sudah ada? Hubungi admin PONDE, lalu{" "}
            <button type="button" onClick={onSignOut} className="font-semibold text-foreground underline">
              keluar
            </button>{" "}
            dan masuk lagi.
          </p>
        </form>
      </main>
    </div>
  );
}
