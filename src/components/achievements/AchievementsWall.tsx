import { useMemo, useState } from 'react'
import { AchievementCommunitySheet } from '@/components/achievements/AchievementCommunitySheet'
import { AchievementIcon } from '@/components/achievements/AchievementIcon'
import { AchievementTierBar } from '@/components/achievements/AchievementTierBar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  ACHIEVEMENT_CATEGORY_ORDER,
  computeGlobalAchievementRates,
  computeAchievementSummary,
  filterAchievementProgress,
  formatAchievementToast,
  getAchievementPreviewItems,
  getPlayerAchievementProgress,
  sortAchievementProgress,
  type AchievementCategory,
  type AchievementPeerRate,
  type AchievementProgress,
  type AchievementSortMode,
} from '@/lib/achievements'
import { getHighestUnlockedMetal } from '@/lib/achievementTierStyles'
import { playInteractionSound, uiPopIn, uiPressable } from '@/lib/motion'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { uiGlassCard, uiHorizontalRail, uiHorizontalRailItem, uiLink, uiSectionTitle } from '@/lib/uiSurface'
import type { AchievementUnlock, Deck, Language, Match, Player } from '@/types'

export type { AchievementPeerRate }

export interface AchievementPeerContext {
  players: Player[]
  decks: Deck[]
  matches: Match[]
  achievementUnlocks: AchievementUnlock[]
  currentPlayerId: string
}

function AchievementCard({
  item,
  language,
  compact = false,
  onClick,
}: {
  item: AchievementProgress
  language: Language
  compact?: boolean
  onClick?: () => void
}) {
  const { t } = useI18n()
  const unlocked = item.currentLevel > 0
  const title = item.definition.title[language]
  const metal = getHighestUnlockedMetal(item.currentLevel, item.maxLevel)
  const body = (
    <article
      className={[
        uiGlassCard,
        uiPopIn,
        'flex h-full flex-col overflow-hidden p-3 text-left',
        unlocked ? '' : 'opacity-55',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
      style={
        metal
          ? compact
            ? { boxShadow: `inset 0 0 0 1px ${metal.border}` }
            : { boxShadow: `0 0 0 1px ${metal.border}, 0 4px 14px ${metal.glow}` }
          : undefined
      }
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
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={
                metal
                  ? { background: metal.fill, color: metal.text, border: `1px solid ${metal.border}` }
                  : undefined
              }
            >
              Lv.{item.currentLevel}/{item.maxLevel}
            </span>
          ) : null}
        </div>
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[11px] text-text-secondary">
        {unlocked
          ? item.nextThreshold
            ? `→ ${item.nextThreshold}`
            : t('achievements.maxTier')
          : item.nextThreshold
            ? `→ ${item.nextThreshold}`
            : '—'}
      </p>
      <div className="mt-auto pt-2">
        <AchievementTierBar currentLevel={item.currentLevel} maxLevel={item.maxLevel} size="sm" />
      </div>
    </article>
  )

  if (!onClick) return body
  return (
    <button
      type="button"
      className={['block h-full', compact ? uiHorizontalRailItem : 'min-w-[9.5rem] shrink-0', uiPressable].join(' ')}
      onClick={onClick}
    >
      {body}
    </button>
  )
}

