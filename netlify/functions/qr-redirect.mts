import type { Config, Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { parseClient, visitorId } from './_shared.mjs'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hukugqjsppxhclelztpy.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IA-xHp-D_x_3XcjIHKx3TQ_tvzEVRdo'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const page = (title: string, message: string, status: number) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · QRTrack</title><style>body{margin:0;font-family:system-ui;background:#f5f7f2;color:#182019;display:grid;min-height:100vh;place-items:center}.card{width:min(88vw,460px);padding:44px;border:1px solid #dfe5d9;border-radius:28px;background:white;box-shadow:0 24px 80px #1b2b1c14}b{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:14px;background:#dff56b;color:#182019;font-size:22px}h1{font-size:30px;margin:22px 0 10px}p{color:#687268;line-height:1.6;margin:0}</style></head><body><main class="card"><b>Q</b><h1>${title}</h1><p>${message}</p></main></body></html>`,
    {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  )

export default async (request: Request, context: Context) => {
  try {
    const url = new URL(request.url)
    const slug =
      context.params.slug ||
      url.pathname.split('/').filter(Boolean).pop() ||
      ''

    if (!/^[a-zA-Z0-9_-]{4,64}$/.test(slug)) {
      return page(
        'QR Not Found',
        'This QR code does not exist or the tracking link is invalid.',
        404
      )
    }

    const { data: rows, error } = await supabase.rpc('resolve_qr', {
      p_slug: slug,
    })

    if (error) throw error

    const campaign = rows?.[0]

    if (!campaign) {
      return page(
        'QR Not Found',
        'This QR code does not exist or may have been removed.',
        404
      )
    }

    const userAgent = request.headers.get('user-agent') || ''
    const visitor = visitorId(context, userAgent)
    const client = parseClient(userAgent)

    // Analytics must NEVER block the QR redirect.
    try {
      await supabase.rpc('record_qr_scan', {
        p_qr_code_id: campaign.id,
        p_slug: slug,
        p_visitor_id: visitor.id,
        p_device: client.device,
        p_browser: client.browser,
        p_operating_system: client.operatingSystem,
        p_country:
          context.geo?.country?.name ||
          context.geo?.country?.code ||
          null,
        p_region:
          context.geo?.subdivision?.name ||
          context.geo?.subdivision?.code ||
          null,
        p_city: context.geo?.city || null,
        p_referrer: request.headers.get('referer'),
        p_user_agent: userAgent.slice(0, 1000),
      })
    } catch (err) {
      console.error('QR analytics error:', err)
    }

    if (visitor.isNew) {
      context.cookies.set({
        name: 'qrtrack_visitor',
        value: visitor.id,
        path: '/',
        maxAge: 31_536_000,
        sameSite: 'Lax',
        secure: true,
      })
    }

    return Response.redirect(campaign.destination_url, 302)
  } catch (error) {
    console.error('QR redirect error:', error)

    return page(
      'QR Temporarily Unavailable',
      'Please try scanning this code again in a moment.',
      503
    )
  }
}

export const config: Config = { path: '/r/:slug' }
