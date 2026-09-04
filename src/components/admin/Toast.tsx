'use client';

import { useEffect, useState } from 'react';

export type ToastState = { message: string; tone: 'good' | 'bad' } | null;

export function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); onDone(); }, 4000);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-3 text-sm shadow-lift ${
        toast.tone === 'good'
          ? 'border-[#2F6B4F]/30 bg-[#E8F1EC] text-[#2F6B4F]'
          : 'border-burgundy/30 bg-burgundy-wash text-burgundy'
      }`}
    >
      {toast.message}
    </div>
  );
}

export function ConfirmDialog({
  open, title, body, confirmLabel = 'Confirm', destructive = true, onConfirm, onCancel,
}: {
  open: boolean; title: string; body: string; confirmLabel?: string;
  destructive?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/40 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
           className="w-full max-w-sm rounded-md border border-parchment-edge bg-white p-6 shadow-lift">
        <h2 id="confirm-title" className="font-display text-lg text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">{body}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className={`${destructive ? 'btn-danger' : 'btn-primary'} flex-1`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
