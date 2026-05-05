import { useToastStore } from '../../stores/appStore';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'border-success text-success',
  error: 'border-danger text-danger',
  warning: 'border-warning text-warning',
  info: 'border-info text-info',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const Icon = icons[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 bg-surface-elevated border-l-4 rounded-lg shadow-xl min-w-72 card-animate ${colors[toast.type]}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm text-text-primary flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-text-secondary hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
