export interface ToastState {
  kind: "busy" | "success" | "warning" | "error";
  message: string;
}

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.message} className={`toast toast--${toast.kind}`}>
          {toast.kind === "busy" && <span className="spinner" aria-hidden />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
