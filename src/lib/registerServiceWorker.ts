export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  const reloadOnControllerChange = () => {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }

  const watchForUpdates = (registration: ServiceWorkerRegistration) => {
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      if (!installing) return

      installing.addEventListener('statechange', () => {
        if (installing.state !== 'installed') return
        if (!navigator.serviceWorker.controller) return
        installing.postMessage({ type: 'SKIP_WAITING' })
      })
    })
  }

  const checkForUpdates = (registration: ServiceWorkerRegistration) => {
    void registration.update().catch(() => undefined)
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        reloadOnControllerChange()
        watchForUpdates(registration)
        checkForUpdates(registration)

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates(registration)
          }
        })

        window.addEventListener('focus', () => {
          checkForUpdates(registration)
        })
      })
      .catch((error) => {
        console.error('Failed to register OPCG Tracker service worker', error)
      })
  })
}
