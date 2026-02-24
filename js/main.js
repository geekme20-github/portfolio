/* ============================================
   MAIN.JS — Navigation, Animations & Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initCollapsibles();
  initSmoothScroll();
});

/* ---------- Navbar ---------- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  // Create sidebar backdrop overlay
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop && hamburger) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveLink();
  });

  // Toggle sidebar
  function toggleSidebar() {
    const isOpen = navLinks.classList.contains('active');
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    if (backdrop) backdrop.classList.toggle('active');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  }

  function closeSidebar() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', toggleSidebar);

    // Close on backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    // Close on link click (mobile)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeSidebar);
    });
  }
}

/* ---------- Active Link Tracking ---------- */
function updateActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

/* ---------- Scroll Reveal Animations ---------- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

/* ---------- Collapsible Sections ---------- */
function initCollapsibles() {
  const collapsibles = document.querySelectorAll('.collapsible-header');

  collapsibles.forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      const body = parent.querySelector('.collapsible-body');
      
      // Toggle active
      parent.classList.toggle('active');
      
      if (parent.classList.contains('active')) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0px';
      }
    });
  });
}

/* ---------- Smooth Scroll ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}
