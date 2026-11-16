import { useMabar } from "../../context/MabarContext";
import { formatNumberInput, parseNumberInput } from "../../lib/format";
import { inputClass } from "../ui/button";
import { Field } from "../ui/Field";
import { Overlay } from "../ui/Overlay";
import { Segmented } from "../ui/Segmented";

interface SessionSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

const COURT_OPTIONS = ["1", "2", "3", "4"].map((n) => ({ value: n, label: n }));

export function SessionSettingsSheet({ open, onClose }: SessionSettingsSheetProps) {
  const {
    pbOptions,
    activePbId,
    setActivePbId,
    pbName,
    isSessionLocked,
    gorName,
    setGorName,
    matchDate,
    setMatchDate,
    numCourts,
    setNumCourts,
    paymentMode,
    setPaymentMode,
    shuttlecockPrice,
    setShuttlecockPrice,
    baseFee,
    setBaseFee,
    allInFee,
    setAllInFee,
  } = useMabar();

  const moneyInput = (value: number, onChange: (n: number) => void, id: string, describedBy?: string) => (
    <input
      id={id}
      aria-describedby={describedBy}
      type="text"
      inputMode="numeric"
      value={value === 0 ? "" : formatNumberInput(value)}
      onChange={(e) => onChange(parseNumberInput(e.target.value))}
      placeholder="0"
      className={`${inputClass} tabular`}
    />
  );

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Pengaturan sesi"
      description="Tersimpan otomatis."
    >
      <div className="space-y-5">
        <Field
          label="PB"
          hint={
            pbOptions.length > 1
              ? "Ganti PB untuk membuka mabar aktif PB tersebut. Data tiap PB terpisah."
              : undefined
          }
        >
          {({ id, describedBy }) =>
            pbOptions.length > 1 ? (
              <select
                id={id}
                aria-describedby={describedBy}
                value={activePbId ?? ""}
                onChange={(e) => setActivePbId(Number(e.target.value))}
                className={inputClass}
              >
                {pbOptions.map((pb) => (
                  <option key={pb.id} value={pb.id}>
                    {pb.name}
                  </option>
                ))}
              </select>
            ) : (
              <p id={id} className="flex h-11 items-center rounded-lg bg-muted px-3 text-base">
                {pbName || "-"}
              </p>
            )
          }
        </Field>

        {isSessionLocked && (
          <p className="rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning">
            Sesi ini sudah ditutup, jadi pengaturannya tidak bisa diubah.
          </p>
        )}

        <fieldset disabled={isSessionLocked} className="space-y-5 disabled:opacity-60">
          <legend className="sr-only">Detail sesi</legend>
          <Field label="Nama GOR">
            {({ id }) => (
              <input
                id={id}
                type="text"
                value={gorName}
                onChange={(e) => setGorName(e.target.value)}
                placeholder="Contoh: GOR Sinar Jaya"
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Tanggal">
            {({ id }) => (
              <input
                id={id}
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">
              Jumlah lapangan
            </p>
            <Segmented
              label="Jumlah lapangan"
              value={String(numCourts)}
              onChange={(v) => setNumCourts(Number(v))}
              options={COURT_OPTIONS}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Batas pertandingan yang bisa berjalan bersamaan.
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-5">
            <div>
              <p className="mb-1.5 text-sm font-medium">Sistem pembayaran</p>
              <Segmented
                label="Sistem pembayaran"
                value={paymentMode}
                onChange={setPaymentMode}
                options={[
                  { value: "lapangan_kok", label: "Lapangan + kok" },
                  { value: "all_in", label: "All in (flat)" },
                ]}
              />
            </div>
            {paymentMode === "lapangan_kok" ? (
              <>
                <Field
                  label="Harga per kok (Rp)"
                  hint="Biaya kok tiap match dibagi rata ke pemainnya."
                >
                  {({ id, describedBy }) =>
                    moneyInput(shuttlecockPrice, setShuttlecockPrice, id, describedBy)
                  }
                </Field>
                <Field label="Uang lapangan per orang (Rp)" hint="Opsional. Isi 0 jika tidak ada.">
                  {({ id, describedBy }) => moneyInput(baseFee, setBaseFee, id, describedBy)}
                </Field>
              </>
            ) : (
              <Field label="Biaya all in per orang (Rp)">
                {({ id, describedBy }) => moneyInput(allInFee, setAllInFee, id, describedBy)}
              </Field>
            )}
          </div>
        </fieldset>
      </div>
    </Overlay>
  );
}
