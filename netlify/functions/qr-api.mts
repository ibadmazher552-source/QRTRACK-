import type { Config } from '@netlify/functions'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { campaigns, events, type DesignSettings } from '../../db/schema.js'
import { json, safeCampaignInput } from './_shared.mjs'

const defaultDesign: DesignSettings = {
  textSize: 'medium', qrSize: 'medium', qrColor: '#111827', backgroundColor: '#ffffff', qrStyle: 'square', alignment: 'center',
}

const makeSlug = () => randomUUID().replaceAll('-', '').slice(0, 9)
const routeParts = (request: Request) => new URL(request.url).pathname.replace(/^\/api\/qr\/?/, '').split('/').filter(Boolean)

async function listWorkspace(workspaceId: string) {
  const rows = await db.select().from(campaigns).where(and(eq(campaigns.workspaceId, workspaceId), isNull(campaigns.deletedAt))).orderBy(desc(campaigns.createdAt))
  const ids = rows.map((row) => row.id)
  const eventRows = ids.length ? await db.select().from(events).where(inArray(events.campaignId, ids)).orderBy(desc(events.timestamp)) : []
  return { campaigns: rows, events: eventRows }
}

export default async (request: Request) => {
  try {
    const url = new URL(request.url)
    const [resource, identifier] = routeParts(request)
    const workspaceId = request.headers.get('x-qrtrack-workspace') || url.searchParams.get('workspaceId') || ''
    if (!workspaceId) return json({ error: 'Workspace is required.' }, 400)

    if (request.method === 'GET' && resource === 'workspace') return json(await listWorkspace(workspaceId))

    if (request.method === 'POST' && resource === 'campaigns') {
      const body = await request.json() as Record<string, unknown>
      const input = safeCampaignInput(body)
      const row = {
        id: randomUUID(), workspaceId, slug: makeSlug(), active: true,
        ...input, designSettings: (input.designSettings || defaultDesign) as DesignSettings,
      }
      await db.insert(campaigns).values(row)
      return json(row, 201)
    }

    if (identifier && resource === 'campaigns' && request.method === 'PUT') {
      const [existing] = await db.select().from(campaigns).where(and(eq(campaigns.slug, identifier), eq(campaigns.workspaceId, workspaceId), isNull(campaigns.deletedAt))).limit(1)
      if (!existing) return json({ error: 'Campaign not found.' }, 404)
      const body = await request.json() as Record<string, unknown>
      const input = safeCampaignInput(body)
      const [updated] = await db.update(campaigns).set({ ...input, designSettings: (input.designSettings || existing.designSettings) as DesignSettings, updatedAt: new Date() }).where(eq(campaigns.id, existing.id)).returning()
      return json(updated)
    }

    if (identifier && resource === 'campaigns' && request.method === 'DELETE') {
      const [deleted] = await db.update(campaigns).set({ active: false, deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(campaigns.slug, identifier), eq(campaigns.workspaceId, workspaceId))).returning()
      if (!deleted) return json({ error: 'Campaign not found.' }, 404)
      return json({ success: true })
    }

    if (request.method === 'POST' && resource === 'clear-analytics') {
      const owned = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.workspaceId, workspaceId))
      if (owned.length) await db.delete(events).where(inArray(events.campaignId, owned.map((row) => row.id)))
      return json({ success: true })
    }

    if (request.method === 'DELETE' && resource === 'all-campaigns') {
      await db.update(campaigns).set({ active: false, deletedAt: new Date(), updatedAt: new Date() }).where(eq(campaigns.workspaceId, workspaceId))
      return json({ success: true })
    }

    if (request.method === 'POST' && resource === 'import') {
      const body = await request.json() as { campaigns?: Array<Record<string, unknown>>; analytics?: Array<Record<string, unknown>> }
      if (!Array.isArray(body.campaigns)) return json({ error: 'Invalid QRTrack backup file.' }, 400)
      const campaignMap = new Map<string, { id: string; slug: string }>()
      for (const item of body.campaigns.slice(0, 500)) {
        const input = safeCampaignInput(item)
        const id = randomUUID()
        const slug = makeSlug()
        await db.insert(campaigns).values({
          id, workspaceId, slug, active: true, ...input,
          designSettings: (input.designSettings || defaultDesign) as DesignSettings,
        })
        if (typeof item.id === 'string') campaignMap.set(item.id, { id, slug })
      }
      if (Array.isArray(body.analytics)) {
        for (const item of body.analytics.slice(0, 10_000)) {
          const originalCampaignId = typeof item.campaignId === 'string' ? item.campaignId : ''
          const target = campaignMap.get(originalCampaignId)
          if (!target) continue
          await db.insert(events).values({
            id: randomUUID(), campaignId: target.id, slug: target.slug,
            eventType: item.eventType === 'open' ? 'open' : 'scan',
            timestamp: typeof item.timestamp === 'string' ? new Date(item.timestamp) : new Date(),
            visitorId: typeof item.visitorId === 'string' ? item.visitorId.slice(0, 120) : `visitor_${randomUUID().slice(0, 12)}`,
            device: typeof item.device === 'string' ? item.device.slice(0, 40) : 'Unknown',
            browser: typeof item.browser === 'string' ? item.browser.slice(0, 40) : 'Other',
            operatingSystem: typeof item.operatingSystem === 'string' ? item.operatingSystem.slice(0, 40) : 'Other',
            country: typeof item.country === 'string' ? item.country.slice(0, 100) : null,
            region: typeof item.region === 'string' ? item.region.slice(0, 100) : null,
            referrer: typeof item.referrer === 'string' ? item.referrer.slice(0, 1000) : null,
            userAgent: typeof item.userAgent === 'string' ? item.userAgent.slice(0, 1000) : null,
          })
        }
      }
      return json({ success: true })
    }

    return json({ error: 'Not found.' }, 404)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong.'
    const expected = message.includes('required') || message.includes('valid destination') || message.includes('backup')
    console.error('QRTrack API error:', error)
    return json({ error: expected ? message : 'QRTrack could not complete that request.' }, expected ? 400 : 500)
  }
}

export const config: Config = { path: '/api/qr/*' }
