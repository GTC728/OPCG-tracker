import { toPng } from 'html-to-image'

export interface ShareExportOptions {
  filename: string
  pixelRatio?: number
}

export async function exportElementAsPng(
  element: HTMLElement,
  options: ShareExportOptions,
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#0b1220',
  })

  const link = document.createElement('a')
  link.download = options.filename
  link.href = dataUrl
  link.click()
}

export async function shareElementAsPng(
  element: HTMLElement,
  options: { title: string; filename: string },
): Promise<'shared' | 'downloaded'> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() || '#0b1220',
  })

  if (navigator.share && navigator.canShare) {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], options.filename, { type: 'image/png' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ title: options.title, files: [file] })
      return 'shared'
    }
  }

  await exportElementAsPng(element, { filename: options.filename })
  return 'downloaded'
}
