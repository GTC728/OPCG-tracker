import { useMemo, useState } from 'react'
import { AchievementIcon } from '@/components/achievements/AchievementIcon'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  ACHIEVEMENT_CATEGORY_ORDER,
  filterAchievementProgress,
  formatAchievementToast,
  getRecentAchievementProgress,
  sortAchievementProgress,
  type AchievementCategory,
  type AchievementProgress,
  type AchievementSortMode,
} from '@/lib/achievements'
import { playInteractionSound, uiPopIn, uiPressable } from '@/lib/motion'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import type { Language } from '@/types'

import type { AchievementPeerRate } from '@/lib/achievements'

function AchievementCard({
  item,
  language,
  compact = false,
  showGlobalRate = false,
  onClick,
}: {
  item: AchievementProgress
  language: Language
  compact?: boolean
  showGlobalRate?: boolean
  onClick?: () => void
}) {
  const unlocked = item.currentLevel > 0
  const title = item.definition.title[language]
  const body = (
    <article
      className={[
        uiGlassCard,
        uiPopIn,
        uiPressable,
        'flex h-full min-w-[9.5rem] flex-col p-3 text-left transition',
        unlocked ? '' : 'opacity-55',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <AchievementIcon
          kind={item.definition.icon}
          category={item.definition.category}
          size={compact ? 'sm' : 'md'}
          dimmed={!unlocked}
        />
        <div className="flex flex-col items-end gap-0.5">
          {unlocked ? (
            <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-400">
              Lv.{item.currentLevel}
            </span>
          ) : null}
          {showGlobalRate ? (
            <span className="text-[10px] font-semibold text-text-secondary">{item.globalRate}%</span>
          ) : null}
        </div>
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[11px] text-text-secondary">
        {unlocked
          ? `${item.currentLevel}/${item.maxLevel}`
          : item.nextThreshold
            ? `→ ${item.nextThreshold}`
            : '—'}
      </p>
      <div className="mt-auto space-y-1 pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted/60">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.round((item.currentLevel / item.maxLevel) * 100)}%` }}
          />
        </div>
        {showGlobalRate ? (
          <div className="h-1 overflow-hidden rounded-full bg-surface-muted/40">
            <div
              className="h-full rounded-full bg-brand-400/70"
              style={{ width: `${item.globalRate}%` }}
            />
          </div>
        ) : null}
      </div>
    </article>
  )

  if (!onClick) return body
  return (
    <button
      type="button"
      className="block h-full shrink-0"
      onClick={() => {
        playInteractionSound('tap')
        onClick()
      }}
    >
      {body}
    </button>
  )
}

function AchievementRateRow({
  item,
  language,
  onClick,
}: {
  item: AchievementProgress
  language: Language
  onClick: () => void
}) {
  const { t } = useI18n()
  const title = item.definition.title[language]
  const desc = item.definition.description[language]
  return (
    <button
      type="button"
      className={['achievement-rate-row w-full text-left', uiPressable].join(' ')}
      onClick={() => {
        playInteractionSound('tap')
        onClick()
      }}
    >
      <div className="achievement-rate-fill" style={{ width: `${item.globalRate}%` }} />
      <div className="achievement-rate-content flex items-start gap-3 p-3">
        <AchievementIcon
          kind={item.definition.icon}
          category={item.definition.category}
          size="sm"
          dimmed={item.currentLevel <= 0}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <span className="shrink-0 text-xs font-bold text-brand-400">{item.globalRate}%</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{desc}</p>
          <p className="mt-1 text-[11px] text-text-secondary">
            {item.currentLevel > 0 ? `Lv.${item.currentLevel}/${item.maxLevel}` : t('achievements.notUnlocked')}
          </p>
        </div>
      </div>
    </button>
  )
}

function AchievementDetailSheet({
  item,
  language,
  playerCompletionRate,
  open,
  onClose,
}: {
  item: AchievementProgress | null
  language: Language
  playerCompletionRate?: number
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  if (!item) return null
  const title = item.definition.title[language]
  const desc = item.definition.description[language]

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AchievementIcon kind={item.definition.icon} category={item.definition.category} size="lg" />
          <div>
            <p className="text-sm text-text-secondary">{desc}</p>
            <p className="mt-1 text-lg font-bold">
              Lv.{item.currentLevel}/{item.maxLevel}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <article className={[uiGlassCard, 'p-3'].join(' ')}>
            <p className="text-[10px] uppercase text-text-secondary">{t('achievements.globalRate')}</p>
            <p className="mt-1 text-xl font-bold text-brand-400">{item.globalRate}%</p>
          </article>
          {playerCompletionRate != null ? (
            <article className={[uiGlassCard, 'p-3'].join(' ')}>
              <p className="text-[10px] uppercase text-text-secondary">{t('achievements.playerRate')}</p>
              <p className="mt-1 text-xl font-bold">{playerCompletionRate}%</p>
            </article>
          ) : null}
        </div>
        <ol className="space-y-2">
          {item.definition.tiers.map((tier) => {
            const done = item.currentLevel >= tier.level
            return (
              <li
                key={tier.level}
                className={[
                  'flex items-center justify-between rounded-lg border px-3 py-2',
                  done
                    ? 'border-success/30 bg-success/10'
                    : 'border-[var(--ui-border)] bg-surface/40',
                ].join(' ')}
              >
                <span className="text-sm font-medium">
                  Lv.{tier.level} · {tier.label[language]}
                </span>
                <span className="text-xs text-text-secondary">{tier.threshold}+</span>
              </li>
            )
          })}
        </ol>
        <p className="text-xs text-text-secondary">
          {t('achievements.currentProgress')}: {item.currentValue}
          {item.nextThreshold ? ` / ${item.nextThreshold}` : ''}
        </p>
      </div>
    </BottomSheet>
  )
}

const CATEGORY_LABEL_KEY: Record<AchievementCategory, TranslationKey> = {
  milestone: 'achievements.category.milestone',
  streak: 'achievements.category.streak',
  skill: 'achievements.category.skill',
  meta: 'achievements.category.meta',
  social: 'achievements.category.social',
  fun: 'achievements.category.fun',
}

function AchievementFilters({
  category,
  sortMode,
  viewMode,
  onCategoryChange,
  onSortChange,
  onViewModeChange,
}: {
  category: AchievementCategory | 'all'
  sortMode: AchievementSortMode
  viewMode: 'grid' | 'list'
  onCategoryChange: (value: AchievementCategory | 'all') => void
  onSortChange: (value: AchievementSortMode) => void
  onViewModeChange: (value: 'grid' | 'list') => void
}) {
  const { t } = useI18n()
  const categories: Array<AchievementCategory | 'all'> = ['all', ...ACHIEVEMENT_CATEGORY_ORDER]
  const sortModes: AchievementSortMode[] = ['global', 'progress', 'ease', 'category', 'name']

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              playInteractionSound('toggle')
              onCategoryChange(cat)
            }}
            className={[
              'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition',
              uiPressable,
              category === cat
                ? 'border-brand-500/40 bg-brand-500/20 text-brand-300'
                : 'border-[var(--ui-border)] bg-surface-muted/30 text-text-secondary',
            ].join(' ')}
          >
            {cat === 'all' ? t('achievements.filter.all') : t(CATEGORY_LABEL_KEY[cat])}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-text-secondary">{t('achievements.sort.label')}</span>
        <select
          value={sortMode}
          onChange={(event) => onSortChange(event.target.value as AchievementSortMode)}
          className="rounded-lg border border-[var(--ui-border)] bg-surface-muted/50 px-2 py-1 text-xs font-medium text-text-primary"
        >
          {sortModes.map((mode) => (
            <option key={mode} value={mode}>
              {t(`achievements.sort.${mode}` as TranslationKey)}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-1">
          {(['list', 'grid'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={[
                'rounded-md border px-2 py-1 text-[11px] font-semibold',
                uiPressable,
                viewMode === mode
                  ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                  : 'border-[var(--ui-border)] text-text-secondary',
              ].join(' ')}
              onClick={() => {
                playInteractionSound('toggle')
                onViewModeChange(mode)
              }}
            >
              {t(`achievements.view.${mode}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function useFilteredAchievements(achievements: AchievementProgress[]) {
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')
  const [sortMode, setSortMode] = useState<AchievementSortMode>('global')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const filtered = useMemo(() => {
    const scoped = filterAchievementProgress(achievements, category)
    return sortAchievementProgress(scoped, sortMode)
  }, [achievements, category, sortMode])

  const grouped = useMemo(() => {
    if (category !== 'all' || sortMode !== 'category') return null
    return ACHIEVEMENT_CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((item) => item.definition.category === cat),
    })).filter((group) => group.items.length > 0)
  }, [category, sortMode, filtered])

  return { category, sortMode, viewMode, setCategory, setSortMode, setViewMode, filtered, grouped }
}

