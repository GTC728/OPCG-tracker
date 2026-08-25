import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ja } from '@/i18n/ja'
import { zhHans } from '@/i18n/zh-Hans'
import { zhHant } from '@/i18n/zh-Hant'
import { resolveMatchRecordSides } from '@/lib/matchRecordSides'
import {
  lockPageDragAxis,
  NESTED_HORIZONTAL_GESTURE_SELECTOR,
  rubberBandPageOffset,
  settlePageDrag,
} from '@/lib/pageCarousel'
import { clampPage, getPageCount, slicePage, visiblePageWindow } from '@/lib/pagination'
import { formatWinLossRecord } from '@/lib/winLossRecord'

describe('formatWinLossRecord', () => {
  it('always uses 0W-0L', () => {
    expect(formatWinLossRecord(0, 0)).toBe('0W-0L')
    expect(formatWinLossRecord(14, 8)).toBe('14W-8L')
  })
})

describe('pagination', () => {
  it('counts pages with a minimum of 1', () => {
    expect(getPageCount(0, 10)).toBe(1)
    expect(getPageCount(10, 10)).toBe(1)
    expect(getPageCount(11, 10)).toBe(2)
  })

  it('clamps page into range', () => {
    expect(clampPage(0, 3)).toBe(1)
    expect(clampPage(9, 3)).toBe(3)
    expect(clampPage(2.8, 4)).toBe(2)
  })

  it('slices a 10-item page', () => {
    const items = Array.from({ length: 23 }, (_, index) => index + 1)
    expect(slicePage(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(slicePage(items, 3, 10)).toEqual([21, 22, 23])
  })

  it('windows page numbers around the current page', () => {
    expect(visiblePageWindow(1, 3)).toEqual([1, 2, 3])
    expect(visiblePageWindow(4, 10, 5)).toEqual([2, 3, 4, 5, 6])
    expect(visiblePageWindow(10, 10, 5)).toEqual([6, 7, 8, 9, 10])
  })

  it('keeps overlay pager arrows on opposite sides', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')
    expect(css).toMatch(/\.ui-floating-pager-btn--prev\s*\{[^}]*left:\s*0\.25rem/)
    expect(css).toMatch(/\.ui-floating-pager-btn--next\s*\{[^}]*right:\s*0\.25rem/)
  })

  it('does not inset lists to make room for overlay arrows', () => {
    const paged = readFileSync(resolve(__dirname, '../../components/ui/PagedList.tsx'), 'utf8')
    const ranks = readFileSync(resolve(__dirname, '../../components/stats/StatsOverviewPanel.tsx'), 'utf8')
    expect(paged).not.toContain('px-11')
    expect(ranks).not.toContain('px-11')
  })

  it('keeps sheet frost off the transformed enter animation', () => {
    const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')
    expect(css).toContain('--ui-frost-fill-sheet: color-mix(in srgb, var(--color-surface-elevated) 94%')
    expect(css).toContain('.ui-sheet-frost {')
    expect(css).toMatch(/\.ui-sheet-panel-body\s*\{[^}]*ui-sheet-panel-in/)
    expect(css).not.toMatch(/\.ui-sheet-panel\s*\{[^}]*ui-sheet-panel-in/)
    expect(css).toMatch(/\.ui-sheet-root--out \.ui-sheet-panel-body\s*\{[^}]*ui-sheet-panel-out/)
    expect(css).not.toMatch(/\.ui-sheet-root--out \.ui-sheet-panel\s*\{[^}]*ui-sheet-panel-out/)
  })
})

describe('page-snap carousel', () => {
  it('locks horizontal vs vertical after a short slop', () => {
    expect(lockPageDragAxis(4, 4)).toBeNull()
    expect(lockPageDragAxis(24, 6)).toBe('h')
    expect(lockPageDragAxis(6, 24)).toBe('v')
  })

  it('rubber-bands at the first and last page', () => {
    expect(rubberBandPageOffset(-100, true, false)).toBeCloseTo(-32)
    expect(rubberBandPageOffset(100, false, true)).toBeCloseTo(32)
    expect(rubberBandPageOffset(-100, true, true)).toBe(-100)
  })

  it('snaps when dragged far enough or flicked', () => {
    expect(
      settlePageDrag({ offsetX: -40, velocityX: 0, width: 400, canPrev: true, canNext: true }),
    ).toBe('stay')
    expect(
      settlePageDrag({ offsetX: -120, velocityX: 0, width: 400, canPrev: true, canNext: true }),
    ).toBe('next')
    expect(
      settlePageDrag({ offsetX: 120, velocityX: 0, width: 400, canPrev: true, canNext: true }),
    ).toBe('prev')
    expect(
      settlePageDrag({ offsetX: -20, velocityX: -0.7, width: 400, canPrev: true, canNext: true }),
    ).toBe('next')
    expect(
      settlePageDrag({ offsetX: -200, velocityX: 0, width: 400, canPrev: true, canNext: false }),
    ).toBe('stay')
  })

  it('does not steal nested horizontal carousels or rails', () => {
    expect(NESTED_HORIZONTAL_GESTURE_SELECTOR).toContain('.ui-page-snap')
    expect(NESTED_HORIZONTAL_GESTURE_SELECTOR).toContain('.ui-scroll-region-x')
    expect(NESTED_HORIZONTAL_GESTURE_SELECTOR).toContain('[data-no-tab-swipe]')
    const app = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8')
    expect(app).toContain('TabPager')
    expect(app).toContain("['record', 'stats', 'history', 'settings']")
  })
})

describe('i18n keys', () => {
  it('keeps locale dictionaries aligned with zh-Hant', () => {
    const keys = Object.keys(zhHant).sort()
    expect(Object.keys(en).sort()).toEqual(keys)
    expect(Object.keys(zhHans).sort()).toEqual(keys)
    expect(Object.keys(ja).sort()).toEqual(keys)
  })
})

describe('resolveMatchRecordSides', () => {
  const match = {
    player1Id: 'p1',
    player2Id: 'p2',
    deck1Id: 'd1',
    deck2Id: 'd2',
  }

  it('keeps table order without a perspective player', () => {
    expect(resolveMatchRecordSides(match)).toEqual({
      left: { playerId: 'p1', deckId: 'd1' },
      right: { playerId: 'p2', deckId: 'd2' },
    })
  })

  it('puts the inspected player on the left', () => {
    expect(resolveMatchRecordSides(match, 'p2').left.playerId).toBe('p2')
    expect(resolveMatchRecordSides(match, 'p1').left.playerId).toBe('p1')
  })
})
