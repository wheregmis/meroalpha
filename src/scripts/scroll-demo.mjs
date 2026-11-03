const demo = document.querySelector('[data-scroll-demo]');

if (demo) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prompt = demo.querySelector('[data-demo-prompt]');
  const question = prompt.textContent;
  const numbers = Object.fromEntries([...demo.querySelectorAll('[data-demo-number]')].map((el) => [el.dataset.demoNumber, el]));
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const money = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let top = 0;
  let distance = 1;
  let pending = false;

  function render() {
    pending = false;
    if (reduced.matches) return;
    const p = clamp((window.scrollY - top) / distance);
    const ask = clamp(p / 0.13);
    const plan = clamp((p - 0.4) / 0.12);
    const fill = clamp((p - 0.82) / 0.11);
    demo.style.setProperty('--p', p);
    demo.style.setProperty('--ask', ask);
    demo.style.setProperty('--research', clamp((p - 0.2) / 0.18));
    demo.style.setProperty('--plan', plan);
    demo.style.setProperty('--chart', clamp((p - 0.6) / 0.15));
    demo.style.setProperty('--fill', fill);
    demo.style.setProperty('--end', clamp((p - 0.94) / 0.06));
    demo.classList.toggle('is-ended', p >= 0.94);
    prompt.textContent = question.slice(0, Math.round(question.length * ask));
    // Plan levels move away from the last close (NPR 501.00); the account grows from its NPR 100,000.00 start.
    for (const [key, [from, to, t]] of Object.entries({ entry: [501, 505, plan], stop: [501, 485, plan], target: [501, 545, plan], portfolio: [100000, 102180, fill] })) {
      numbers[key].textContent = money(from + (to - from) * t);
    }
  }

  function measure() {
    demo.classList.toggle('is-scrubbing', !reduced.matches);
    if (reduced.matches) {
      demo.removeAttribute('style');
      prompt.textContent = question;
      for (const [key, value] of Object.entries({ entry: '505.00', stop: '485.00', target: '545.00', portfolio: '102,180.00' })) numbers[key].textContent = value;
      return;
    }
    // Geometry is cached on resize; scrolling only writes text and custom properties.
    top = demo.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, demo.offsetHeight - window.innerHeight);
    schedule();
  }

  function schedule() {
    if (!pending && !reduced.matches) {
      pending = true;
      window.requestAnimationFrame(render);
    }
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure, { once: true });
  reduced.addEventListener('change', measure);
  measure();
}
