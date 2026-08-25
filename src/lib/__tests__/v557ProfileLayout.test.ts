import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { ja } from '@/i18n/ja'
import { zhHans } from '@/i18n/zh-Hans'
import { zhHant } from '@/i18n/zh-Hant'
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
})

describe('i18n keys', () => {
  it('keeps locale dictionaries aligned with zh-Hant', () => {
    const keys = Object.keys(zhHant).sort()
    expect(Object.keys(en).sort()).toEqual(keys)
    expect(Object.keys(zhHans).sort()).toEqual(keys)
    expect(Object.keys(ja).sort()).toEqual(keys)
  })
})
