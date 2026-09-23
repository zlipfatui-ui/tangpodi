import { Children, cloneElement, isValidElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface AppDialogProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  className?: string
}

export function AppDialog({ open, title, description, children, onClose, wide = false, className = '' }: AppDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const titleId = `dialog-${title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>('[autofocus]')?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
      previousFocus.current?.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={`app-dialog${wide ? ' app-dialog--wide' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby={`${titleId}-title`}
      aria-describedby={description ? `${titleId}-description` : undefined}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === dialogRef.current) onClose() }}
    >
      <div className="dialog-heading">
        <div>
          <h2 id={`${titleId}-title`}>{title}</h2>
          {description && <p id={`${titleId}-description`}>{description}</p>}
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="ปิดหน้าต่าง">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="dialog-content">{children}</div>
    </dialog>
  )
}

interface FieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({ id, label, hint, error, children }: FieldProps) {
  const helpId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const describeControls = (nodes: ReactNode): ReactNode => Children.map(nodes, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child
    if (typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type)) {
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        'aria-invalid': Boolean(error),
        'aria-describedby': helpId,
      })
    }
    return child.props.children === undefined
      ? child
      : cloneElement(child, { children: describeControls(child.props.children) })
  })
  const describedChildren = describeControls(children)
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {describedChildren}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
      {!error && hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  )
}

export interface ToastMessage {
  id: number
  text: string
  tone: 'success' | 'error' | 'info'
}

export function Toast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && <div className={`toast toast--${toast.tone}`} key={toast.id}>{toast.text}</div>}
    </div>
  )
}
