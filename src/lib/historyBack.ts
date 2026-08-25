/** One dummy history entry for the whole overlay stack so Android / browser back pops the top layer. */

export type HistoryLike = {
  pushState: (data: unknown, unused: string, url?: string | URL | null) => void
  back: () => void
}

type Layer = {
  id: number
  onBack: () => void
}

export function createHistoryBackStack(history: HistoryLike) {
  const layers: Layer[] = []
  let seq = 0
  let skipNextPop = false

  function handlePopState() {
    if (skipNextPop) {
      skipNextPop = false
      return
    }
    const top = layers.pop()
    if (!top) return
    top.onBack()
    if (layers.length > 0) {
      history.pushState({ opcgBack: true }, '')
    }
  }

  function activate(onBack: () => void): number {
    const id = ++seq
    layers.push({ id, onBack })
    if (layers.length === 1) {
      history.pushState({ opcgBack: id }, '')
    }
    return id
  }

  function deactivate(id: number) {
    const index = layers.findIndex((layer) => layer.id === id)
    if (index === -1) return
    const wasOnly = layers.length === 1
    layers.splice(index, 1)
    if (wasOnly) {
      skipNextPop = true
      history.back()
    }
  }

  return {
    activate,
    deactivate,
    handlePopState,
    depth: () => layers.length,
  }
}

let browserStack: ReturnType<typeof createHistoryBackStack> | null = null

export function getHistoryBackStack() {
  if (typeof window === 'undefined') {
    throw new Error('history back is browser-only')
  }
  if (!browserStack) {
    browserStack = createHistoryBackStack(window.history)
    window.addEventListener('popstate', () => browserStack?.handlePopState())
  }
  return browserStack
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function isBlockingOverlayOpen(): boolean {
  return Boolean(document.querySelector('.ui-sheet-root, .ui-zoom-lightbox'))
}

export function isInHiddenTabPane(node: Element | null): boolean {
  if (!node) return false
  const pane = node.closest('.ui-tab-snap-pane')
  return pane?.getAttribute('aria-hidden') === 'true'
}
