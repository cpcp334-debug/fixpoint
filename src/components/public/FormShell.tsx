import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const fieldControlClass =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3 text-[0.9375rem] text-ink";

export const fieldLabelClass = "mb-1.5 block text-sm font-medium text-navy";

export function FormShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-xl rounded-xl border border-line bg-white p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function FormGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="px-0 text-sm font-medium text-navy">{legend}</legend>
      {children}
    </fieldset>
  );
}
