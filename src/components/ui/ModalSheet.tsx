import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'

/**
 * A modal sheet (a bottom sheet on a phone, a dialog on a wide screen) for an
 * action that deserves a pause: the page behind is inert and focus stays
 * inside. Focus goes to the close button, not to a field or a red button, so
 * nothing is one keystroke from acting; it returns to what opened the sheet.
 * While `busy`, it cannot be closed.
 */
export function ModalSheet({
  title,
  closeLabel,
  busy = false,
  onClose,
  children,
}: {
  title: string
  closeLabel: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    closeRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [])

  function close() {
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      className="fixed inset-0 m-0 p-0 w-full h-full max-w-none max-h-none bg-transparent backdrop:bg-transparent"
    >
      <div
        className="w-full h-full flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(20, 15, 35, 0.45)' }}
        onClick={close}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
          style={{ background: 'var(--look-bg, var(--color-paper))' }}
        >
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="text-heading font-semibold">
              {title}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              disabled={busy}
              className="w-11 h-11 -my-2 -mr-2 shrink-0 rounded-[var(--radius-control)] flex items-center justify-center"
              style={{ color: 'var(--color-ink-muted)' }}
              aria-label={closeLabel}
            >
              <IconX size={22} aria-hidden />
            </button>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  )
}
