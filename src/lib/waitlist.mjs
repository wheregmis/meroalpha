// The waitlist lives in the agent's Supabase project (meroalpha_agent/supabase/migrations/*_waitlist.sql).
// The publishable key is public by design: it can only call join_waitlist, which can't read the list.
export const SUPABASE = { url: 'https://hzdbjqsjydgbrpwuvpcq.supabase.co', key: 'sb_publishable_o6x-lgI1tptYK50ZQ1-bRg_pDe_Td-G' };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Adds an address; resolves 'ok', 'invalid' or 'error'. The database answers a repeat address like a new one, so nothing reveals who is on the list. */
export async function joinWaitlist(email, fetchImpl = fetch) {
  const address = String(email ?? '').trim().toLowerCase();
  if (address.length > 254 || !EMAIL.test(address)) return 'invalid';
  try {
    const res = await fetchImpl(`${SUPABASE.url}/rest/v1/rpc/join_waitlist`, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

const MESSAGES = {
  pending: 'Adding your address…',
  ok: 'You’re on the list. We’ll write to you when there’s a build to try.',
  invalid: 'That doesn’t look like an email address.',
  error: 'Something went wrong on our side. Try again, or email get2sabin@gmail.com.',
};

/** Wires every [data-waitlist] form on the page. */
export function mountWaitlist(doc = document) {
  for (const form of doc.querySelectorAll('[data-waitlist]')) {
    const status = form.querySelector('[data-waitlist-status]'), button = form.querySelector('button'), email = form.elements.email;
    const show = (state) => { status.textContent = MESSAGES[state]; status.dataset.state = state; };
    button.disabled = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      email.removeAttribute('aria-invalid');
      email.removeAttribute('aria-describedby');
      // shortcut: a honeypot is the only bot check, add Turnstile if junk sign-ups show up.
      if (form.elements.website.value) return void (status.textContent = MESSAGES.ok);
      button.disabled = true;
      show('pending');
      const result = await joinWaitlist(email.value);
      button.disabled = false;
      show(result);
      if (result === 'ok') form.reset();
      if (result === 'invalid') {
        email.setAttribute('aria-invalid', 'true');
        email.setAttribute('aria-describedby', status.id);
        email.focus();
      }
    });
  }
}
