import type { ReactNode } from 'react'

export function Shake({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={[active ? 'ui-motion-shake' : '', className].filter(Boolean).join(' ')}>{children}</div>
  )
}
