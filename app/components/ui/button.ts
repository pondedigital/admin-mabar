import { cva, type VariantProps } from "class-variance-authority";

/**
 * One button system for the whole app.
 * - primary: the single main action of an area (signal yellow, ink text)
 * - ink: strong secondary action (black)
 * - outline: neutral action
 * - ghost: low-emphasis / icon actions
 * - danger: destructive confirm
 */
export const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none select-none",
  {
    variants: {
      variant: {
        primary: "surface-brand text-foreground shadow-brand hover:brightness-[1.03]",
        ink: "surface-ink text-white shadow-pop hover:brightness-125",
        outline: "border border-border bg-card text-foreground shadow-card hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-destructive text-white shadow-pop hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-11 shrink-0",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** Shared look for text/number/select controls. */
export const inputClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] focus:border-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-muted";