function AchievementListRow({
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
  const metal = getHighestUnlockedMetal(item.currentLevel, item.maxLevel)

  return (
    <button
      type="button"
      className={[
        'w-full rounded-lg border border-[var(--ui-border)] bg-[var(--glass-inset-bg)] text-left',
        uiPressable,
      ].join(' ')}
      onClick={() => {
        playInteractionSound('tap')
        onClick()
      }}
      style={metal ? { boxShadow: `inset 0 0 0 1px ${metal.border}` } : undefined}
    >
      <div className="flex items-start gap-3 p-3">
        <AchievementIcon
          kind={item.definition.icon}
          category={item.definition.category}
          size="sm"
          dimmed={item.currentLevel <= 0}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{desc}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {item.currentLevel > 0 ? (
                <span className="text-[11px] font-bold text-brand-400">
                  Lv.{item.currentLevel}/{item.maxLevel}
                </span>
              ) : (
                <span className="text-[11px] text-text-secondary">{t('achievements.notUnlocked')}</span>
              )}
              {item.maxLevel > 1 ? (
                <span className="text-[10px] text-text-secondary">
                  {Math.round((item.currentLevel / item.maxLevel) * 100)}%
                </span>
              ) : null}
            </div>
          </div>
          <AchievementTierBar currentLevel={item.currentLevel} maxLevel={item.maxLevel} />
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
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-secondary">{desc}</p>
            <div className="mt-2">
              <AchievementTierBar currentLevel={item.currentLevel} maxLevel={item.maxLevel} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <article className={[uiGlassCard, 'p-3'].join(' ')}>
            <p className="text-[10px] uppercase text-text-secondary">{t('achievements.globalRate')}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-text-secondary">{t('achievements.globalRateHint')}</p>
            <p className="mt-1 text-xl font-bold text-brand-400">{item.globalRate}%</p>
          </article>
          {playerCompletionRate != null ? (
            <article className={[uiGlassCard, 'p-3'].join(' ')}>
              <p className="text-[10px] uppercase text-text-secondary">{t('achievements.tierProgress')}</p>
              <p className="mt-1 text-xl font-bold">{playerCompletionRate}%</p>
            </article>
          ) : null}
        </div>
        <ol className="space-y-2">
          {item.definition.tiers.map((tier) => {
            const done = item.currentLevel >= tier.level
            const metal = getHighestUnlockedMetal(tier.level, item.maxLevel)
            return (
              <li
                key={tier.level}
                className={[
                  'flex items-center justify-between rounded-lg border px-3 py-2',
                  done ? '' : 'border-[var(--ui-border)] bg-surface/40',
                ].join(' ')}
                style={
                  done && metal
                    ? {
                        background: `color-mix(in srgb, ${metal.border} 18%, transparent)`,
                        borderColor: metal.border,
                      }
                    : undefined
                }
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
  onOpenCommunity,
  showCommunityLink,
}: {
  category: AchievementCategory | 'all'
  sortMode: AchievementSortMode
  viewMode: 'grid' | 'list'
  onCategoryChange: (value: AchievementCategory | 'all') => void
  onSortChange: (value: AchievementSortMode) => void
  onViewModeChange: (value: 'grid' | 'list') => void
  onOpenCommunity?: () => void
  showCommunityLink?: boolean
}) {
  const { t } = useI18n()
  const categories: Array<AchievementCategory | 'all'> = ['all', ...ACHIEVEMENT_CATEGORY_ORDER]
  const sortModes: AchievementSortMode[] = ['progress', 'name', 'category', 'global', 'ease']

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
              'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold',
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
          className={['rounded-lg border border-[var(--ui-border)] bg-surface-muted/50 px-2 py-1 text-xs font-medium text-text-primary', uiPressable].join(' ')}
        >
          {sortModes.map((mode) => (
            <option key={mode} value={mode}>
              {t(`achievements.sort.${mode}` as TranslationKey)}
            </option>
          ))}
        </select>
        {showCommunityLink && onOpenCommunity ? (
          <button
            type="button"
            className={[
              'rounded-lg border border-[var(--ui-border)] bg-surface-muted/40 px-2 py-1 text-[11px] font-semibold text-brand-400',
              uiPressable,
            ].join(' ')}
            onClick={() => {
              playInteractionSound('tap')
              onOpenCommunity()
            }}
          >
            {t('achievements.communityData')}
          </button>
        ) : null}
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
  const [sortMode, setSortMode] = useState<AchievementSortMode>('progress')
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

function AchievementGrid({
  items,
  language,
  viewMode,
  onSelect,
}: {
  items: AchievementProgress[]
  language: Language
  viewMode: 'grid' | 'list'
  onSelect: (item: AchievementProgress) => void
}) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <AchievementListRow
            key={item.definition.id}
            item={item}
            language={language}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <AchievementCard
          key={item.definition.id}
          item={item}
          language={language}
          onClick={() => {
            playInteractionSound('tap')
            onSelect(item)
          }}
        />
      ))}
    </div>
  )
}

/** Compact horizontal rail — recently unlocked, or top highlights as fallback. */
export function AchievementsPreviewRail({
  achievements,
  onOpenAll,
  variant = 'default',
}: {
  achievements: AchievementProgress[]
  onOpenAll?: () => void
  variant?: 'default' | 'profile'
}) {
  const { language, t } = useI18n()
  const [detail, setDetail] = useState<AchievementProgress | null>(null)
  const preview = getAchievementPreviewItems(achievements, 8)
  const summary = computeAchievementSummary(achievements)
  const title =
    variant === 'profile'
      ? t('achievements.title')
      : preview.mode === 'recent'
        ? t('achievements.recentTitle')
        : t('achievements.highlightsTitle')

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className={uiSectionTitle}>{title}</h2>
        <button
          type="button"
          className={['shrink-0 text-right text-[11px] font-semibold leading-tight', uiLink, uiPressable].join(' ')}
          onClick={() => {
            playInteractionSound('tap')
            onOpenAll?.()
          }}
        >
          <span className="block">
            {summary.familiesUnlocked}/{summary.totalFamilies} · {summary.tierRate}%
          </span>
          <span className="block text-[10px] font-medium text-text-secondary">{t('achievements.viewAll')}</span>
        </button>
      </div>
      {preview.items.length ? (
        <div className={uiHorizontalRail}>
          {preview.items.map((item) => (
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
        playerCompletionRate={summary.tierRate}
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
  peerContext,
}: {
  achievements: AchievementProgress[]
  playerCompletionRate?: number
  peerRates?: AchievementPeerRate[]
  peerContext?: AchievementPeerContext
}) {
  const { language, t } = useI18n()
  const [detail, setDetail] = useState<AchievementProgress | null>(null)
  const [peerViewId, setPeerViewId] = useState<string | null>(null)
  const [communityOpen, setCommunityOpen] = useState(false)

  const globalRates = useMemo(() => {
    if (!peerContext) return null
    return computeGlobalAchievementRates(peerContext.players, peerContext.decks, peerContext.matches)
  }, [peerContext])

  const activeAchievements = useMemo(() => {
    if (!peerViewId || !peerContext || !globalRates) return achievements
    return getPlayerAchievementProgress(
      peerViewId,
      peerContext.players,
      peerContext.decks,
      peerContext.matches,
      peerContext.achievementUnlocks,
      globalRates,
    )
  }, [achievements, globalRates, peerContext, peerViewId])

  const { category, sortMode, viewMode, setCategory, setSortMode, setViewMode, filtered, grouped } =
    useFilteredAchievements(activeAchievements)

  const summary = computeAchievementSummary(activeAchievements)
  const completion = playerCompletionRate ?? summary.tierRate

  const peerName = peerViewId
    ? peerContext?.players.find((player) => player.id === peerViewId)?.name
    : null

  return (
    <section className="space-y-3">
      {peerViewId && peerName ? (
        <button
          type="button"
          className={['text-sm font-semibold text-brand-400', uiPressable].join(' ')}
          onClick={() => {
            playInteractionSound('tap')
            setPeerViewId(null)
          }}
        >
          ← {t('achievements.backToMine')}
        </button>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h2 className={uiSectionTitle}>
          {peerName ? `${peerName} · ${t('achievements.title')}` : t('achievements.myTitle')}
        </h2>
        <div className="flex flex-col items-end gap-0.5">
          <span className="rounded-md border border-[var(--ui-border)] bg-surface-muted/40 px-2 py-1 text-xs text-text-secondary">
            {summary.familiesUnlocked}/{summary.totalFamilies} {t('achievements.familiesUnit')}
          </span>
          <span className="text-[10px] text-text-secondary">
            {t('achievements.tierProgress')}: {summary.tiersEarned}/{summary.totalTiers} ({summary.tierRate}%)
          </span>
        </div>
      </div>

      <AchievementFilters
        category={category}
        sortMode={sortMode}
        viewMode={viewMode}
        onCategoryChange={setCategory}
        onSortChange={setSortMode}
        onViewModeChange={setViewMode}
        showCommunityLink={!peerViewId && Boolean(peerContext)}
        onOpenCommunity={() => setCommunityOpen(true)}
      />

      <AchievementCommunitySheet
        open={communityOpen}
        onClose={() => setCommunityOpen(false)}
        peerRates={peerRates}
        peerContext={peerContext}
        onSelectPeer={setPeerViewId}
      />

      {grouped ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t(CATEGORY_LABEL_KEY[group.category])}
              </h3>
              <AchievementGrid
                items={group.items}
                language={language}
                viewMode={viewMode}
                onSelect={setDetail}
              />
            </div>
          ))}
        </div>
      ) : (
        <AchievementGrid items={filtered} language={language} viewMode={viewMode} onSelect={setDetail} />
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
