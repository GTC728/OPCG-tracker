import { useMemo, useState } from 'react'
import { AchievementIcon } from '@/components/achievements/AchievementIcon'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  ACHIEVEMENT_DEFINITIONS,
  computeGlobalAchievementRates,
  sortAchievementProgress,
  type AchievementPeerRate,
} from '@/lib/achievements'
import type { AchievementPeerContext } from '@/components/achievements/AchievementsWall'
import { playInteractionSound, uiPressable } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'
import { uiCardInset, uiGlassCard } from '@/lib/uiSurface'

type CommunityTab = 'global' | 'peers'

export function AchievementCommunitySheet({
  open,
  onClose,
  peerRates,
  peerContext,
  onSelectPeer,
}: {
  open: boolean
  onClose: () => void
  peerRates: AchievementPeerRate[]
  peerContext?: AchievementPeerContext
  onSelectPeer: (playerId: string) => void
}) {
  const { language, t } = useI18n()
  const [tab, setTab] = useState<CommunityTab>('global')

  const globalItems = useMemo(() => {
    if (!peerContext) return []
    const rates = computeGlobalAchievementRates(peerContext.players, peerContext.decks, peerContext.matches)
    const items = ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      definition,
      currentLevel: 0,
      maxLevel: definition.tiers[definition.tiers.length - 1]?.level ?? 1,
      unlockedAt: null,
      currentValue: 0,
      nextThreshold: definition.tiers[0]?.threshold ?? null,
      globalRate: rates.get(definition.id)?.rate ?? 0,
    }))
    return sortAchievementProgress(items, 'global')
  }, [peerContext])

  const handleSelectPeer = (playerId: string) => {
    playInteractionSound('tap')
    onSelectPeer(playerId)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('achievements.communityTitle')}>
      <div className="space-y-3">
        <div className="flex gap-1 rounded-lg border border-[var(--ui-border)] bg-surface-muted/30 p-1">
          {(['global', 'peers'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={[
                'flex-1 rounded-md px-2 py-1.5 text-xs font-semibold',
                uiPressable,
                tab === value
                  ? 'bg-brand-500/20 text-brand-300'
                  : 'text-text-secondary',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                setTab(value)
              }}
            >
              {t(`achievements.tab.${value}`)}
            </button>
          ))}
        </div>

        {tab === 'global' ? (
          <ol className="space-y-2">
            {globalItems.map((item, index) => (
              <li key={item.definition.id} className={[uiGlassCard, 'flex items-center gap-3 p-3'].join(' ')}>
                <span className="w-5 shrink-0 text-center text-xs font-bold text-text-secondary">{index + 1}</span>
                <AchievementIcon achievementId={item.definition.id} kind={item.definition.icon} category={item.definition.category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.definition.title[language]}</p>
                  <p className="text-[10px] text-text-secondary">{t('achievements.globalRateHint')}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-brand-400">{item.globalRate}%</span>
              </li>
            ))}
          </ol>
        ) : (
          <section className={[uiCardInset, 'p-2'].join(' ')}>
            <p className="mb-2 text-xs text-text-secondary">{t('achievements.peerRatesHint')}</p>
            <ol className="space-y-1">
              {peerRates.map((peer, index) => (
                <li key={peer.playerId}>
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center justify-between rounded-md border border-[var(--ui-border)] px-2.5 py-2 text-left text-sm',
                      uiPressable,
                    ].join(' ')}
                    onClick={() => handleSelectPeer(peer.playerId)}
                  >
                    <span className="truncate font-medium">
                      {index + 1}. {peer.name}
                    </span>
                    <span className="shrink-0 pl-2 text-xs font-bold text-brand-400">{peer.rate}%</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </BottomSheet>
  )
}
