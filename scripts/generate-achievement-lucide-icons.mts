/**
 * Emits per-achievement Lucide icon map.
 * Run: npx tsx scripts/generate-achievement-lucide-icons.mts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const SEMANTIC: Record<string, string> = {
  veteran: 'ScrollText',
  first_win: 'Star',
  win_streak: 'Flame',
  deck_specialist: 'Layers',
  meta_explorer: 'Compass',
  set_collector: 'Package',
  mono_maniac: 'Circle',
  rival_bond: 'Swords',
  group_star: 'Users',
  session_marathon: 'Timer',
  note_poet: 'PenLine',
  comeback: 'RotateCcw',
  perfect_session: 'Crown',
  first_player_king: 'Zap',
  giant_slayer: 'Shield',
  color_spectrum: 'Palette',
  second_striker: 'Target',
  upset_alarm: 'TrendingUp',
  mirror_master: 'Copy',
  meta_breaker: 'Hammer',
  revenge_win: 'Skull',
  underdog: 'Dog',
  weekend_warrior: 'Calendar',
  rainbow_session: 'Rainbow',
  achievement_hunter: 'Trophy',
  centurion_wins: 'Medal',
  iron_win_rate: 'Percent',
  rematch_king: 'Repeat',
  leader_collector: 'GalleryHorizontal',
  round_robin: 'Network',
  midnight_duel: 'MoonStar',
  lunch_break: 'Coffee',
  profile_linked: 'UserCheck',
  completionist_90: 'Award',
  streak_legend: 'FlameKindling',
  table_veteran: 'LayoutGrid',
  history_keeper: 'History',
  counter_pick: 'Crosshair',
  group_code_join: 'QrCode',
  data_importer: 'Upload',
  cloud_guardian: 'Cloud',
  hunter_75: 'Search',
}

const POOL = [
  'Activity', 'Airplay', 'AlarmClock', 'Album', 'Anchor', 'Aperture', 'Archive', 'ArchiveRestore',
  'Armchair', 'ArrowBigUp', 'ArrowLeftRight', 'Atom', 'Award', 'Axe', 'Backpack', 'Badge',
  'BadgeCheck', 'Banknote', 'BarChart3', 'Bath', 'Battery', 'Beaker', 'Bell', 'Beer', 'Binary',
  'Bike', 'Bird', 'Blocks', 'Bolt', 'Book', 'BookOpen', 'Bookmark', 'Bot', 'Box', 'Boxes',
  'Brain', 'Brush', 'Building', 'Bus', 'Cake', 'Calculator', 'Calendar', 'CalendarCheck',
  'CalendarCheck2', 'CalendarDays', 'CalendarHeart', 'CalendarRange', 'Camera', 'Car', 'Cast',
  'CheckCheck', 'Circle', 'CircleCheckBig', 'CircleDot', 'CircleStop', 'Clock',
  'CloudRain', 'Code', 'Coffee', 'Coins', 'Command', 'Compass', 'Construction', 'Contrast',
  'Copy', 'Cpu', 'CreditCard', 'Crosshair', 'Crown', 'Database', 'Dice5', 'Dices', 'Diamond',
  'Disc', 'Dog', 'DoorOpen', 'Droplet', 'Ear', 'Earth', 'Eclipse', 'Egg', 'Eye', 'Factory',
  'FastForward', 'Feather', 'File', 'FileCheck', 'FileSpreadsheet', 'Film', 'Fingerprint',
  'Flag', 'Flame', 'FlameKindling', 'FlipHorizontal', 'FlipVertical', 'Flower2', 'Folder',
  'FolderPlus', 'Footprints', 'Forward', 'Gauge', 'Gem', 'Ghost', 'Gift', 'Glasses', 'Globe',
  'GraduationCap', 'Grid2x2', 'Grid3x3', 'Hammer', 'HandMetal', 'Hash', 'Headphones', 'Heart',
  'HeartCrack', 'HeartHandshake', 'Heater', 'History', 'Home', 'Hourglass', 'IceCreamCone',
  'Image', 'Inbox', 'Infinity', 'Joystick', 'Kanban', 'Key', 'LampDesk', 'Landmark', 'Layers2',
  'LayoutDashboard', 'LayoutGrid', 'LayoutList', 'Leaf', 'Library', 'LibraryBig', 'LifeBuoy',
  'Lightbulb', 'LineChart', 'Link', 'Link2', 'List', 'Locate', 'Lock', 'LogOut', 'Magnet',
  'Mail', 'Map', 'MapPin', 'Medal', 'Megaphone', 'MessageSquare', 'Mic', 'Microscope',
  'Milestone', 'Minus', 'Monitor', 'Moon', 'MoonStar', 'Mountain', 'Music', 'Network',
  'Newspaper', 'Notebook', 'Orbit', 'PackageOpen', 'Paintbrush', 'Palette', 'PartyPopper',
  'PenLine', 'Pencil', 'Percent', 'PieChart', 'Pin', 'Plane', 'Play', 'PlayCircle', 'Plug',
  'Pocket', 'Pointer', 'Presentation', 'Printer', 'Puzzle', 'QrCode', 'Radar', 'Radio',
  'Rainbow', 'Receipt', 'RefreshCcw', 'RefreshCw', 'Repeat', 'Rocket', 'RotateCcw', 'RotateCw',
  'Route', 'Ruler', 'Sailboat', 'Save', 'Scale', 'Scan', 'ScanSearch', 'School', 'Scissors',
  'Scroll', 'ScrollText', 'Search', 'Send', 'Server', 'Settings', 'Shapes', 'Share2', 'Sheet',
  'Shield', 'ShieldHalf', 'ShieldOff', 'Ship', 'Shirt', 'Shuffle', 'Signpost', 'Skull', 'Slice',
  'Smartphone', 'Smile', 'Snowflake', 'Sparkle', 'Sparkles', 'Speech', 'Spline', 'SquareCheck',
  'Stamp', 'Star', 'Store', 'Sun', 'SunMedium', 'SunMoon', 'Sunrise', 'Sunset', 'Sword',
  'Swords', 'Table', 'Table2', 'Tablet', 'Tag', 'Target', 'Telescope', 'Tent', 'Terminal',
  'TestTube', 'Thermometer', 'ThermometerSun', 'ThumbsUp', 'Ticket', 'TicketCheck', 'Timer',
  'TimerReset', 'TrainFront', 'Trash2', 'TreeDeciduous', 'TrendingDown', 'TrendingUp',
  'Triangle', 'TriangleAlert', 'Trophy', 'Truck', 'Turtle', 'Tv', 'Umbrella', 'Undo', 'Undo2',
  'Unlink', 'Unlock', 'Upload', 'UserCheck', 'UserPlus', 'UserRound', 'Users', 'UsersRound',
  'Utensils', 'Vault', 'Video', 'View', 'VolumeX', 'Wallet', 'Wand', 'Watch', 'Waves',
  'Webhook', 'Weight', 'Wifi', 'Wind', 'Wine', 'Workflow', 'Wrench', 'Zap', 'ZoomIn',
]

function collectIds(): string[] {
  const ids = new Set<string>()
  for (const rel of [
    'src/lib/achievements.ts',
    'src/lib/achievementsExtra.ts',
    'src/lib/achievementsBacklogBatch.ts',
    'src/data/achievementBacklogRemainingCatalog.generated.ts',
  ]) {
    const src = readFileSync(join(root, rel), 'utf8')
    const re = /id: '([a-z0-9_]+)'/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) ids.add(m[1])
  }
  return [...ids].sort()
}

const ids = collectIds()
const assigned = new Map<string, string>()
const used = new Set<string>()

for (const id of ids) {
  const semantic = SEMANTIC[id]
  if (semantic && !used.has(semantic)) {
    assigned.set(id, semantic)
    used.add(semantic)
  }
}

let poolIdx = 0
for (const id of ids) {
  if (assigned.has(id)) continue
  while (poolIdx < POOL.length && used.has(POOL[poolIdx])) poolIdx += 1
  const icon = POOL[poolIdx] ?? 'Star'
  assigned.set(id, icon)
  used.add(icon)
  poolIdx += 1
}

const usedIcons = [...new Set([...assigned.values(), ...Object.values({
  Medal: 'Medal', Flame: 'Flame', Layers: 'Layers', Compass: 'Compass', Package: 'Package',
  Swords: 'Swords', Crown: 'Crown', Palette: 'Palette', Zap: 'Zap', Star: 'Star',
  Anchor: 'Anchor', Trophy: 'Trophy', Moon: 'Moon', Sparkles: 'Sparkles', Shield: 'Shield',
  RefreshCw: 'RefreshCw', Milestone: 'Milestone', Crosshair: 'Crosshair', Users: 'Users',
})])].sort()
const importLine = `import { ${usedIcons.join(', ')}, type LucideIcon } from 'lucide-react'`
const iconsObj = usedIcons.map((n) => `  ${n},`).join('\n')
const mapLines = [...assigned.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, icon]) => `  ${JSON.stringify(id)}: '${icon}',`)

const out = `/** AUTO-GENERATED — do not edit by hand. Run: npx tsx scripts/generate-achievement-lucide-icons.mts */
${importLine}
import type { AchievementIconKind } from '@/lib/achievements'

