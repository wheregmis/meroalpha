// Public browser connection shared by waitlist and feedback; database RPC grants control access.
export const SUPABASE = { url: 'https://hzdbjqsjydgbrpwuvpcq.supabase.co', key: 'sb_publishable_o6x-lgI1tptYK50ZQ1-bRg_pDe_Td-G' };

export function callRpc(name, body, fetchImpl = fetch) {
  return fetchImpl(`${SUPABASE.url}/rest/v1/rpc/${name}`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
