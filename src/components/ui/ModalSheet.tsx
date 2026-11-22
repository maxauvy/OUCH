import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import { useSheetClose } from './sheetClose'

/**
 * A modal sheet (a card floating at the foot of a phone, a dialog on a wide
 * screen) for an action that deserves a pause, in the glass of the tab bar on
 * a light veil, the page showing through: the page behind is inert and focus stays
 * inside. Focus goes to the close button, not to a field or a red button, so
 * nothing is one keystroke from acting; it returns to what opened the sheet.
 * While `busy`, it cannot be closed. It rises on a fading veil, and goes back
 * down when it is closed from inside (Fermer, Escape, a tap beside it).
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

  const [closing, close] = useSheetClose(onClose, busy)

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
        className={`sheet-veil w-full h-full flex items-end sm:items-center justify-center${closing ? ' is-closing' : ''}`}
        style={{
          background: 'rgba(20, 15, 35, 0.22)',
          padding: 'calc(var(--root-pad-top, 0px) + 12px) max(12px, env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 12px) max(12px, env(safe-area-inset-left))',
        }}
        onClick={close}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="sheet-card glass-float w-full sm:max-w-md rounded-[28px] p-5 flex flex-col gap-4 max-h-[min(100%,92vh)] overflow-y-auto"
          // A stronger blur than the tab bar's: a form is read on it, over a page that can be busy.
          style={{ WebkitBackdropFilter: 'blur(22px) saturate(1.4)', backdropFilter: 'blur(22px) saturate(1.4)' }}
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
