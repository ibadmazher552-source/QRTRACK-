import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hukugqjsppxhclelztpy.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IA-xHp-D_x_3XcjIHKx3TQ_tvzEVRdo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
