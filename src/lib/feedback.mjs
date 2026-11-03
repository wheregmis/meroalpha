import { SUPABASE } from './waitlist.mjs';

export const CATEGORIES = ['feedback', 'question', 'bug', 'partnership'];
export function validateFeedback(input) {
  const category = typeof input.category === 'string' ? input.category : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  const errors = {};
  if (!CATEGORIES.includes(category)) errors.category = 'Choose what your message is about.';
  if ((category === 'question' && !email) || (email && (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))) errors.email = 'Enter an email address so we can reply.';
  const characters = [...message].length;
  if (characters < 10 || characters > 4000 || new TextEncoder().encode(message).length > 16000) errors.message = 'Write between 10 and 4,000 characters.';
  return { data: { category, email, message }, errors };
}

export async function submitFeedback(data, requestId, website = '', fetchImpl = fetch) {
  const validated = validateFeedback(data);
  if (Object.keys(validated.errors).length) return 'invalid';
  try {
    const res = await fetchImpl(`${SUPABASE.url}/rest/v1/rpc/submit_site_feedback`, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validated.data, request_id: requestId, website }),
    });
    if (res.ok) return 'ok';
    const error = await res.json().catch(() => ({}));
    return error.code === 'P0001' ? 'limited' : 'error';
  } catch { return 'error'; }
}

const MESSAGES = {
  ok: 'Message received. Thank you for helping shape MeroAlpha. If you left an email, we can reply there.',
  limited: 'We’re receiving too many messages. Keep this page open and try again in an hour, or email get2sabin@gmail.com.',
  error: 'We couldn’t confirm delivery. Your message is still here. Try sending again, or email get2sabin@gmail.com.',
  invalid: 'Check the fields above, then send your message again.',
};

export function mountFeedback(doc = document, send = submitFeedback, makeId = () => crypto.randomUUID()) {
  for (const form of doc.querySelectorAll('[data-feedback]')) {
    const fields = form.querySelector('fieldset'), button = form.querySelector('button');
    const status = form.querySelector('[data-feedback-status]');
    let pending = false, previous = '', requestId;
    const updateEmail = () => {
      const required = form.elements.category.value === 'question';
      form.elements.email.required = required;
      form.querySelector('[data-email-label]').textContent = required ? 'Email address (required for questions)' : 'Email address (optional)';
    };
    updateEmail();
    form.elements.category.addEventListener('change', updateEmail);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (pending) return;
      const { data, errors } = validateFeedback(Object.fromEntries(new FormData(form)));
      for (const name of ['category', 'email', 'message']) {
        form.elements[name].setAttribute('aria-invalid', errors[name] ? 'true' : 'false');
        form.querySelector(`[data-error="${name}"]`).textContent = errors[name] || '';
      }
      if (Object.keys(errors).length) {
        status.textContent = MESSAGES.invalid;
        status.dataset.state = 'error';
        form.elements[Object.keys(errors)[0]].focus();
        return;
      }
      const serialized = JSON.stringify(data);
      if (serialized !== previous) { requestId = makeId(); previous = serialized; }
      const website = form.elements.website.value;
      pending = true; fields.disabled = true;
      form.setAttribute('aria-busy', 'true');
      button.textContent = 'Sending…'; status.textContent = 'Sending your message…';
      status.dataset.state = 'pending';
      let result;
      try { result = await send(data, requestId, website); } catch { result = 'error'; }
      pending = false; fields.disabled = false;
      form.setAttribute('aria-busy', 'false');
      button.textContent = result === 'error' || result === 'limited' ? 'Try sending again' : 'Send message';
      status.textContent = MESSAGES[result] || MESSAGES.error;
      status.dataset.state = result;
      if (result === 'ok') { previous = ''; requestId = undefined; form.reset(); updateEmail(); }
    });
    fields.disabled = false;
  }
}
