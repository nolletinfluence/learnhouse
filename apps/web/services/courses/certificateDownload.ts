
/** Width, in CSS pixels, of the offscreen node we rasterise. Roughly A4
 *  landscape at 96dpi, so the capture is dense enough to stay crisp when
 *  scaled into the page. */
export const CERTIFICATE_CAPTURE_WIDTH = 1123

/** Rasterise `node` and save it as a single-page PDF sized to the node's own
 *  aspect ratio, centred on A4 with a small margin. */
export async function downloadCertificateNodeAsPdf(
  node: HTMLElement,
  fileName: string,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])
  await document.fonts?.ready.catch(() => undefined)

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const isLandscape = canvas.width >= canvas.height
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 8
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2
  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
  const imgWidth = canvas.width * scale
  const imgHeight = canvas.height * scale

  pdf.addImage(
    imgData,
    'PNG',
    (pageWidth - imgWidth) / 2,
    (pageHeight - imgHeight) / 2,
    imgWidth,
    imgHeight,
  )

  pdf.save(fileName)
}

/** Build a filesystem-safe PDF filename from the certification name. */
export function certificateFileName(certificationName?: string): string {
  const base = certificationName && Array.from(certificationName.normalize('NFKC'))
    .map(character => /[<>:"/\\|?*]/.test(character) || character.charCodeAt(0) < 32 ? '_' : character)
    .join('')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 120) || 'Certificate'
  return `${base}_Certificate.pdf`
}