const ICONS = {
${iconsObj}
} as const satisfies Record<string, LucideIcon>

export const ACHIEVEMENT_LUCIDE_MAP: Record<string, keyof typeof ICONS> = {
${mapLines.join('\n')}
}

const KIND_FALLBACK: Record<AchievementIconKind, keyof typeof ICONS> = {
  medal: 'Medal',
  flame: 'Flame',
  cards: 'Layers',
  compass: 'Compass',
  package: 'Package',
  swords: 'Swords',
  crown: 'Crown',
  palette: 'Palette',
  bolt: 'Zap',
  star: 'Star',
  anchor: 'Anchor',
  trophy: 'Trophy',
  moon: 'Moon',
  sparkles: 'Sparkles',
  shield: 'Shield',
  refresh: 'RefreshCw',
}

const CATEGORY_FALLBACK: Record<string, keyof typeof ICONS> = {
  milestone: 'Milestone',
  streak: 'Flame',
  skill: 'Crosshair',
  meta: 'Compass',
  social: 'Users',
  fun: 'Sparkles',
}

export function resolveAchievementLucideIcon(
  achievementId: string,
  kind?: AchievementIconKind,
  category?: string,
): LucideIcon {
  const key =
    ACHIEVEMENT_LUCIDE_MAP[achievementId] ??
    (kind ? KIND_FALLBACK[kind] : undefined) ??
    CATEGORY_FALLBACK[category ?? 'milestone'] ??
    'Star'
  return ICONS[key as keyof typeof ICONS] ?? ICONS.Star
}
`

writeFileSync(join(root, 'src/lib/achievementLucideIcons.generated.ts'), out)
console.log(`Generated Lucide map for ${assigned.size} achievements (${usedIcons.length} unique icons).`)
