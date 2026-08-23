import type { Context } from '@netlify/functions'
import { createHash, randomUUID } from 'node:crypto'

export const json = (data: unknown, status = 200) => Response.json(data, { status })

export function parseClient(userAgent = '') {
  const ua = userAgent.toLowerCase()
  const device = /ipad|tablet|kindle/.test(ua) ? 'Tablet' : /mobile|iphone|android/.test(ua) ? 'Mobile' : ua ? 'Desktop' : 'Unknown'
  const browser = /edg\//.test(ua) ? 'Edge' : /firefox|fxios/.test(ua) ? 'Firefox' : /chrome|crios/.test(ua) && !/edg\//.test(ua) ? 'Chrome' : /safari/.test(ua) && !/chrome|crios/.test(ua) ? 'Safari' : 'Other'
  const operatingSystem = /android/.test(ua) ? 'Android' : /iphone|ipad|ipod/.test(ua) ? 'iOS' : /windows/.test(ua) ? 'Windows' : /mac os|macintosh/.test(ua) ? 'macOS' : /linux/.test(ua) ? 'Linux' : 'Other'
  return { device, browser, operatingSystem }
}

export function visitorId(context: Context, userAgent: string) {
  const existing = context.cookies.get('qrtrack_visitor')
  if (existing) return { id: existing, isNew: false }
  const entropy = `${context.ip}:${userAgent}:${randomUUID()}`
  return { id: `visitor_${createHash('sha256').update(entropy).digest('hex').slice(0, 16)}`, isNew: true }
}

export function validUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function safeCampaignInput(body: Record<string, unknown>) {
  const campaignName = typeof body.campaignName === 'string' ? body.campaignName.trim() : ''
  const destinationUrl = typeof body.destinationUrl === 'string' ? body.destinationUrl.trim() : ''
  if (!campaignName) throw new Error('Campaign name is required.')
  if (!validUrl(destinationUrl)) throw new Error('Please enter a valid destination URL.')
  return {
    campaignName,
    destinationUrl,
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '',
    template: typeof body.template === 'string' ? body.template : 'qr-only',
    customText: typeof body.customText === 'string' ? body.customText.trim().slice(0, 80) || 'SCAN ME' : 'SCAN ME',
    designSettings: body.designSettings,
  }
}
