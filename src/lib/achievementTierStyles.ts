/** Reusable tier metal palette — maps tier index to visual style (ranking-inspired). */

export interface TierMetalStyle {
  id: string
  fill: string
  border: string
  text: string
  glow: string
}

const METALS: TierMetalStyle[] = [
  {
    id: 'bronze',
    fill: 'linear-gradient(135deg, #b45309 0%, #d97706 45%, #92400e 100%)',
    border: '#b45309',
    text: '#fef3c7',
    glow: 'rgba(217, 119, 6, 0.35)',
  },
  {
    id: 'silver',
    fill: 'linear-gradient(135deg, #64748b 0%, #cbd5e1 50%, #475569 100%)',
    border: '#94a3b8',
    text: '#f8fafc',
    glow: 'rgba(148, 163, 184, 0.35)',
  },
  {
    id: 'gold',
    fill: 'linear-gradient(135deg, #ca8a04 0%, #facc15 50%, #a16207 100%)',
    border: '#eab308',
    text: '#422006',
    glow: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 'platinum',
    fill: 'linear-gradient(135deg, #0891b2 0%, #67e8f9 50%, #0e7490 100%)',
    border: '#22d3ee',
    text: '#083344',
    glow: 'rgba(34, 211, 238, 0.35)',
  },
  {
    id: 'diamond',
    fill: 'linear-gradient(135deg, #7c3aed 0%, #c4b5fd 50%, #5b21b6 100%)',
    border: '#a78bfa',
    text: '#2e1065',
    glow: 'rgba(167, 139, 250, 0.4)',
  },
]

export function getTierMetalStyle(tierLevel: number, maxTiers: number): TierMetalStyle {
  if (maxTiers <= 1) return METALS[2]
  const index = Math.min(Math.max(tierLevel - 1, 0), METALS.length - 1)
  const scaled =
    maxTiers <= METALS.length
      ? index
      : Math.min(METALS.length - 1, Math.floor(((tierLevel - 1) / (maxTiers - 1)) * (METALS.length - 1)))
  return METALS[scaled]
}

export function getHighestUnlockedMetal(currentLevel: number, maxLevel: number): TierMetalStyle | null {
  if (currentLevel <= 0) return null
  return getTierMetalStyle(currentLevel, maxLevel)
}
