import type { ReactNode } from "react";

/** Container for one real group of content. Never nest one inside another. */
export const cardClass = "rounded-2xl border border-border/70 bg-card shadow-card";

interface SectionHeaderProps {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  id?: string;
}

export function SectionHeader({ title, meta, action, id }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex min-h-9 items-center justify-between gap-3 px-1">
      <h2 id={id} className="text-sm font-semibold text-foreground">
        {title}
        {meta !== undefined && (
          <span className="ml-1.5 font-normal text-muted-foreground tabular">{meta}</span>
        )}
      </h2>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-input px-4 py-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
