import { describe, expect, it } from 'vitest'
import {
  compactGroupLookupTerm,
  expandGroupLookupTerms,
  normalizeGroupLookupTerm,
  normalizeStorageCode,
} from '@/lib/groupRegistry'

describe('group lookup normalization', () => {
  it('normalizes shorthand and legacy storage codes', () => {
    expect(normalizeGroupLookupTerm('  @GHK-2026 ')).toBe('ghk-2026')
    expect(normalizeStorageCode('  OPCG-HK-2026 ')).toBe('opcg-hk-2026')
  })

  it('expands shorthand public ids to storage-code aliases', () => {
    const terms = expandGroupLookupTerms('GHK-2026')
    expect(terms).toContain('ghk-2026')
    expect(terms).toContain('opcg-ghk-2026')
  })

  it('matches compact suffix forms for hk groups', () => {
    const shorthand = compactGroupLookupTerm('ghk-2026')
    const storage = compactGroupLookupTerm('opcg-hk-2026')
    expect(storage.endsWith(shorthand)).toBe(true)
  })
})
