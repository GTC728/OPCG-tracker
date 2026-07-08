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
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import type { Language } from '@/types'

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
  const unlocked = item.currentLevel > 0
  const title = item.definition.title[language]
  const body = (
    <article
      className={[
        uiGlassCard,
        'flex h-full min-w-[9.5rem] flex-col p-3 text-left transition',
        unlocked ? '' : 'opacity-50',
        onClick ? 'cursor-pointer active:scale-[0.98]' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <AchievementIcon
          kind={item.definition.icon}
          category={item.definition.category}
          size={compact ? 'sm' : 'md'}
          dimmed={!unlocked}
        />
        {unlocked ? (
          <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-400">
            Lv.{item.currentLevel}
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-[11px] text-text-secondary">
        {unlocked
          ? `${item.currentLevel}/${item.maxLevel}`
          : item.nextThreshold
            ? `→ ${item.nextThreshold}`
            : '—'}
      </p>
      <div className="mt-auto pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted/60">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.round((item.currentLevel / item.maxLevel) * 100)}%` }}
          />
        </div>
      </div>
    </article>
  )

  if (!onClick) return body
  return (
    <button type="button" className="block h-full shrink-0" onClick={onClick}>
      {body}
    </button>
  )
}

function AchievementDetailSheet({
  item,
  language,
  open,
  onClose,
}: {
  item: AchievementProgress | null
  language: Language
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
        <ol className="space-y-2">
          {item.definition.tiers.map((tier) => {
            const done = item.currentLevel >= tier.level
            return (
              <li
                key={tier.level}
                className={[
                  'flex items-center justify-between rounded-lg px-3 py-2 ring-1',
                  done ? 'bg-success/10 ring-success/25' : 'bg-surface/40 ring-white/[0.06]',
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
  onCategoryChange,
  onSortChange,
}: {
  category: AchievementCategory | 'all'
  sortMode: AchievementSortMode
  onCategoryChange: (value: AchievementCategory | 'all') => void
  onSortChange: (value: AchievementSortMode) => void
}) {
  const { t } = useI18n()
  const categories: Array<AchievementCategory | 'all'> = ['all', ...ACHIEVEMENT_CATEGORY_ORDER]
  const sortModes: AchievementSortMode[] = ['ease', 'progress', 'category', 'name']

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={[
              'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition',
              category === cat
                ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                : 'bg-surface-muted/40 text-text-secondary',
            ].join(' ')}
          >
            {cat === 'all' ? t('achievements.filter.all') : t(CATEGORY_LABEL_KEY[cat])}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-secondary">{t('achievements.sort.label')}</span>
        <select
          value={sortMode}
          onChange={(event) => onSortChange(event.target.value as AchievementSortMode)}
          className="rounded-lg bg-surface-muted/50 px-2 py-1 text-xs font-medium text-text-primary ring-1 ring-white/[0.06]"
        >
          {sortModes.map((mode) => (
            <option key={mode} value={mode}>
              {t(`achievements.sort.${mode}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function useFilteredAchievements(achievements: AchievementProgress[]) {
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')
  const [sortMode, setSortMode] = useState<AchievementSortMode>('ease')

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

  return { category, sortMode, setCategory, setSortMode, filtered, grouped }
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

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{t('achievements.recentTitle')}</h2>
        <button
          type="button"
          className="text-xs font-semibold text-brand-400"
          onClick={onOpenAll}
        >
          {unlocked}/{achievements.length} · {t('achievements.viewAll')}
        </button>
      </div>
      {recent.length ? (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
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
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      />
    </section>
  )
}

export function AchievementsWall({ achievements }: { achievements: AchievementProgress[] }) {
  const { language, t } = useI18n()
  const [detail, setDetail] = useState<AchievementProgress | null>(null)
  const { category, sortMode, setCategory, setSortMode, filtered, grouped } =
    useFilteredAchievements(achievements)
  const unlocked = achievements.filter((item) => item.currentLevel > 0).length

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={uiSectionTitle}>{t('achievements.title')}</h2>
        <span className="rounded-md bg-surface-muted/40 px-2 py-1 text-xs text-text-secondary">
          {unlocked}/{achievements.length}
        </span>
      </div>
      <AchievementFilters
        category={category}
        sortMode={sortMode}
        onCategoryChange={setCategory}
        onSortChange={setSortMode}
      />
      {grouped ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {t(CATEGORY_LABEL_KEY[group.category])}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.items.map((item) => (
                  <AchievementCard
                    key={item.definition.id}
                    item={item}
                    language={language}
                    onClick={() => setDetail(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((item) => (
            <AchievementCard
              key={item.definition.id}
              item={item}
              language={language}
              onClick={() => setDetail(item)}
            />
          ))}
        </div>
      )}
      <AchievementDetailSheet
        item={detail}
        language={language}
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
