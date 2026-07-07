import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProfileLinkSheet } from '@/components/profile/ProfileLinkSheet'
import { getLinkedPlayer, validateProfileLink } from '@/lib/profileClaim'
import { useI18n } from '@/lib/i18n'
import { uiCardInset, uiGlassCard, uiSectionTitle } from '@/lib/uiSurface'
import { useAppStore } from '@/stores/appStore'

export function ProfileSettings() {
  const { t } = useI18n()
  const state = useAppStore()
  const unlinkProfile = useAppStore((store) => store.unlinkProfile)
  const [sheetOpen, setSheetOpen] = useState(false)
  const linkedPlayer = getLinkedPlayer(state)
  const validationIssue = validateProfileLink(state)

  return (
    <div className="space-y-4">
      <section className={[uiGlassCard, 'space-y-3 p-4'].join(' ')}>
        <h2 className={uiSectionTitle}>{t('profile.settingsTitle')}</h2>
        {linkedPlayer ? (
          <>
            <div>
              <p className="text-xs text-text-secondary">{t('profile.currentIdentity')}</p>
              <p className="mt-1 text-xl font-bold">{linkedPlayer.name}</p>
            </div>
            {validationIssue ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning ring-1 ring-warning/25">
                {t(`profile.issue.${validationIssue}` as 'profile.issue.linked_player_missing')}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">{t('profile.linkedDesc')}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                {t('profile.changeIdentity')}
              </Button>
              <Button variant="ghost" onClick={() => unlinkProfile()}>
                {t('profile.unlink')}
              </Button>
            </div>
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
