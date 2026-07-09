import { ensureProfileIdentityId } from '@/lib/profileIdentity'
import type { AppState } from '@/types'

export function hasPersonalProfile(state: AppState): boolean {
  return Boolean(state.settings.profileIdentityId && state.settings.profileSetupCompleted)
}

export function getPersonalProfileName(state: AppState): string | null {
  return state.settings.profileDisplayName?.trim() || null
}

export function createPersonalProfile(state: AppState, displayName: string): AppState {
  const name = displayName.trim()
  if (!name) throw new Error('個人檔案名稱不能留空')
  const next = ensureProfileIdentityId(state)
  return {
    ...next,
    settings: {
      ...next.settings,
      profileDisplayName: name,
      profileSetupCompleted: true,
    },
  }
}

export function ensurePersonalProfileFromLogin(state: AppState, email: string | null | undefined): AppState {
  if (hasPersonalProfile(state) || !email) return state
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim()
  if (!local) return state
  const displayName = local.charAt(0).toUpperCase() + local.slice(1)
  return createPersonalProfile(state, displayName)
}

export function updatePersonalProfileName(state: AppState, displayName: string): AppState {
  return createPersonalProfile(state, displayName)
}
