import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [prompt, setPrompt]           = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)

  useEffect(() => {
    // Already running as installed PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsInstalled(standalone)
    if (standalone) return

    // iOS Safari detection (not Chrome/Firefox on iOS which have CriOS/FxiOS in UA)
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua)
    const iosSafari = ios && !/CriOS|FxiOS/.test(ua)
    setIsIOSSafari(iosSafari)

    // Android / Chrome install prompt
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setIsInstalled(true)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setPrompt(null)
    }
  }

  return {
    canInstall: !!prompt,   // true on Android Chrome when installable
    isIOSSafari,            // true on iOS Safari — needs manual steps
    isInstalled,            // already running as PWA
    install,
  }
}
