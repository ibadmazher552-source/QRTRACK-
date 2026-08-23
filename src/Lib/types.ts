export type TemplateId = 'qr-only' | 'gift' | 'envelope' | 'scan-me' | 'scan-here' | 'whatsapp' | 'custom'
export type DesignSettings = {
  textSize: 'small' | 'medium' | 'large'
  qrSize: 'small' | 'medium' | 'large'
  qrColor: string
  backgroundColor: string
  qrStyle: 'square' | 'rounded' | 'dots'
  alignment: 'left' | 'center' | 'right'
  logoDataUrl?: string
}
export type Campaign = {
  id: string
  workspaceId: string
  slug: string
  campaignName: string
  description: string
  destinationUrl: string
  active: boolean
  template: TemplateId
  customText: string
  designSettings: DesignSettings
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}
export type ScanEvent = {
  id: string
  campaignId: string
  slug: string
  eventType: 'scan' | 'open'
  timestamp: string
  visitorId: string
  device: string
  browser: string
  operatingSystem: string
  country?: string | null
  region?: string | null
  referrer?: string | null
  userAgent?: string | null
}
export type WorkspaceData = { campaigns: Campaign[]; events: ScanEvent[] }
export type CampaignInput = Pick<Campaign, 'campaignName' | 'description' | 'destinationUrl' | 'template' | 'customText' | 'designSettings'>
export const defaultDesign: DesignSettings = { textSize: 'medium', qrSize: 'medium', qrColor: '#152018', backgroundColor: '#ffffff', qrStyle: 'square', alignment: 'center' }
