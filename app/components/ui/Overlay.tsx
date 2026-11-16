import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** sheet = slides up from the bottom (long content), dialog = centered (short decisions). */
  variant?: "sheet" | "dialog";
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Built on the native <dialog> element: focus trapping, Escape to close and the
 * inert background come from the browser instead of custom code.
 */
export function Overlay({
  open,
  onClose,
  title,
  description,
  variant = "dialog",
  footer,
  children,
}: OverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start focus on a field marked data-autofocus, else on the panel itself,
      // instead of the browser's default (the close button).
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog box itself, outside its panel).
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/55 print:hidden",
        variant === "sheet"
          ? "fixed inset-x-0 bottom-0 top-auto mx-auto w-full max-w-md"
          : "fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-sm"
      )}
    >
      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            "flex flex-col bg-card text-foreground outline-none",
            variant === "sheet"
              ? "max-h-[88dvh] rounded-t-2xl pb-safe animate-in slide-in-from-bottom-8 fade-in duration-200"
              : "rounded-2xl animate-in fade-in zoom-in-95 duration-150"
          )}
        >
          {variant === "sheet" && (
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
          )}
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && (
                <div className="mt-1 text-sm text-muted-foreground">{description}</div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
