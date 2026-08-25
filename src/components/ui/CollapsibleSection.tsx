import { useState, type ReactNode } from 'react'
import { Collapse } from '@/components/motion/Collapse'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useI18n } from '@/lib/i18n'

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="space-y-3">
      <SectionHeader
        title={title}
        action={open ? t('common.collapse') : t('common.expand')}
        onAction={() => setOpen((value) => !value)}
      />
      <Collapse open={open}>
        <div className="space-y-4 pt-3">{children}</div>
      </Collapse>
    </section>
  )
}
