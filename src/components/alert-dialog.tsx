"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle, X } from "lucide-react";

type AlertVariant = "danger" | "warning" | "info" | "success";

interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AlertVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  AlertVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    confirmBg: string;
    confirmHover: string;
    confirmText: string;
    ringColor: string;
  }
> = {
  danger: {
    icon: XCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    confirmBg: "bg-rose-500",
    confirmHover: "hover:bg-rose-600",
    confirmText: "text-white",
    ringColor: "focus:ring-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    confirmBg: "bg-amber-500",
    confirmHover: "hover:bg-amber-600",
    confirmText: "text-white",
    ringColor: "focus:ring-amber-500",
  },
  info: {
    icon: Info,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
    confirmBg: "bg-sky-500",
    confirmHover: "hover:bg-sky-600",
    confirmText: "text-white",
    ringColor: "focus:ring-sky-500",
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-50",
    iconColor: "text-[#16A34A]",
    confirmBg: "bg-[#16A34A]",
    confirmHover: "hover:bg-[#15803D]",
    confirmText: "text-white",
    ringColor: "focus:ring-[#16A34A]",
  },
};

export default function AlertDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby={description ? "alert-dialog-description" : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div
            className={`h-14 w-14 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-7 w-7 ${cfg.iconColor}`} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <h2
              id="alert-dialog-title"
              className="text-base font-extrabold text-[#0F172A] tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                id="alert-dialog-description"
                className="text-xs text-[#64748B] font-semibold leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={`flex-1 ${cfg.confirmBg} ${cfg.confirmHover} ${cfg.confirmText} rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${cfg.ringColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
