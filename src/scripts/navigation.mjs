// A disclosure, not a modal/menu: ordinary links keep their native keyboard behavior.
export function initNavigation(root) {
  const button = root.querySelector('.nav__toggle');
  const panel = root.querySelector('#main-navigation');
  if (!button || !panel || root.hasAttribute('data-ready')) return;
  const mobile = window.matchMedia('(max-width: 50rem)');
  let open = false;

  function setOpen(value, restoreFocus = false) {
    open = mobile.matches && value;
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = mobile.matches && !open;
    if (restoreFocus) button.focus();
  }
  function syncViewport() {
    const focusInPanel = panel.contains(document.activeElement);
    const focusOnButton = document.activeElement === button;
    button.hidden = !mobile.matches;
    setOpen(false, mobile.matches && focusInPanel);
    if (!mobile.matches && focusOnButton) panel.querySelector('a')?.focus();
  }

  button.addEventListener('click', () => setOpen(!open));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false, true);
    }
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a') && open) setOpen(false, true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (open && !root.contains(event.target)) {
      setOpen(false, panel.contains(document.activeElement));
    }
  });
  document.addEventListener('focusin', (event) => {
    if (open && !root.contains(event.target)) setOpen(false);
  });
  mobile.addEventListener('change', syncViewport);
  // A restored page should not retain an expanded panel or stale viewport state.
  window.addEventListener('pageshow', syncViewport);
  root.setAttribute('data-ready', '');
  syncViewport();
}
