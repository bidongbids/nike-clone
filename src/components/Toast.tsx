import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ToastType } from '../types'

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const COLORS: Record<ToastType, string> = {
  success: '#22c55e',
  error:   '#f04048',
  info:    '#3b82f6',
  warning: '#f59e0b',
}

export default function Toast() {
  const { toasts, removeToast } = useStore()

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        const color = COLORS[t.type]
        return (
          <div key={t.id} className={`toast ${t.type}`} role="alert" aria-live="polite">
            <Icon size={18} color={color} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
