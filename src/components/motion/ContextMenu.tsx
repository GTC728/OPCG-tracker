import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'

export type ContextMenuItem = {
  id: string
  label: string
  danger?: boolean
  onSelect: () => void
}

export function ContextMenu({
  open,
  title,
  items,
  onClose,
}: {
  open: boolean
  title: string
  items: ContextMenuItem[]
  onClose: () => void
}) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className="space-y-2">
        {items.map((item) => (
          <Button
            key={item.id}
            variant={item.danger ? 'danger' : 'secondary'}
            fullWidth
            onClick={() => {
              item.onSelect()
              onClose()
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </BottomSheet>
  )
}
