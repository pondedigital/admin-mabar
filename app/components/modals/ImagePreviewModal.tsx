import { Download } from "lucide-react";
import { buttonVariants } from "../ui/button";
import { Overlay } from "../ui/Overlay";

interface ImagePreviewModalProps {
  image: string;
  /** File name used by the download button, without extension. */
  fileName?: string;
  onClose: () => void;
}

export function ImagePreviewModal({ image, fileName = "ponde", onClose }: ImagePreviewModalProps) {
  return (
    <Overlay
      open
      variant="sheet"
      onClose={onClose}
      title="Gambar siap dibagikan"
      description="Tekan lama gambar lalu pilih Simpan Gambar, atau pakai tombol unduh."
      footer={
        <a
          href={image}
          download={`${fileName}.jpg`}
          className={buttonVariants({ variant: "primary", className: "flex-1" })}
        >
          <Download size={18} aria-hidden /> Unduh JPG
        </a>
      }
    >
      <img
        src={image}
        alt="Pratinjau gambar yang akan diunduh"
        className="h-auto w-full rounded-lg border border-border"
      />
    </Overlay>
  );
}
