import { groupRoleLabel } from '@/lib/groupPermissions'
import { useI18n } from '@/lib/i18n'
import { uiPressable } from '@/lib/motion'
import { useAppStore } from '@/stores/appStore'

interface WorkspaceChipProps {
  onClick: () => void
}

export function WorkspaceChip({ onClick }: WorkspaceChipProps) {
  const { t } = useI18n()
  const lastGroupCode = useAppStore((state) => state.settings.lastGroupCode)
  const role = useAppStore((state) => state.settings.groupMemberRole)
  const label = lastGroupCode ?? t('workspace.local')

  return (
    <button
      type="button"
      className={[
        'max-w-[9rem] shrink-0 truncate rounded-full px-2.5 py-1 text-[10px] font-semibold',
        uiPressable,
        lastGroupCode ? 'ui-frost-control text-brand-100' : 'ui-frost-control text-text-secondary',
      ].join(' ')}
      onClick={onClick}
      title={t('workspace.openHub')}
    >
      {label}
      {role ? ` · ${groupRoleLabel(role).slice(0, 2)}` : ''}
    </button>
  )
}
