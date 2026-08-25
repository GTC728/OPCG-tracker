import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createHistoryBackStack } from '@/lib/historyBack'
import { moveItem } from '@/lib/reorder'
import {
  easeOutCubic,
  isScrollAtTop,
  MOTION_MS,
  rubberBandDown,
  settleSheetDismiss,
  SHEET_DISMISS_RATIO,
  tweenNumber,
} from '@/lib/motionTokens'

describe('motion tokens', () => {
  it('keeps durations in a tight mobile range', () => {
    expect(MOTION_MS.press).toBe(140)
    expect(MOTION_MS.sheet).toBe(280)
    expect(MOTION_MS.push).toBe(320)
    expect(MOTION_MS.count).toBe(420)
  })

  it('eases out toward the end of a tween', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8)
    expect(tweenNumber(0, 100, 0)).toBe(0)
    expect(tweenNumber(0, 100, 1)).toBe(100)
    expect(tweenNumber(10, 20, 0.5)).toBeGreaterThan(18)
  })

  it('rubber-bands upward sheet drag and keeps downward 1:1', () => {
    expect(rubberBandDown(-100)).toBeCloseTo(-32)
    expect(rubberBandDown(80)).toBe(80)
    expect(rubberBandDown(0)).toBe(0)
  })

  it('dismisses a sheet at 28% height or a downward flick', () => {
    expect(SHEET_DISMISS_RATIO).toBe(0.28)
    expect(settleSheetDismiss({ offsetY: 100, velocityY: 0, height: 400 })).toBe('stay')
    expect(settleSheetDismiss({ offsetY: 120, velocityY: 0, height: 400 })).toBe('close')
    expect(settleSheetDismiss({ offsetY: 20, velocityY: 0.6, height: 400 })).toBe('close')
    expect(settleSheetDismiss({ offsetY: 20, velocityY: 0.2, height: 400 })).toBe('stay')
    expect(isScrollAtTop(null)).toBe(true)
  })
})

describe('motion library wiring', () => {
  const root = resolve(__dirname, '../..')

  it('exports the reusable primitives from the motion barrel', () => {
    const barrel = readFileSync(resolve(root, 'components/motion/index.ts'), 'utf8')
    expect(barrel).toContain("export { Collapse }")
    expect(barrel).toContain("export { ContextMenu")
    expect(barrel).toContain("export { CountUp }")
    expect(barrel).toContain("export { LongPress }")
    expect(barrel).toContain("export { PullRefresh }")
    expect(barrel).toContain("export { PushStage }")
    expect(barrel).toContain("export { ReorderList }")
    expect(barrel).toContain("export { Shake }")
    expect(barrel).toContain("export { Stagger }")
    expect(barrel).toContain("export { SwipeBack }")
    expect(barrel).toContain("export { SwipeDismiss }")
    expect(barrel).toContain("export { SwipeReveal }")
    expect(barrel).toContain("export { Switch }")
    expect(barrel).toContain("export { TabPager }")
    expect(barrel).toContain("export { useHistoryBack }")
    expect(barrel).toContain("export { useHotkeys }")
    expect(barrel).toContain("export { usePresence }")
    expect(barrel).toContain("export { useShakeGesture }")
    expect(barrel).toContain("export { Zoomable }")
  })

  it('does not put swipe-reveal on paged history cards', () => {
    const card = readFileSync(resolve(root, 'components/history/HistoryMatchCard.tsx'), 'utf8')
    expect(card).not.toContain('SwipeReveal')
    expect(card).toContain('Collapse')
    expect(card).toContain('LongPress')
  })

  it('does not pinch-zoom Recharts', () => {
    const pie = readFileSync(resolve(root, 'components/stats/ColorMetaPieChart.tsx'), 'utf8')
    const usage = readFileSync(resolve(root, 'components/stats/DeckUsagePieChart.tsx'), 'utf8')
    expect(pie).not.toContain('Zoomable')
    expect(usage).not.toContain('Zoomable')
  })

  it('does not apply shake-to-undo', () => {
    const app = readFileSync(resolve(root, 'App.tsx'), 'utf8')
    expect(app).not.toContain('useShakeGesture')
  })

  it('keeps canonical motion CSS classes', () => {
    const css = readFileSync(resolve(root, 'index.css'), 'utf8')
    expect(css).toContain('.ui-motion-push-in')
    expect(css).toContain('.ui-motion-shake')
    expect(css).toContain('.ui-segment-thumb')
    expect(css).toContain('.ui-sheet-grab')
    expect(css).toContain('.ui-slide-down')
    expect(css).toContain('.ui-switch--on')
    expect(css).toContain('.ui-sheet-root--held')
    expect(css).toContain('.ui-tab-snap')
    expect(css).toContain('.ui-zoom-lightbox')
  })

  it('lets PushStage opt into swipe-back', () => {
    const push = readFileSync(resolve(root, 'components/motion/PushStage.tsx'), 'utf8')
    const sheet = readFileSync(resolve(root, 'components/ui/BottomSheet.tsx'), 'utf8')
    expect(push).toContain('onBack')
    expect(push).toContain('SwipeBack')
    expect(push).toContain('useHistoryBack')
    expect(sheet).toContain('isScrollAtTop')
    expect(sheet).toContain('useHistoryBack')
    expect(sheet).not.toContain('manageScroll ? undefined : onBodyPointerDown')
  })

  it('wires pull-refresh onto tab panes and toast swipe-dismiss', () => {
    const pager = readFileSync(resolve(root, 'components/motion/TabPager.tsx'), 'utf8')
    const toast = readFileSync(resolve(root, 'components/ui/Toast.tsx'), 'utf8')
    const app = readFileSync(resolve(root, 'App.tsx'), 'utf8')
    expect(pager).toContain('PullRefresh')
    expect(toast).toContain('SwipeDismiss')
    expect(app).toContain('runGroupForegroundSync')
    expect(app).toContain('useHotkeys')
  })
})

describe('history back stack', () => {
  function fakeHistory() {
    const entries: unknown[] = ['root']
    const stackRef: { current: ReturnType<typeof createHistoryBackStack> | null } = { current: null }
    const history = {
      pushState: (data: unknown) => {
        entries.push(data)
      },
      back: () => {
        entries.pop()
        stackRef.current?.handlePopState()
      },
    }
    const stack = createHistoryBackStack(history)
    stackRef.current = stack
    return { entries, stack, history }
  }

  it('closes the top layer on popstate and restores a dummy if more remain', () => {
    const { entries, stack, history } = fakeHistory()
    const closed: string[] = []
    stack.activate(() => closed.push('drill'))
    stack.activate(() => closed.push('sheet'))
    expect(entries).toHaveLength(2)
    history.back()
    expect(closed).toEqual(['sheet'])
    expect(stack.depth()).toBe(1)
    expect(entries).toHaveLength(2)
    history.back()
    expect(closed).toEqual(['sheet', 'drill'])
    expect(stack.depth()).toBe(0)
    expect(entries).toHaveLength(1)
  })

  it('consumes the dummy without calling onBack when the UI closes itself', () => {
    const { entries, stack } = fakeHistory()
    const closed: string[] = []
    const id = stack.activate(() => closed.push('sheet'))
    expect(entries).toHaveLength(2)
    stack.deactivate(id)
    expect(closed).toEqual([])
    expect(entries).toHaveLength(1)
    expect(stack.depth()).toBe(0)
  })
})

describe('reorder', () => {
  it('moves an item and no-ops out of range', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b'], 0, 0)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], -1, 1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['a', 'b'])
  })
})
