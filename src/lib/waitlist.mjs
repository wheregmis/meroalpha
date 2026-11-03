// The waitlist lives in the agent's Supabase project (meroalpha_agent/supabase/migrations/*_waitlist.sql).
// The publishable key is public by design: row-level security lets anyone insert an address and nobody read one.
export const SUPABASE = { url: 'https://hzdbjqsjydgbrpwuvpcq.supabase.co', key: 'sb_publishable_o6x-lgI1tptYK50ZQ1-bRg_pDe_Td-G' };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Adds an address; resolves 'ok', 'invalid' or 'error'. A repeat address is 'ok' too, so the form never reveals who is on the list. */
export async function joinWaitlist(email, fetchImpl = fetch) {
  const address = String(email ?? '').trim().toLowerCase();
  if (address.length > 254 || !EMAIL.test(address)) return 'invalid';
  try {
    const res = await fetchImpl(`${SUPABASE.url}/rest/v1/waitlist`, {
      method: 'POST',
      headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email: address, product: 'agent' }),
    });
    return res.ok || res.status === 409 ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

const MESSAGES = {
  ok: 'You’re on the list. We’ll write to you when there’s a build to try.',
  invalid: 'That doesn’t look like an email address.',
  error: 'Something went wrong on our side. Try again, or email get2sabin@gmail.com.',
};

/** Wires every [data-waitlist] form on the page. */
export function mountWaitlist(doc = document) {
  for (const form of doc.querySelectorAll('[data-waitlist]')) {
    const status = form.querySelector('[data-waitlist-status]'), button = form.querySelector('button');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      // shortcut: a honeypot is the only bot check, add Turnstile if junk sign-ups show up.
      if (form.elements.website.value) return void (status.textContent = MESSAGES.ok);
      button.disabled = true;
      const result = await joinWaitlist(form.elements.email.value);
      button.disabled = false;
      status.textContent = MESSAGES[result];
      status.dataset.state = result;
      if (result === 'ok') form.reset();
    });
  }
}
