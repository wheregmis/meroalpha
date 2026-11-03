// Copy buttons: each copies the <code> just before it.
for (const b of document.querySelectorAll('[data-copy]')) {
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.previousElementSibling.textContent); b.textContent = 'Copied'; }
    catch { b.textContent = 'Select to copy'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1600);
  });
}
