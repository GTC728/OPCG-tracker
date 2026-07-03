import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getDefaultRosterPlayerIds } from '@/lib/selectors'
import { useI18n } from '@/lib/i18n'
import { useAppStore } from '@/stores/appStore'

function PlayerChip({
  name,
  active,
  onClick,
}: {
  name: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={[
        'min-h-11 rounded-2xl px-4 py-2 text-sm font-semibold transition outline-none',
        active ? 'bg-brand-600 text-white' : 'bg-surface text-text-primary ring-1 ring-surface-muted',
      ].join(' ')}
      onClick={onClick}
    >
      {name}
    </button>
  )
}

export function SessionRosterSheet({
  sessionId,
  open,
  onClose,
}: {
  sessionId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const state = useAppStore()
  const setSessionRoster = useAppStore((s) => s.setSessionRoster)
  const addPlayer = useAppStore((s) => s.addPlayer)
  const allPlayers = useMemo(
    () =>
      [...state.players.filter((player) => !player.archived)].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [state.players],
  )
  const defaultIds = useMemo(() => getDefaultRosterPlayerIds(state), [state])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const existing = state.sessionPlayers
      .filter((sp) => sp.sessionId === sessionId)
      .map((sp) => sp.playerId)
    if (existing.length) return new Set(existing)
    return new Set(defaultIds.filter((id) => allPlayers.some((p) => p.id === id)))
  })
  const [newPlayerName, setNewPlayerName] = useState('')

  useEffect(() => {
    const existing = state.sessionPlayers
      .filter((sp) => sp.sessionId === sessionId)
      .map((sp) => sp.playerId)
    if (existing.length) {
      setSelectedIds(new Set(existing))
    } else {
      setSelectedIds(new Set(defaultIds.filter((id) => allPlayers.some((p) => p.id === id))))
    }
  }, [sessionId, open])

  const toggle = (playerId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const handleAddPlayer = () => {
    const name = newPlayerName.trim()
    if (!name) return
    try {
      const player = addPlayer({ name, aliases: [] })
      setSelectedIds((current) => new Set([...current, player.id]))
      setNewPlayerName('')
      toast.success(t('roster.playerAdded'))
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('roster.addFailed'))
    }
  }

  const save = () => {
    setSessionRoster(sessionId, [...selectedIds])
    onClose()
  }

  return (
    <BottomSheet open={open} title={t('roster.title')} onClose={onClose}>
      <p className="mb-4 text-sm text-text-secondary">{t('roster.desc')}</p>
      {allPlayers.length ? (
        <div className="flex flex-wrap gap-2">
          {allPlayers.map((player) => (
            <PlayerChip
              key={player.id}
              name={player.name}
              active={selectedIds.has(player.id)}
              onClick={() => toggle(player.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">{t('roster.empty')}</p>
      )}
      <div className="mt-4 flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-xl border border-surface-muted bg-surface px-3 text-sm text-text-primary outline-none focus:border-brand-500"
          placeholder={t('roster.addPlaceholder')}
          value={newPlayerName}
          onChange={(event) => setNewPlayerName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAddPlayer()
          }}
        />
        <Button type="button" variant="secondary" disabled={!newPlayerName.trim()} onClick={handleAddPlayer}>
          {t('roster.addPlayer')}
        </Button>
      </div>
      {selectedIds.size < 2 ? (
        <p className="mt-3 text-sm text-yellow-200">{t('roster.needTwo')}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('roster.later')}
        </Button>
        <Button type="button" disabled={selectedIds.size < 2} onClick={save}>
          {t('roster.confirm')}
        </Button>
      </div>
    </BottomSheet>
  )
}
