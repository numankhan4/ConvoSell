'use client';

interface ExportConfirmModalProps {
  open: boolean;
  resourceLabel: string;
  format: 'csv' | 'json';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ExportConfirmModal({
  open,
  resourceLabel,
  format,
  loading = false,
  onCancel,
  onConfirm,
}: ExportConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Confirm Data Export</h3>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-700">
            You are about to export <span className="font-semibold">{resourceLabel}</span> as{' '}
            <span className="font-semibold">{format.toUpperCase()}</span>.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This file may contain protected customer data (PII). Only continue if you are authorized to handle and store this data securely.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Exporting...' : 'Confirm Export'}
          </button>
        </div>
      </div>
    </div>
  );
}