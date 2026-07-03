import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useI18n } from '@/lib/i18n'
import {
  listCloudSnapshots,
  listGroupCloudSnapshots,
  loadCloudSnapshotById,
  loadGroupCloudSnapshotById,
  type CloudSnapshotMeta,
  type GroupCloudSnapshotMeta,
} from '@/lib/cloudSync'
import { formatDateTime } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'

function SnapshotRow({
  label,
  meta,
  selected,
  onSelect,
}: {
  label: string
  meta: CloudSnapshotMeta | GroupCloudSnapshotMeta
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left text-sm ring-1 ring-surface-muted',
        selected ? 'bg-brand-600 text-white' : 'bg-surface hover:bg-surface-muted',
      ].join(' ')}
      onClick={onSelect}
    >
      <span>
        <span className="block font-semibold">{formatDateTime(meta.created_at)}</span>
        <span className="mt-1 block text-xs opacity-75">
          {label} · v{meta.app_version}
        </span>
      </span>
      <span className="text-xs opacity-75">{meta.device_label}</span>
    </button>
  )
}

export function BackupVersionList({
  mode,
  groupCode,
  onRestored,
}: {
  mode: 'personal' | 'group'
  groupCode?: string | null
  onRestored?: () => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const replaceState = useAppStore((state) => state.replaceState)
  const [items, setItems] = useState<Array<CloudSnapshotMeta | GroupCloudSnapshotMeta>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const next =
          mode === 'personal'
            ? await listCloudSnapshots(20)
            : groupCode
              ? await listGroupCloudSnapshots(groupCode, 20)
              : []
        if (!cancelled) {
          setItems(next)
          setSelectedId(next[0]?.id ?? null)
        }
      } catch {
        if (!cancelled) setItems([])
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [groupCode, mode])

  if (!items.length) {
    return (
      <p className="text-sm text-text-secondary">
        {mode === 'personal' ? t('cloud.noPersonalVersions') : t('cloud.noGroupVersions')}
      </p>
    )
  }

  const visibleItems = expanded ? items : items.slice(0, 3)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-secondary">{t('cloud.versionHistory')}</h3>
        {items.length > 3 ? (
          <button
            type="button"
            className="text-xs text-brand-400 outline-none"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? t('cloud.showLessVersions') : t('cloud.showAllVersions')}
          </button>
        ) : null}
      </div>
      {visibleItems.map((item) => (
        <SnapshotRow
          key={item.id}
          label={mode === 'personal' ? t('cloud.personalBackup') : t('cloud.groupBackup')}
          meta={item}
          selected={selectedId === item.id}
          onSelect={() => setSelectedId(item.id)}
        />
      ))}
      <Button
        variant="secondary"
        fullWidth
        disabled={!selectedId || busy}
        loading={busy}
        onClick={async () => {
          if (!selectedId) return
          const confirmed = window.confirm(t('cloud.restoreVersionConfirm'))
          if (!confirmed) return
          setBusy(true)
          try {
            if (mode === 'personal') {
              const snapshot = await loadCloudSnapshotById(selectedId)
              if (!snapshot) throw new Error(t('cloud.versionMissing'))
              replaceState(snapshot.state)
            } else {
              if (!groupCode) throw new Error(t('cloud.groupEmpty'))
              const snapshot = await loadGroupCloudSnapshotById(groupCode, selectedId)
              if (!snapshot) throw new Error(t('cloud.versionMissing'))
              replaceState(snapshot.state)
            }
            toast.success(t('cloud.restoreVersionDone'))
            onRestored?.()
          } catch (caught) {
            toast.error(caught instanceof Error ? caught.message : t('cloud.restoreVersionFailed'))
          } finally {
            setBusy(false)
          }
        }}
      >
        {t('cloud.restoreSelectedVersion')}
      </Button>
    </div>
  )
}
