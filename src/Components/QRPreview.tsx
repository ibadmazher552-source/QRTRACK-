import { useEffect, useRef, useState } from 'react'
import type { DesignSettings, TemplateId } from '../lib/types'

type Props = { data: string; template: TemplateId; text: string; design: DesignSettings; previewId?: string; compact?: boolean; exportSafe?: boolean; onReady?: () => void }
const templateText: Record<TemplateId, string> = { 'qr-only': '', gift: 'SCAN ME 🎁', envelope: 'SCAN HERE', 'scan-me': 'SCAN ME', 'scan-here': 'SCAN HERE', whatsapp: 'SCAN TO CHAT ON WHATSAPP', custom: 'SCAN ME' }

export function QRPreview({ data, template, text, design, previewId, compact = false, exportSafe = false, onReady }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [imageUrl, setImageUrl] = useState('')
  const size = compact ? 112 : design.qrSize === 'small' ? 170 : design.qrSize === 'large' ? 250 : 210
  const cta = text || templateText[template]
  useEffect(() => {
    if (!ref.current && !exportSafe) return
    if (ref.current) ref.current.innerHTML = ''
    setImageUrl('')
    let cancelled = false
    void import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled) return
      const qr = new QRCodeStyling({
        width: size, height: size, data, margin: compact ? 6 : 10,
        type: 'svg', image: design.logoDataUrl,
        qrOptions: { errorCorrectionLevel: design.logoDataUrl ? 'H' : 'Q' },
        dotsOptions: { color: design.qrColor, type: design.qrStyle === 'dots' ? 'dots' : design.qrStyle === 'rounded' ? 'rounded' : 'square' },
        cornersSquareOptions: { color: design.qrColor, type: design.qrStyle === 'rounded' ? 'extra-rounded' : 'square' },
        cornersDotOptions: { color: design.qrColor },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: { crossOrigin: 'anonymous', margin: 8, imageSize: 0.28 },
      })
      if (!exportSafe && ref.current) {
        qr.append(ref.current)
        onReady?.()
        return
      }
      void qr.getRawData('png').then((value) => {
        if (cancelled || !(value instanceof Blob)) return
        const reader = new FileReader()
        reader.onload = () => {
          if (cancelled) return
          setImageUrl(String(reader.result))
          onReady?.()
        }
        reader.readAsDataURL(value)
      })
    })
    return () => { cancelled = true }
  }, [data, design.logoDataUrl, design.qrColor, design.qrStyle, exportSafe, onReady, size])
  return <div id={previewId} className={`qr-art template-${template} align-${design.alignment} ${compact ? 'compact' : ''}`} style={{ backgroundColor: design.backgroundColor }}>
    {template === 'gift' && <><span className="gift-ribbon"/><span className="gift-bow">✦</span></>}
    {template === 'envelope' && <><span className="envelope-fold left"/><span className="envelope-fold right"/></>}
    {template === 'whatsapp' && <span className="whatsapp-mark">↗</span>}
    {template !== 'qr-only' && <div className={`qr-cta text-${design.textSize}`}>{cta}</div>}
    <div className="qr-frame">{exportSafe ? imageUrl && <img src={imageUrl} alt="Generated QR code" /> : <div ref={ref} aria-label="Generated QR code" />}</div>
    {!compact && template !== 'qr-only' && <div className="qr-caption">Point your camera at the code</div>}
  </div>
}
