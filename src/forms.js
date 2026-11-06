/* ==========================================================================
   CONTACT PAGE
   The form doesn't send anything to this site: it opens the visitor's own
   mail app with the message filled in.
   ========================================================================== */

export function initForms() {
  const writeForm = document.querySelector('#write-form');
  if (writeForm) {
    const submit = writeForm.querySelector('[type="submit"]');
    const sync = () => {
      if (submit) submit.disabled = !writeForm.checkValidity();
    };
    writeForm.addEventListener('input', sync);
    sync();
    writeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(writeForm);
      const subject = encodeURIComponent(String(data.get('subject') || ''));
      const body = encodeURIComponent(String(data.get('message') || ''));
      window.location.href = `mailto:lorenzask@kvantra.ai?subject=${subject}&body=${body}`;
    });
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy');
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        const previous = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => {
          button.textContent = previous;
        }, 1400);
      } catch {
        window.prompt('Copy this address', value);
      }
    });
  });
}
