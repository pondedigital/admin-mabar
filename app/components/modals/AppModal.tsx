import { useMabar } from "../../context/MabarContext";
import { buttonVariants } from "../ui/button";
import { Overlay } from "../ui/Overlay";

export function AppModal() {
  const { modal, closeModal } = useMabar();
  const isConfirm = modal.type === "confirm";

  return (
    <Overlay
      open={modal.isOpen}
      onClose={closeModal}
      title={isConfirm ? "Konfirmasi" : "Perhatian"}
      description={modal.message}
      footer={
        <>
          {isConfirm && (
            <button
              type="button"
              onClick={closeModal}
              className={buttonVariants({ variant: "outline", className: "flex-1" })}
            >
              Batal
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (modal.onConfirm) modal.onConfirm();
              closeModal();
            }}
            className={buttonVariants({
              variant: isConfirm ? "danger" : "ink",
              className: "flex-1",
            })}
          >
            {isConfirm ? modal.confirmLabel ?? "Hapus" : "Mengerti"}
          </button>
        </>
      }
    />
  );
}
