import type { ReactNode } from "react";

interface FullScreenMessageProps {
  title: string;
  description?: ReactNode;
  tone?: "neutral" | "error";
  action?: ReactNode;
}

/** Loading, error and blocking states that replace the whole app. */
export function FullScreenMessage({
  title,
  description,
  tone = "neutral",
  action,
}: FullScreenMessageProps) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background p-6 text-center"
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="max-w-xs">
        <p
          className={
            tone === "error" ? "font-semibold text-destructive" : "text-sm text-muted-foreground"
          }
        >
          {title}
        </p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
