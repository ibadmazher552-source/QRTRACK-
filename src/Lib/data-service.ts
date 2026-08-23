import { supabase } from './supabase'
import type { Campaign, CampaignInput, ScanEvent, WorkspaceData } from './types'

const fromRow = (row: any): Campaign => ({
  id: row.id,
  workspaceId: row.user_id,
  slug: row.slug,
  campaignName: row.name,
  description: row.description || '',
  destinationUrl: row.destination_url,
  active: row.is_active,
  template: row.template,
  customText: row.custom_text,
  designSettings: row.design_settings,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
})

const fromEvent = (row: any): ScanEvent => ({
  id: row.id,
  campaignId: row.qr_code_id,
  slug: row.slug || '',
  eventType: row.event_type === 'open' ? 'open' : 'scan',
  timestamp: row.scanned_at,
  visitorId: row.visitor_id || '',
  device: row.device || 'Unknown',
  browser: row.browser || 'Other',
  operatingSystem: row.operating_system || 'Other',
  country: row.country,
  region: row.region,
  referrer: row.referrer,
  userAgent: row.user_agent,
})

export const dataService = {
  async getWorkspace(userId: string): Promise<WorkspaceData> {
    const { data: campaigns, error: campaignError } = await supabase.from('qr_codes').select('*').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false })
    if (campaignError) throw new Error(campaignError.message)
    const ids = (campaigns || []).map((row: any) => row.id)
    let events: any[] = []
    if (ids.length) {
      const result = await supabase.from('qr_scans').select('*').in('qr_code_id', ids).order('scanned_at', { ascending: false })
      if (result.error) throw new Error(result.error.message)
      events = result.data || []
    }
    return { campaigns: (campaigns || []).map(fromRow), events: events.map(fromEvent) }
  },
  async createCampaign(userId: string, input: CampaignInput): Promise<Campaign> {
    const { data, error } = await supabase.from('qr_codes').insert({
      user_id: userId,
      name: input.campaignName,
      description: input.description,
      destination_url: input.destinationUrl,
      template: input.template,
      custom_text: input.customText,
      design_settings: input.designSettings,
      is_active: true,
    }).select('*').single()
    if (error) throw new Error(error.message)
    return fromRow(data)
  },
  async updateCampaign(userId: string, slug: string, input: CampaignInput): Promise<Campaign> {
    const { data, error } = await supabase.from('qr_codes').update({
      name: input.campaignName,
      description: input.description,
      destination_url: input.destinationUrl,
      template: input.template,
      custom_text: input.customText,
      design_settings: input.designSettings,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('slug', slug).is('deleted_at', null).select('*').single()
    if (error) throw new Error(error.message)
    return fromRow(data)
  },
  async deleteCampaign(userId: string, slug: string) {
    const { error } = await supabase.from('qr_codes').update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId).eq('slug', slug)
    if (error) throw new Error(error.message)
    return { success: true as const }
  },
  async clearAnalytics(userId: string) {
    const { data, error } = await supabase.from('qr_codes').select('id').eq('user_id', userId)
    if (error) throw new Error(error.message)
    const ids = (data || []).map((row: any) => row.id)
    if (ids.length) {
      const result = await supabase.from('qr_scans').delete().in('qr_code_id', ids)
      if (result.error) throw new Error(result.error.message)
    }
    return { success: true as const }
  },
  async deleteAllCampaigns(userId: string) {
    const { error } = await supabase.from('qr_codes').update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { success: true as const }
  },
  async importData(userId: string, backup: { campaigns: CampaignInput[]; analytics?: unknown[] }) {
    for (const item of backup.campaigns.slice(0, 500)) await this.createCampaign(userId, item)
    return { success: true as const }
  },
}
