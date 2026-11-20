/*
 * olaseniotusanya.site: light/dark mode toggle and analytics.
 * The saved mode is applied before paint by a one-line script in each page's <head>.
 */

/* ---------- Light / dark mode (ODS data-ods-mode on <html>) ---------- */

(function () {
  const root = document.documentElement;
  const toggles = document.querySelectorAll('[data-mode-toggle]');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function currentMode() {
    const set = root.getAttribute('data-ods-mode');
    if (set === 'light' || set === 'dark') return set;
    return prefersDark.matches ? 'dark' : 'light';
  }

  function label() {
    const next = currentMode() === 'dark' ? 'light' : 'dark';
    toggles.forEach((button) => button.setAttribute('aria-label', 'Switch to ' + next + ' mode'));
  }

  toggles.forEach((button) => {
    button.addEventListener('click', () => {
      const next = currentMode() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-ods-mode', next);
      try {
        localStorage.setItem('ods-mode', next);
      } catch (error) {
        /* Storage can be unavailable (private mode); the switch still works for this page. */
      }
      label();
    });
  });

  prefersDark.addEventListener('change', label);
  label();
})();

/* ---------- Analytics (GA4) ---------- */

const GA_MEASUREMENT_ID = 'G-HFV3BEYPBZ';

function loadGoogleAnalytics(measurementId) {
  if (!measurementId || !measurementId.startsWith('G-')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
  document.head.appendChild(script);
}

function trackEvent(name, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

function classifyLink(link) {
  const href = link.getAttribute('href') || '';
  if (href.startsWith('mailto:')) return 'email_click';
  if (href.includes('wa.me/')) return 'whatsapp_click';
  if (href.includes('linkedin.com/')) return 'linkedin_click';
  if (href.includes('github.com/')) return 'github_click';
  if (href.includes('policypilot-prototype')) return 'policypilot_prototype_click';
  if (href.includes('treeinapool')) return 'treeinapool_click';
  if (href.startsWith('/unabdicated/')) return 'unabdicated_click';
  if (href.startsWith('/writing/')) return 'writing_click';
  if (/^https?:\/\//.test(href) && !href.includes('olaseniotusanya.site')) return 'outbound_click';
  return 'internal_navigation';
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href') || '';
  trackEvent(classifyLink(link), {
    link_url: href,
    link_text: (link.textContent || '').trim().slice(0, 100),
    page_path: window.location.pathname,
  });
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('[data-newsletter-form]')) {
    trackEvent('newsletter_signup_submit', { page_path: window.location.pathname });
  }
});

loadGoogleAnalytics(GA_MEASUREMENT_ID);
