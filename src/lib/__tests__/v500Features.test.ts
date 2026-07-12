import { describe, expect, it } from 'vitest'
import {
  canDeleteMatches,
  canManageGroup,
  canManageMembers,
  canRecordMatches,
  canTransferOwnership,
  normalizeGroupMemberRole,
} from '@/lib/groupPermissions'
import { normalizeInviteSlug, isValidInviteSlug } from '@/lib/groupRegistry'
import { joinPolicyLabelKey, visibilityLabelKey } from '@/lib/groupLobby'

describe('V5 group permissions', () => {
  it('admin can manage group and members', () => {
    expect(canManageGroup('admin')).toBe(true)
    expect(canManageMembers('admin')).toBe(true)
    expect(canDeleteMatches('admin', true)).toBe(true)
    expect(canTransferOwnership('admin')).toBe(false)
  })

  it('owner retains transfer rights', () => {
    expect(canTransferOwnership('owner')).toBe(true)
    expect(canManageGroup('owner')).toBe(true)
  })

  it('member can record but not manage', () => {
    expect(canRecordMatches('member')).toBe(true)
    expect(canManageGroup('member')).toBe(false)
    expect(canDeleteMatches('member', true)).toBe(false)
  })

  it('normalizes admin role', () => {
    expect(normalizeGroupMemberRole('admin')).toBe('admin')
    expect(normalizeGroupMemberRole('reader')).toBe('reader')
  })
})

describe('V5 lobby helpers', () => {
  it('validates invite slug', () => {
    const slug = normalizeInviteSlug('OPCG HK Shop')
    expect(slug).toBe('opcg-hk-shop')
    expect(isValidInviteSlug(slug)).toBe(true)
  })

  it('maps policy and visibility label keys', () => {
    expect(joinPolicyLabelKey('request')).toBe('lobby.policyRequest')
    expect(visibilityLabelKey('public')).toBe('lobby.visibilityPublic')
  })
})
