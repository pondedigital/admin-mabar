import { useMabar } from "../../context/MabarContext";

export function AppModal() {
  const { modal, closeModal } = useMabar();

  if (!modal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200 border-t-4 border-yellow-400">
        <h3 className="text-lg font-black text-gray-900 mb-2">
          {modal.type === "confirm" ? "Konfirmasi" : "Perhatian"}
        </h3>
        <p className="text-gray-600 mb-6 text-sm">{modal.message}</p>
        <div className="flex justify-end gap-3">
          {modal.type === "confirm" && (
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-600 text-sm font-bold hover:bg-gray-100 rounded-lg transition"
            >
              Batal
            </button>
          )}
          <button
            onClick={() => {
              if (modal.onConfirm) modal.onConfirm();
              closeModal();
            }}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition ${
              modal.type === "confirm"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-yellow-400 hover:bg-yellow-500 text-black"
            }`}
          >
            {modal.type === "confirm" ? modal.confirmLabel ?? "Hapus" : "Mengerti"}
          </button>
        </div>
      </div>
    </div>
  );
}
