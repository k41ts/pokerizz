"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** Bottom sheet on phones, centered panel on wider screens. Escape or backdrop closes it. */
export default function Sheet({ open, onClose, title, children }: Props) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-paper p-5 outline-none sm:rounded-[28px] sm:p-6"
            initial={reduce ? { opacity: 0 } : { transform: "translateY(100%)" }}
            animate={reduce ? { opacity: 1 } : { transform: "translateY(0%)" }}
            exit={reduce ? { opacity: 0 } : { transform: "translateY(100%)" }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="press grid size-10 place-items-center rounded-full bg-panel text-lg"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
