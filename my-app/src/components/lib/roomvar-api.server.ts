// Server-only helpers for the RoomVAR public API (used by the standalone index.html).
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "x-lovable-aig-run-id",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Verifies the caller's session token with Lovable Cloud auth. Returns user id or null. */
export async function verifyUser(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: auth } });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}

export async function gatewayError(res: Response) {
  let message = `AI service error (${res.status})`;
  try {
    const body = (await res.json()) as { error?: { message?: string } | string; message?: string };
    message =
      (typeof body.error === "object" ? body.error?.message : body.error) ?? body.message ?? message;
  } catch {
    /* ignore */
  }
  if (res.status === 429) message = "Too many requests right now. Please wait a moment and try again.";
  if (res.status === 402) message = message || "AI credits are exhausted. Please top up to continue.";
  return json({ error: message }, res.status);
}
