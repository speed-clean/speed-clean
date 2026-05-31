// ============================================
// Speed Clean - Landing Page Scripts
// ============================================

// --- Supabase Config ---
const SUPABASE_URL = 'https://zpsohcjzbngfjnkmuwep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc29oY2p6Ym5nZmpua211d2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjAwOTksImV4cCI6MjA5MTI5NjA5OX0.WM4KpmAvXRS80nPTETqYaNTmHcneYv6csuLYpXwNAxM';

// Initialize Supabase client (loaded via CDN in HTML)
function getSupabase() {
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- UTM Helper ---
function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source:   params.get('utm_source')   || null,
    utm_medium:   params.get('utm_medium')   || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_term:     params.get('utm_term')     || null,
    utm_content:  params.get('utm_content')  || null,
  };
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initNavbarScroll();
  initCounters();
  initFAQ();
  initBeforeAfterSliders();
  initFormHandling();
  initSmoothScroll();
});

// --- Mobile Menu ---
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;

  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    links.classList.toggle('active');
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      btn.classList.remove('active');
      links.classList.remove('active');
    });
  });
}

// --- Navbar Scroll Effect ---
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// --- Animated Counters ---
function initCounters() {
  const counters = document.querySelectorAll('.stat-number');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const decimals = parseInt(el.dataset.decimals) || 0;
  const duration = 2000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;

    el.textContent = decimals > 0
      ? current.toFixed(decimals)
      : Math.floor(current).toLocaleString('he-IL');

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// --- FAQ Accordion ---
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');

  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      items.forEach(other => {
        other.classList.remove('active');
        other.querySelector('.faq-answer').style.maxHeight = '0';
      });

      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// --- Before/After Sliders ---
function initBeforeAfterSliders() {
  const sliders = document.querySelectorAll('[data-ba]');

  sliders.forEach(slider => {
    const before = slider.querySelector('.ba-before');
    const handle = slider.querySelector('.ba-handle');
    let isDragging = false;

    function updatePosition(x) {
      const rect = slider.getBoundingClientRect();
      let percentage = ((rect.right - x) / rect.width) * 100;
      percentage = Math.max(5, Math.min(95, percentage));
      before.style.width = percentage + '%';
      handle.style.right = percentage + '%';
    }

    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      updatePosition(e.clientX);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) updatePosition(e.clientX);
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    slider.addEventListener('touchstart', (e) => {
      isDragging = true;
      updatePosition(e.touches[0].clientX);
    });

    slider.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        updatePosition(e.touches[0].clientX);
      }
    });

    slider.addEventListener('touchend', () => {
      isDragging = false;
    });
  });
}

// --- Form Handling (Supabase) ---
function initFormHandling() {
  const sb = getSupabase();
  const forms = document.querySelectorAll('#heroForm, #contactForm');
  const utmData = getUTMParams();

  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'שולח...';
      btn.disabled = true;

      // Build the lead record
      const lead = {
        name:         data.name         || null,
        phone:        data.phone        || null,
        email:        data.email        || null,
        service:      data.service      || null,
        units:        data.units        || null,
        message:      data.message      || null,
        form_source:  form.id,
        page_url:     window.location.href,
        ...utmData,
      };

      try {
        // 1. Save to Supabase
        const { error } = await sb.from('leads').insert([lead]);
        if (error) throw error;

        // 2. Send to Make.com webhook (via serverless proxy)
        fetch('/api/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        }).catch(err => console.warn('Make webhook failed (non-blocking):', err));

        // 3. Push event to GTM dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'lead_submitted',
          form_id: form.id,
          lead_service: lead.service,
        });

        btn.textContent = 'נשלח בהצלחה! ✓';
        btn.style.background = '#10b981';
        form.reset();
        window.location.href = '/thank-you/';

      } catch (err) {
        console.error('Supabase insert error:', err);
        btn.textContent = 'שגיאה, נסו שוב';
        btn.style.background = '#ef4444';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.disabled = false;
        }, 3000);
      }
    });
  });
}

// --- Smooth Scroll ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
