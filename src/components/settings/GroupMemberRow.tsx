import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { OptionPickerSheet } from '@/components/ui/FilterPicker'
import {
  groupRoleLabel,
  type GroupMemberRole,
} from '@/lib/groupPermissions'
import { resolveMemberDisplayName } from '@/lib/memberDisplay'
import { useI18n } from '@/lib/i18n'
import type { GroupMemberRecord } from '@/types'

export function MemberActionBar({
  member,
  busy,
  onRoleChange,
  onBanToggle,
  onRemove,
}: {
  member: GroupMemberRecord
  busy: boolean
  onRoleChange: (userId: string, role: GroupMemberRole) => Promise<void>
  onBanToggle: (member: GroupMemberRecord) => Promise<void>
  onRemove: (member: GroupMemberRecord) => Promise<void>
}) {
  const { t } = useI18n()
  const [rolePickerOpen, setRolePickerOpen] = useState(false)
  const banned = Boolean(member.bannedAt)

  return (
    <>
      {busy ? (
        <p className="text-[11px] font-medium text-brand-300">{t('members.updating')}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="secondary"
          className="min-h-8 px-2.5 py-1 text-[11px]"
          disabled={busy}
          onClick={() => setRolePickerOpen(true)}
        >
          {t('members.changeRole')}
        </Button>
        <Button
          variant={banned ? 'secondary' : 'danger'}
          className="min-h-8 px-2.5 py-1 text-[11px]"
          disabled={busy}
          onClick={() => void onBanToggle(member)}
        >
          {banned ? t('members.unban') : t('members.ban')}
        </Button>
        <Button
          variant="ghost"
          className="min-h-8 px-2.5 py-1 text-[11px] text-danger"
          disabled={busy}
          onClick={() => void onRemove(member)}
        >
          {t('members.kick')}
        </Button>
      </div>

      <OptionPickerSheet
        open={rolePickerOpen}
        title={t('members.changeRole')}
        showAllOption={false}
        options={[
          { value: 'member', label: groupRoleLabel('member') },
          { value: 'reader', label: groupRoleLabel('reader') },
        ]}
        value={member.role === 'reader' ? 'reader' : 'member'}
        allLabel=""
        onChange={(value) => {
          if (value === 'member' || value === 'reader') {
            void onRoleChange(member.userId, value).finally(() => setRolePickerOpen(false))
          }
        }}
        onClose={() => setRolePickerOpen(false)}
      />
    </>
  )
}

interface GroupMemberRowProps {
  member: GroupMemberRecord
  linkedPlayerName?: string | null
  isSelf: boolean
  canManage: boolean
  busy: boolean
  onRoleChange: (userId: string, role: GroupMemberRole) => Promise<void>
  onBanToggle: (member: GroupMemberRecord) => Promise<void>
  onRemove: (member: GroupMemberRecord) => Promise<void>
  compact?: boolean
}

export function GroupMemberRow({
  member,
  linkedPlayerName,
  isSelf,
  canManage,
  busy,
  onRoleChange,
  onBanToggle,
  onRemove,
  compact = false,
}: GroupMemberRowProps) {
  const { t } = useI18n()
  const banned = Boolean(member.bannedAt)
  const displayName = resolveMemberDisplayName(member, linkedPlayerName)
  const showActions = canManage && !isSelf && member.role !== 'owner'

  return (
    <>
      <article
        className={[
          'relative rounded-xl bg-surface ring-1',
          banned ? 'ring-danger/40 opacity-80' : 'ring-surface-muted',
          compact ? 'p-2.5' : 'p-3',
          busy ? 'opacity-60' : '',
        ].join(' ')}
      >
        {busy ? (
          <p className="mb-2 text-[11px] font-medium text-brand-300">{t('members.updating')}</p>
        ) : null}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {displayName}
              {isSelf ? (
                <span className="ml-1.5 text-[11px] font-normal text-brand-400">{t('members.you')}</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-medium">
                {groupRoleLabel(member.role)}
              </span>
              {banned ? (
                <span className="ml-1.5 text-danger">{t('members.bannedBadge')}</span>
              ) : null}
            </p>
            {linkedPlayerName ? (
              <p className="mt-1 text-[11px] text-text-secondary">
                {t('members.linkedPlayer').replace('{name}', linkedPlayerName)}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-text-secondary">{t('members.noLinkedPlayer')}</p>
            )}
          </div>
        </div>

        {showActions ? (
          <div className="mt-2">
            <MemberActionBar
              member={member}
              busy={busy}
              onRoleChange={onRoleChange}
              onBanToggle={onBanToggle}
              onRemove={onRemove}
            />
          </div>
        ) : null}
      </article>

    </>
  )
}
