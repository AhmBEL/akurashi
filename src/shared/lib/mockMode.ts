// Development-only switch: when on, the whole app skips real Supabase auth
// and RLS-backed data, and serves fixed fixture data instead — so the
// experience (navigation, screens, interactions) can be validated with fake
// data before the real login flow is wired back in for actual family use.
// Toggle with the NEXT_PUBLIC_MOCK_MODE env var (no code change needed).
// IMPORTANT: turn this OFF before any real family data is stored — while on,
// there is no login and no RLS check anywhere in the app.
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_MODE === "true";
}
