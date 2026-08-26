import { Button } from '@/components/ui/Button'
import { OtpCodeInput } from '@/components/auth/OtpCodeInput'
import { EMAIL_OTP_LENGTH } from '@/lib/constants'
import { signInWithOAuth } from '@/lib/cloudSync'
import { useI18n } from '@/lib/i18n'
import { uiCalloutWarning, uiCardInset, uiGlassCard, uiLabel, uiSectionTitle } from '@/lib/uiSurface'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'

export function CloudLoginCard({
  email,
  onEmailChange,
  awaitingCode,
  otpCode,
  onOtpChange,
  onSendCode,
  onVerify,
  busy,
  loginCooldownSeconds,
  getFriendlyCloudError,
}: {
  email: string
  onEmailChange: (value: string) => void
  awaitingCode: boolean
  otpCode: string
  onOtpChange: (value: string) => void
  onSendCode: () => Promise<void>
  onVerify: () => Promise<void>
  busy: boolean
  loginCooldownSeconds: number
  getFriendlyCloudError: (caught: unknown, fallback: string) => string
}) {
  const { t } = useI18n()
  const toast = useToast()
  const [oauthBusy, setOauthBusy] = useState(false)

  const handleGoogleSignIn = async () => {
    setOauthBusy(true)
    try {
      await signInWithOAuth('google')
    } catch (caught) {
      toast.error(getFriendlyCloudError(caught, t('cloud.oauthFailed')))
      setOauthBusy(false)
    }
  }

  const oauthDisabled = busy || oauthBusy

  return (
    <div className={[uiGlassCard, 'space-y-4 p-4'].join(' ')}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">OPCG Tracker</p>
        <h3 className={uiSectionTitle}>{t('cloud.loginTitle')}</h3>
        <p className="mt-1 text-sm text-text-secondary">{t('cloud.loginSubtitle')}</p>
      </div>

      <p className={[uiCalloutWarning, 'p-3 text-xs'].join(' ')}>{t('cloud.emailLimitNote')}</p>

      <Button
        variant="secondary"
        fullWidth
        disabled={oauthDisabled}
        loading={oauthBusy}
        onClick={() => void handleGoogleSignIn()}
      >
        {t('cloud.oauthGoogle')}
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--ui-border)]" />
        <span className="text-xs text-text-secondary">{t('cloud.oauthOr')}</span>
        <div className="h-px flex-1 bg-[var(--ui-border)]" />
      </div>

      <label className="block space-y-2">
        <span className={uiLabel}>{t('cloud.emailLabel')}</span>
        <input
          className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-surface px-3 text-text-primary outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="name@example.com"
          type="email"
          autoComplete="email"
          value={email}
          disabled={busy || oauthBusy}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>

      <Button
        fullWidth
        disabled={oauthDisabled || !email.trim() || loginCooldownSeconds > 0}
        loading={busy && !awaitingCode}
        onClick={() => void onSendCode()}
      >
        {loginCooldownSeconds > 0
          ? `${t('cloud.resendIn')} ${loginCooldownSeconds}s`
          : awaitingCode
            ? t('cloud.resendCode')
            : t('cloud.sendLogin')}
      </Button>

      {awaitingCode ? (
        <div className={[uiCardInset, 'space-y-3 p-3'].join(' ')}>
          <p className="text-xs text-text-secondary">{t('cloud.enterCodeHint')}</p>
          <OtpCodeInput
            value={otpCode}
            onChange={onOtpChange}
            disabled={busy || oauthBusy}
            label={t('cloud.enterCode')}
          />
          <Button
            fullWidth
            disabled={oauthDisabled || otpCode.length !== EMAIL_OTP_LENGTH}
            loading={busy && awaitingCode}
            onClick={() => void onVerify()}
          >
            {t('cloud.verifyCode')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
