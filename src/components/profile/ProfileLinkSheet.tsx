import { useMemo, useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { isSelectablePlayer } from '@/lib/entityVisibility'
import { useI18n } from '@/lib/i18n'
import { isPlayerClaimedByOtherDevice } from '@/lib/profileClaim'
import { uiCardInset, uiSectionTitle } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'

type ProfileLinkMode = 'create' | 'link'

export function ProfileLinkSheet({
  open,
  onClose,
  onComplete,
}: {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}) {
  const { t } = useI18n()
  const players = useAppStore((state) => state.players)
  const createAndClaimProfile = useAppStore((state) => state.createAndClaimProfile)
  const linkProfileToPlayer = useAppStore((state) => state.linkProfileToPlayer)
  const [mode, setMode] = useState<ProfileLinkMode>('create')
  const [name, setName] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [forceConfirm, setForceConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectablePlayers = useMemo(
    () => players.filter((player) => isSelectablePlayer(player)).sort((a, b) => a.name.localeCompare(b.name)),
    [players],
  )
  const selectedPlayer = selectablePlayers.find((player) => player.id === selectedPlayerId) ?? null
  const needsForceConfirm = selectedPlayer ? isPlayerClaimedByOtherDevice(selectedPlayer) : false

  const reset = () => {
    setError(null)
    setConfirmation('')
    setForceConfirm(false)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      if (mode === 'create') {
        if (!name.trim()) {
          setError(t('profile.nameRequired'))
          return
        }
        createAndClaimProfile({ name: name.trim(), aliases: [] })
      } else {
        if (!selectedPlayer) {
          setError(t('profile.selectPlayer'))
          return
        }
        linkProfileToPlayer(selectedPlayer.id, confirmation, needsForceConfirm && forceConfirm)
      }
      onComplete?.()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('profile.linkFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('profile.setupTitle')}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">{t('profile.setupDesc')}</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={[uiCardInset, mode === 'create' ? 'ring-brand-500/40' : '', 'p-3 text-left'].join(' ')}
            onClick={() => {
              setMode('create')
              reset()
            }}
          >
            <p className="text-sm font-semibold">{t('profile.createMine')}</p>
            <p className="mt-1 text-xs text-text-secondary">{t('profile.createMineDesc')}</p>
          </button>
          <button
            type="button"
            className={[uiCardInset, mode === 'link' ? 'ring-brand-500/40' : '', 'p-3 text-left'].join(' ')}
            onClick={() => {
              setMode('link')
              reset()
            }}
          >
            <p className="text-sm font-semibold">{t('profile.linkExisting')}</p>
            <p className="mt-1 text-xs text-text-secondary">{t('profile.linkExistingDesc')}</p>
          </button>
        </div>

        {mode === 'create' ? (
          <label className="block">
            <span className="text-sm font-medium text-text-secondary">{t('profile.displayName')}</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-surface-muted bg-surface px-3 text-text-primary"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">{t('profile.choosePlayer')}</span>
              <select
                className="mt-2 min-h-11 w-full rounded-lg border border-surface-muted bg-surface px-3 text-text-primary"
                value={selectedPlayerId ?? ''}
                onChange={(event) => {
                  setSelectedPlayerId(event.target.value || null)
                  reset()
                }}
              >
                <option value="">{t('profile.choosePlayerPlaceholder')}</option>
                {selectablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                    {isPlayerClaimedByOtherDevice(player) ? ` · ${t('profile.claimedElsewhere')}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedPlayer ? (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-text-secondary">
                    {t('profile.confirmIdentityPrefix')} {selectedPlayer.name}
                  </span>
                  <input
                    className="mt-2 min-h-11 w-full rounded-lg border border-surface-muted bg-surface px-3 text-text-primary"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder={selectedPlayer.name}
                  />
                </label>
                {needsForceConfirm ? (
                  <label className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm ring-1 ring-warning/25">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={forceConfirm}
                      onChange={(event) => setForceConfirm(event.target.checked)}
                    />
                    <span>{t('profile.forceClaimConfirm')}</span>
                  </label>
                ) : null}
              </>
            ) : null}
          </div>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <section className={[uiCardInset, 'space-y-2 p-3'].join(' ')}>
          <h3 className={uiSectionTitle}>{t('profile.securityTitle')}</h3>
          <p className="text-xs leading-relaxed text-text-secondary">{t('profile.securityDesc')}</p>
        </section>

        <Button fullWidth loading={loading} onClick={handleSubmit}>
          {mode === 'create' ? t('profile.createAndLink') : t('profile.confirmLink')}
        </Button>
      </div>
    </BottomSheet>
  )
}
