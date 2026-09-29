document.documentElement.classList.add('js');

const toggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

function closeMenu() {
  if (!toggle || !mobileNav) return;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  mobileNav.classList.remove('open');
  document.body.classList.remove('menu-open');
}

if (toggle && mobileNav) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
    mobileNav.classList.toggle('open', !open);
    document.body.classList.toggle('menu-open', !open);
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

/*
  Analytics bootstrap
  Add the GA4 Measurement ID once the Google Analytics property is created.
  Example format: G-XXXXXXXXXX
*/
const GA_MEASUREMENT_ID = '';

function loadGoogleAnalytics(measurementId) {
  if (!measurementId || !measurementId.startsWith('G-')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    send_page_view: true
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
    page_path: window.location.pathname
  });
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('[data-newsletter-form]')) {
    trackEvent('newsletter_signup_submit', {
      page_path: window.location.pathname
    });
  }
});

loadGoogleAnalytics(GA_MEASUREMENT_ID);
