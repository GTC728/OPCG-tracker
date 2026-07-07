import type { AccentPreset, ThemeMode } from '@/types'

const accentPalettes: Record<
  AccentPreset,
  { 400: string; 500: string; 600: string; 700: string; 100: string }
> = {
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 100: '#dbeafe' },
  red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 100: '#fee2e2' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 100: '#dcfce7' },
  purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 100: '#f3e8ff' },
  gold: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 100: '#fef3c7' },
}

const darkSurfaces = {
  surface: '#0b1220',
  elevated: '#151f32',
  muted: '#2a3548',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
}

const lightSurfaces = {
  surface: '#eef2f7',
  elevated: '#ffffff',
  muted: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
}

function resolveThemeMode(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

export function applyThemeSettings(theme: ThemeMode, accent: AccentPreset): () => void {
  const root = document.documentElement
  const resolved = resolveThemeMode(theme)
  const surfaces = resolved === 'light' ? lightSurfaces : darkSurfaces
  const palette = accentPalettes[accent]

  root.dataset.theme = resolved
  root.dataset.accent = accent
  root.style.setProperty('--color-surface', surfaces.surface)
  root.style.setProperty('--color-surface-elevated', surfaces.elevated)
  root.style.setProperty('--color-surface-muted', surfaces.muted)
  root.style.setProperty('--color-text-primary', surfaces.textPrimary)
  root.style.setProperty('--color-text-secondary', surfaces.textSecondary)
  root.style.setProperty('--color-brand-400', palette[400])
  root.style.setProperty('--color-brand-500', palette[500])
  root.style.setProperty('--color-brand-600', palette[600])
  root.style.setProperty('--color-brand-700', palette[700])
  root.style.setProperty('--color-brand-100', palette[100])

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', surfaces.surface)

  if (theme !== 'system') return () => undefined

  const media = window.matchMedia('(prefers-color-scheme: light)')
  const listener = () => applyThemeSettings('system', accent)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export const accentOptions: Array<{ value: AccentPreset; labelKey: string; swatch: string }> = [
  { value: 'blue', labelKey: 'appearance.accentBlue', swatch: '#3b82f6' },
  { value: 'red', labelKey: 'appearance.accentRed', swatch: '#ef4444' },
  { value: 'green', labelKey: 'appearance.accentGreen', swatch: '#22c55e' },
  { value: 'purple', labelKey: 'appearance.accentPurple', swatch: '#a855f7' },
  { value: 'gold', labelKey: 'appearance.accentGold', swatch: '#f59e0b' },
]
