import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) {
    return null;
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className={clsx("w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl", className)}>
        <div className="mb-4 flex items-center justify-between">
          {title ? <h2 className="text-lg font-semibold text-neutral-100">{title}</h2> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-400 transition hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const container = document.body;
  return createPortal(modal, container);
}

export default Modal;
