import { GroupConflictPanel } from '@/components/settings/GroupConflictPanel'
import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { OperationHistoryPanel } from '@/components/settings/OperationHistoryPanel'

export function SystemStatusPanel() {
  return (
    <div className="space-y-3">
      <GroupConflictPanel />
      <GroupSyncSection />
      <OperationHistoryPanel />
    </div>
  )
}
