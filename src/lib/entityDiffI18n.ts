import type { EntityDiffCode } from '@/lib/entityDiff'
import type { TranslationKey } from '@/lib/i18n'

export const ENTITY_DIFF_I18N: Record<EntityDiffCode, TranslationKey> = {
  winnerChanged: 'entityDiff.winnerChanged',
  playersChanged: 'entityDiff.playersChanged',
  decksChanged: 'entityDiff.decksChanged',
  turnOrderChanged: 'entityDiff.turnOrderChanged',
  finishTimeChanged: 'entityDiff.finishTimeChanged',
  notesChanged: 'entityDiff.notesChanged',
  deleteStateChanged: 'entityDiff.deleteStateChanged',
  archiveStateChanged: 'entityDiff.archiveStateChanged',
  nameChanged: 'entityDiff.nameChanged',
  profileLinkChanged: 'entityDiff.profileLinkChanged',
  aliasesChanged: 'entityDiff.aliasesChanged',
  startTimeChanged: 'entityDiff.startTimeChanged',
  endTimeChanged: 'entityDiff.endTimeChanged',
  tableSlotChanged: 'entityDiff.tableSlotChanged',
  fieldsUpdated: 'entityDiff.fieldsUpdated',
}

export function formatEntityDiffCodes(
  codes: string[],
  t: (key: TranslationKey) => string,
): string[] {
  return codes.map((code) => {
    const key = ENTITY_DIFF_I18N[code as EntityDiffCode]
    return key ? t(key) : code
  })
}
