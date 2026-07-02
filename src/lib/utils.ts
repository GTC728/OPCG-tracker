export function createId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-Hant', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-Hant', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('zh-Hant', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
