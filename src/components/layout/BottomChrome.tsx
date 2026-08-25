import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface BottomChromeContextValue {
  setPanel: (panel: ReactNode) => void
}

const BottomChromeContext = createContext<BottomChromeContextValue | null>(null)

export function useBottomChromePanel(panel: ReactNode, active: boolean) {
  const context = useContext(BottomChromeContext)

  useEffect(() => {
    if (!context || !active) return
    context.setPanel(panel)
    return () => context.setPanel(null)
  }, [active, context, panel])
}

interface BottomChromeShellProps {
  nav: ReactNode
  children: ReactNode
}

export function BottomChromeShell({ nav, children }: BottomChromeShellProps) {
  const [panel, setPanel] = useState<ReactNode>(null)
  const chromeRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = chromeRef.current
    if (!element) return

    const syncHeight = () => {
      document.documentElement.style.setProperty('--bottom-chrome-height', `${element.offsetHeight}px`)
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(element)
    return () => observer.disconnect()
  }, [panel])

  return (
    <BottomChromeContext.Provider value={{ setPanel }}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
      <div
        ref={chromeRef}
        className="ui-frost-bar safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ui-border)]"
      >
        <div className="safe-bottom mx-auto w-full max-w-lg">
          {panel}
          {nav}
        </div>
      </div>
    </BottomChromeContext.Provider>
  )
}
