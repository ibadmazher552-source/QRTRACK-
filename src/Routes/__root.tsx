import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({ meta: [
    { charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Create smart QR codes, customize their design, and track real campaign activity.' },
    { title: 'QRTrack — Create. Scan. Track.' },
  ] }),
  shellComponent: RootDocument,
})
function RootDocument({ children }: { children: React.ReactNode }) { return <html lang="en"><head><HeadContent/><link rel="icon" href="/favicon.svg"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet"/></head><body>{children}<Scripts/></body></html> }
