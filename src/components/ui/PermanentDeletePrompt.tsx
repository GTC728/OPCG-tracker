import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n'

export function PermanentDeletePrompt({
  open,
  title,
  description,
  detail,
  confirmLabel,
  onClose,
  onConfirm,
  onBackup,
}: {
  open: boolean
  title: string
  description: string
  detail?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: () => void
  onBackup?: () => void
}) {
  const { t } = useI18n()

  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <p className="text-sm text-text-secondary">{description}</p>
      {detail ? <p className="mt-2 text-xs text-text-secondary">{detail}</p> : null}
      <div className="mt-4 rounded-xl bg-warning/10 p-3 text-sm text-yellow-100">
        {t('delete.backupHint')}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {onBackup ? (
          <Button variant="secondary" onClick={onBackup}>
            {t('delete.backupFirst')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          variant="danger"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel ?? t('delete.confirmPermanent')}
        </Button>
      </div>
    </BottomSheet>
  )
}
