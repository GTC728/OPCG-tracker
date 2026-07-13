import {
  ArrowLeftRight,
  HardDrive,
  Link2,
  Merge,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  CalendarDays,
} from 'lucide-react'

const iconClass = 'h-4 w-4'

export function IconSettings() {
  return <Settings className={iconClass} aria-hidden />
}

export function IconSearch() {
  return <Search className={iconClass} aria-hidden />
}

export function IconSwitch() {
  return <ArrowLeftRight className={iconClass} aria-hidden />
}

export function IconLocal() {
  return <HardDrive className={iconClass} aria-hidden />
}

export function IconEdit() {
  return <Pencil className={iconClass} aria-hidden />
}

export function IconDelete() {
  return <Trash2 className={iconClass} aria-hidden />
}

export function IconManage() {
  return <Shield className={iconClass} aria-hidden />
}

export function IconAdd() {
  return <Plus className={iconClass} aria-hidden />
}

export function IconRefresh() {
  return <RefreshCw className={iconClass} aria-hidden />
}

export function IconLinked() {
  return <Link2 className={iconClass} aria-hidden />
}

export function IconMerge() {
  return <Merge className={iconClass} aria-hidden />
}

export function IconUsers() {
  return <Users className={iconClass} aria-hidden />
}

export function IconSessions() {
  return <CalendarDays className={iconClass} aria-hidden />
}
