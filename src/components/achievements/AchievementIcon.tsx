import type { AchievementIconKind } from '@/lib/achievements'

const sizeMap = { sm: 20, md: 28, lg: 36 } as const

const paths: Record<AchievementIconKind, string> = {
  medal:
    'M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 16.8 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z',
  flame: 'M12 2c1 4 4 6 4 10a4 4 0 11-8 0c0-2 2-4 4-10z',
  cards: 'M4 6h12v14H4V6zm14 3h2v11h-2V9z',
  compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4 2.5 5.5L20 12l-5.5 2.5L12 20l-2.5-5.5L4 12l5.5-2.5L12 7z',
  package: 'M4 8l8-4 8 4v10l-8 4-8-4V8zm8 9 6-3V9l-6 3-6-3v5l6 3z',
  swords: 'M5 5l5 12 2-5 5-2L7 19l2-7-5-2 5-5zm14 0l-5 5 2 7-7-7 5 2-2 5 5-12z',
  crown: 'M4 18h16v2H4v-2zm1.5-8L8 12l4-7 4 7 2.5-2L20 18H4l1.5-8z',
  palette:
    'M12 3a9 9 0 100 18h1.5a2 2 0 100-4H12a5 5 0 010-10c2 0 3.5 1 4.5 2.5S18 8 18 9a3 3 0 11-6 0',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  star: 'M12 2l2.6 7.4H22l-6.2 4.5 2.4 7.1L12 17.8 5.8 21l2.4-7.1L2 9.4h7.4L12 2z',
  anchor: 'M12 2a3 3 0 110 6 3 3 0 010-6zm-7 9h2v1a7 7 0 1012 0v-1h2v1a9 9 0 11-18 0V11z',
  trophy:
    'M8 4h8v3a4 4 0 01-8 0V4zm10 0h2a2 2 0 010 4h-1.1A6 6 0 0112 14v2h3v2H9v-2h3v-2a6 6 0 01-4.9-6H6a2 2 0 010-4h2V4z',
  moon: 'M21 14.5A7.5 7.5 0 1110.5 3a6 6 0 109.5 11.5z',
  sparkles: 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
  shield: 'M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z',
  refresh: 'M4 12a8 8 0 0113.7-5.7M20 12a8 8 0 01-13.7 5.7M16 5h4V1M8 19H4v4',
}

const toneClass: Record<string, string> = {
  milestone: 'text-brand-400',
  streak: 'text-orange-400',
  meta: 'text-emerald-400',
  social: 'text-violet-400',
  fun: 'text-amber-300',
  skill: 'text-cyan-400',
}

export function AchievementIcon({
  kind,
  category = 'milestone',
  size = 'md',
  dimmed = false,
}: {
  kind: AchievementIconKind
  category?: string
  size?: keyof typeof sizeMap
  dimmed?: boolean
}) {
  const px = sizeMap[size]
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-lg bg-surface/50 ring-1 ring-white/[0.08]',
        toneClass[category] ?? 'text-brand-400',
        dimmed ? 'opacity-40 grayscale' : '',
      ].join(' ')}
      style={{ width: px + 8, height: px + 8 }}
      aria-hidden
    >
      <svg width={px} height={px} viewBox="0 0 24 24" fill="currentColor">
        <path d={paths[kind]} />
      </svg>
    </span>
  )
}
