import { boolean, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export type DesignSettings = {
  textSize: 'small' | 'medium' | 'large'
  qrSize: 'small' | 'medium' | 'large'
  qrColor: string
  backgroundColor: string
  qrStyle: 'square' | 'rounded' | 'dots'
  alignment: 'left' | 'center' | 'right'
  logoDataUrl?: string
}

export const campaigns = pgTable('campaigns', {
  id: text().primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  slug: text().notNull().unique(),
  campaignName: text('campaign_name').notNull(),
  description: text().notNull().default(''),
  destinationUrl: text('destination_url').notNull(),
  active: boolean().notNull().default(true),
  template: text().notNull().default('qr-only'),
  customText: text('custom_text').notNull().default('SCAN ME'),
  designSettings: jsonb('design_settings').$type<DesignSettings>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('campaigns_workspace_idx').on(table.workspaceId),
  index('campaigns_slug_idx').on(table.slug),
])

export const events = pgTable('events', {
  id: text().primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id),
  slug: text().notNull(),
  eventType: text('event_type').notNull().default('scan'),
  timestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
  visitorId: text('visitor_id').notNull(),
  device: text().notNull().default('Unknown'),
  browser: text().notNull().default('Other'),
  operatingSystem: text('operating_system').notNull().default('Other'),
  country: text(),
  region: text(),
  referrer: text(),
  userAgent: text('user_agent'),
}, (table) => [
  index('events_campaign_idx').on(table.campaignId),
  index('events_slug_idx').on(table.slug),
  index('events_timestamp_idx').on(table.timestamp),
])