function PeerRatesPanel({ peers }: { peers: AchievementPeerRate[] }) {
  const { t } = useI18n()
  if (!peers.length) return null
  return (
    <section className={[uiGlassCard, 'space-y-2 p-3'].join(' ')}>
      <h3 className="text-sm font-semibold">{t('achievements.peerRates')}</h3>
      <ol className="space-y-1.5">
        {peers.slice(0, 8).map((peer, index) => (
          <li
            key={peer.playerId}
            className="achievement-rate-row relative overflow-hidden rounded-lg border border-[var(--ui-border)]"
          >
            <div className="achievement-rate-fill" style={{ width: `${peer.rate}%` }} />
            <div className="achievement-rate-content flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-medium">
                {index + 1}. {peer.name}
              </span>
              <span className="font-bold text-brand-400">{peer.rate}%</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Compact horizontal rail — shows recently unlocked achievements. */
export function AchievementsPreviewRail({
  achievements,
  onOpenAll,
}: {
  achievements: AchievementProgress[]
  onOpenAll?: () => void
}) {
  const { language, t } = useI18n()
  const [detail, setDetail] = useState<AchievementProgress | null>(null)
  const recent = getRecentAchievementProgress(achievements, 8)
  const unlocked = achievements.filter((item) => item.currentLevel > 0).length
  const playerRate =
    achievements.length > 0
      ? Math.round((unlocked / achievements.length) * 1000) / 10
      : 0

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{t('achievements.recentTitle')}</h2>
        <button
          type="button"
          className="text-xs font-semibold text-brand-400"
          onClick={() => {
            playInteractionSound('tap')
            onOpenAll?.()
          }}
        >
          {unlocked}/{achievements.length} ({playerRate}%) · {t('achievements.viewAll')}
        </button>
      </div>
      {recent.length ? (
        <div className="-mx-[var(--ui-page-px)] flex gap-2 overflow-x-auto px-[var(--ui-page-px)] pb-1 scrollbar-none">
          {recent.map((item) => (
            <AchievementCard
              key={item.definition.id}
              item={item}
              language={language}
              compact
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">{t('achievements.recentEmpty')}</p>
      )}
      <AchievementDetailSheet
        item={detail}
        language={language}
        playerCompletionRate={playerRate}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      />
    </section>
  )
}

export function AchievementsWall({
  achievements,
  playerCompletionRate,
  peerRates = [],
}: {
  achievements: AchievementProgress[]
  playerCompletionRate?: number
  peerRates?: AchievementPeerRate[]
}) {
  const { language, t } = useI18n()
  const [detail, setDetail] = useState<AchievementProgress | null>(null)
  const { category, sortMode, viewMode, setCategory, setSortMode, setViewMode, filtered, grouped } =
    useFilteredAchievements(achievements)
  const unlocked = achievements.filter((item) => item.currentLevel > 0).length
  const completion =
    playerCompletionRate ??
    (achievements.length ? Math.round((unlocked / achievements.length) * 1000) / 10 : 0)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className={uiSectionTitle}>{t('achievements.title')}</h2>
        <span className="rounded-md border border-[var(--ui-border)] bg-surface-muted/40 px-2 py-1 text-xs text-text-secondary">
          {unlocked}/{achievements.length} · {completion}%
        </span>
      </div>
      <PeerRatesPanel peers={peerRates} />
      <AchievementFilters
        category={category}
        sortMode={sortMode}
        viewMode={viewMode}
        onCategoryChange={setCategory}
        onSortChange={setSortMode}
        onViewModeChange={setViewMode}
      />
      {grouped ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t(CATEGORY_LABEL_KEY[group.category])}
              </h3>
              {viewMode === 'list' ? (
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <AchievementRateRow
                      key={item.definition.id}
                      item={item}
                      language={language}
                      onClick={() => setDetail(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((item) => (
                    <AchievementCard
                      key={item.definition.id}
                      item={item}
                      language={language}
                      showGlobalRate
                      onClick={() => setDetail(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filtered.map((item) => (
            <AchievementRateRow
              key={item.definition.id}
              item={item}
              language={language}
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((item) => (
            <AchievementCard
              key={item.definition.id}
              item={item}
              language={language}
              showGlobalRate
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      )}
      <AchievementDetailSheet
        item={detail}
        language={language}
        playerCompletionRate={completion}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      />
    </section>
  )
}

export function formatAchievementToastForUnlock(
  achievementId: string,
  level: number,
  language: Language,
): string {
  return formatAchievementToast(achievementId, level, language)
}
