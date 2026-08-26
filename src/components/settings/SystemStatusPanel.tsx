import { GroupConflictPanel } from '@/components/settings/GroupConflictPanel'
import { GroupSyncSection } from '@/components/settings/GroupSyncSection'
import { OperationHistoryPanel } from '@/components/settings/OperationHistoryPanel'
import { PwaInstallPanel } from '@/components/settings/PwaInstallPanel'

export function SystemStatusPanel() {
  return (
    <div className="space-y-3">
      <PwaInstallPanel />
      <GroupConflictPanel />
      <GroupSyncSection />
      <OperationHistoryPanel />
    </div>
  )
}
