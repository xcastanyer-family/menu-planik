import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes("your-project") ||
    supabaseUrl.includes("placeholder") ||
    supabaseAnonKey.includes("placeholder")
  ) {
    // Return null when env vars are placeholders or not configured
    return null;
  }

  // Clean URL by removing any trailing /rest/v1 or trailing slashes
  const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  return createBrowserClient(cleanUrl, supabaseAnonKey);
}

