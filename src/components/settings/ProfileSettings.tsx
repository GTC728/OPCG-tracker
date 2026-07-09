import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProfileLinkSheet } from '@/components/profile/ProfileLinkSheet'
import { getLinkedPlayer, validateProfileLink } from '@/lib/profileClaim'
import { getGroupProfileBookmark } from '@/lib/profileGroupLink'
import { getPersonalProfileName, hasPersonalProfile } from '@/lib/personalProfile'
import { useI18n } from '@/lib/i18n'
import { uiCardInset, uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'

export function ProfileSettings() {
  const { t } = useI18n()
  const state = useAppStore()
  const unlinkGroupProfile = useAppStore((store) => store.unlinkGroupProfile)
  const updatePersonalProfileName = useAppStore((store) => store.updatePersonalProfileName)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const linkedPlayer = getLinkedPlayer(state)
  const validationIssue = validateProfileLink(state)
  const personalReady = hasPersonalProfile(state)
  const personalName = getPersonalProfileName(state)
  const groupBookmark = getGroupProfileBookmark(state)
  const inGroup = Boolean(state.settings.lastGroupCode)

  return (
    <div className="space-y-4">
      <section className={[uiGlassCard, 'space-y-3 p-4'].join(' ')}>
        <h2 className={uiSectionTitle}>{t('profile.settingsTitle')}</h2>

        {personalReady ? (
          <>
            <div>
              <p className="text-xs text-text-secondary">{t('profile.personalProfileLabel')}</p>
              {editingName ? (
                <div className="mt-2 flex gap-2">
                  <input
                    className="min-h-10 flex-1 rounded-lg border border-surface-muted bg-surface px-3 text-text-primary"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (nameDraft.trim()) updatePersonalProfileName(nameDraft.trim())
                      setEditingName(false)
                    }}
                  >
                    {t('common.save')}
                  </Button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xl font-bold">{personalName}</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setNameDraft(personalName ?? '')
                      setEditingName(true)
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                </div>
              )}
              <p className="mt-2 text-sm text-text-secondary">{t('profile.personalProfileDesc')}</p>
            </div>

            {inGroup ? (
              <div className={[uiCardInset, 'space-y-2 p-3'].join(' ')}>
                <p className="text-xs text-text-secondary">{t('profile.groupIdentityLabel')}</p>
                {linkedPlayer ? (
                  <>
                    <p className="text-lg font-semibold">{linkedPlayer.name}</p>
                    {validationIssue ? (
                      <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning ring-1 ring-warning/25">
                        {t(`profile.issue.${validationIssue}` as 'profile.issue.linked_player_missing')}
                      </p>
                    ) : (
                      <p className="text-sm text-text-secondary">{t('profile.groupLinkedDesc')}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                        {t('profile.changeGroupLink')}
                      </Button>
                      <Button variant="ghost" onClick={() => unlinkGroupProfile()}>
                        {t('profile.unlinkGroupOnly')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary">
                      {groupBookmark
                        ? t('profile.groupLinkPending').replace('{name}', groupBookmark.playerName)
                        : t('profile.groupNotLinkedDesc')}
                    </p>
                    <Button fullWidth onClick={() => setSheetOpen(true)}>
                      {t('profile.linkGroupCta')}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('profile.noGroupHint')}</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary">{t('profile.notLinkedDesc')}</p>
            <Button fullWidth onClick={() => setSheetOpen(true)}>
              {t('profile.setupCta')}
            </Button>
          </>
        )}
      </section>

      <section className={[uiCardInset, 'space-y-2 p-3'].join(' ')}>
        <h3 className="text-sm font-semibold">{t('profile.securityTitle')}</h3>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-text-secondary">
          <li>{t('profile.securityPoint1')}</li>
          <li>{t('profile.securityPoint2')}</li>
          <li>{t('profile.securityPoint3')}</li>
        </ul>
      </section>

      <ProfileLinkSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
