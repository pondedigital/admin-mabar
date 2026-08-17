import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  )
}

// Single shared instance — reused across the app so we don't spin up
// multiple GoTrueClient/auth listeners against the same storage key.
export const supabase = createClient()
