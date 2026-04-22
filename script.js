// Interactive behaviors for buttons and navigation

document.addEventListener("DOMContentLoaded", () => {
  function initAboutStorySliders() {
    document.querySelectorAll(".about-story-slider").forEach((root) => {
      if (root.dataset.aboutSliderReady === "1") return;
      const slides = root.querySelectorAll(".about-story-slider-slide");
      const track = root.querySelector(".about-story-slider-track");
      const dotsWrap = root.querySelector(".about-story-slider-dots");
      const prevBtn = root.querySelector(".about-story-slider-prev");
      const nextBtn = root.querySelector(".about-story-slider-next");
      if (!slides.length || !track || !dotsWrap) return;
      root.dataset.aboutSliderReady = "1";

      const intervalMs = Math.max(
        2500,
        parseInt(String(root.getAttribute("data-slider-interval-ms") || "3500"), 10) || 3500
      );
      let index = 0;
      let timer = null;

      const setSlide = (i) => {
        index = (i + slides.length) % slides.length;
        const viewportWidth = root.clientWidth || 0;
        const x = Math.round(-index * viewportWidth);
        track.style.transform = `translate3d(${x}px, 0, 0)`;
        slides.forEach((slide, j) => {
          const on = j === index;
          slide.classList.toggle("is-active", on);
          slide.setAttribute("aria-hidden", on ? "false" : "true");
        });
        dotsWrap.querySelectorAll(".about-story-slider-dot").forEach((dot, j) => {
          dot.setAttribute("aria-selected", j === index ? "true" : "false");
        });
      };

      const stopTimer = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };

      const startTimer = () => {
        if (document.hidden) return;
        stopTimer();
        timer = window.setInterval(() => setSlide(index + 1), intervalMs);
      };

      const restartTimer = () => {
        stopTimer();
        startTimer();
      };

      slides.forEach((_, j) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "about-story-slider-dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `Photo ${j + 1} of ${slides.length}`);
        dot.addEventListener("click", () => {
          setSlide(j);
          restartTimer();
        });
        dotsWrap.appendChild(dot);
      });

      prevBtn?.addEventListener("click", () => {
        setSlide(index - 1);
        restartTimer();
      });
      nextBtn?.addEventListener("click", () => {
        setSlide(index + 1);
        restartTimer();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopTimer();
        else startTimer();
      });
      window.addEventListener("resize", () => setSlide(index), { passive: true });

      setSlide(0);
      startTimer();
    });
  }

  initAboutStorySliders();

  // Device hint class for platform-specific visual polish.
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const isIOS =
    /iPad|iPhone|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) {
    document.body.classList.add("ios-device");
  }

  if (isAndroid) {
    document.body.classList.add("android-device");

    // Android-only: use explicit emoji glyphs for footer contact icons.
    const footerContactRows = document.querySelectorAll(".footer-contact-row");
    footerContactRows.forEach((row) => {
      const icon = row.querySelector(".footer-icon");
      if (!icon) return;

      const rowText = (row.textContent || "").toLowerCase();
      let emoji = "";
      if (rowText.includes("@")) emoji = "📧";
      else if (rowText.includes("tel:")) emoji = "☎️";
      else if (rowText.includes("mobile:")) emoji = "📱";

      if (emoji) {
        icon.textContent = emoji;
      }
    });
  }

  /**
   * Lenis smooth scroll on any page with `<html class="lenis-scroll">`. Self-hosted `js/lenis.min.js`.
   * Browsers often disable CSS `scroll-behavior: smooth` and `scrollIntoView({behavior:'smooth'})`
   * when the user prefers reduced motion—Lenis uses its own interpolation, so it still feels smooth
   * (like many marketing sites) once this script runs. Not gated on prefers-reduced-motion.
   * Tune: wheelMultiplier / lerp (see Lenis docs).
   */
  let bineLenis = null;
  const HOME_HASH_SCROLL_OFFSET = -80;

  const LenisCtor = typeof Lenis !== "undefined" ? Lenis : window.Lenis || globalThis.Lenis;
  if (LenisCtor) {
    document.documentElement.style.scrollBehavior = "auto";
    bineLenis = new LenisCtor({
      autoRaf: true,
      smoothWheel: true,
      wheelMultiplier: 1.15,
      touchMultiplier: 1.15,
      lerp: 0.085,
    });
  }

  /** Call after body/html overflow scroll-lock is cleared so Lenis resyncs (fixes “back to normal” scroll). */
  function refreshLenisAfterScrollLock() {
    if (!bineLenis) return;
    requestAnimationFrame(() => {
      bineLenis.resize();
    });
  }

  if (bineLenis) {
    let lenisResizeRaf = 0;
    window.addEventListener(
      "resize",
      () => {
        cancelAnimationFrame(lenisResizeRaf);
        lenisResizeRaf = requestAnimationFrame(() => bineLenis.resize());
      },
      { passive: true }
    );
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshLenisAfterScrollLock();
    });
  }

  function scrollToHashAnchor(href, event) {
    if (!href || !href.startsWith("#")) return false;
    const id = href.slice(1);
    if (!id) return false;
    const target = document.getElementById(id);
    if (!target) return false;
    if (event) event.preventDefault();
    if (bineLenis) {
      bineLenis.scrollTo(target, { offset: HOME_HASH_SCROLL_OFFSET });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  }

  // 0) Homepage: hide header on scroll down, show on scroll up (smooth slide like Framer)
  const headerWrap = document.getElementById("header-wrap");
  if (headerWrap) {
    let lastScrollY = getScrollY();
    const scrollThreshold = 80;

    function getScrollY() {
      return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
    }

    function updateHeaderVisibility() {
      const currentScrollY = getScrollY();
      if (currentScrollY <= scrollThreshold) {
        headerWrap.classList.remove("header-hidden");
      } else if (currentScrollY > lastScrollY) {
        headerWrap.classList.add("header-hidden");
      } else if (currentScrollY < lastScrollY) {
        headerWrap.classList.remove("header-hidden");
      }
      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", updateHeaderVisibility, { passive: true });
    window.addEventListener("resize", updateHeaderVisibility, { passive: true });

    // Sync once after load and after reveal animation
    setTimeout(updateHeaderVisibility, 100);
    requestAnimationFrame(updateHeaderVisibility);
  }

  // 1) Hero Industrial/Construction buttons are plain links to industrial.html and construction.html (no toggle)

  // 2) Toggle active state for top navigation links (excluding Get started)
  const navLinks = document.querySelectorAll(".main-nav ul a");
  const mainNav = document.querySelector(".main-nav");
  const navToggle = document.querySelector(".nav-toggle");

  // Measure header height so mobile nav can fill the rest of the viewport cleanly
  const siteHeader = document.querySelector(".site-header");
  const updateNavOffset = () => {
    if (!siteHeader) return;
    const headerHeight = siteHeader.offsetHeight || 0;
    document.documentElement.style.setProperty(
      "--nav-offset",
      `${headerHeight}px`
    );
  };
  updateNavOffset();
  window.addEventListener("resize", updateNavOffset);

  // Mobile navigation toggle: half-height dropdown, overlay, click-outside to close
  let closeMenu = () => {};
  if (mainNav && navToggle) {
    const restoreBodyScroll = () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (bineLenis) {
        bineLenis.start();
        refreshLenisAfterScrollLock();
      }
    };

    let navOverlay = document.querySelector(".nav-overlay");
    if (!navOverlay) {
      navOverlay = document.createElement("div");
      navOverlay.className = "nav-overlay";
      navOverlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(navOverlay);
    }

    closeMenu = () => {
      mainNav.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      if (navOverlay) navOverlay.classList.remove("is-visible");
      restoreBodyScroll();
    };

    navToggle.addEventListener("click", () => {
      const willOpen = !mainNav.classList.contains("is-open");
      mainNav.classList.toggle("is-open", willOpen);
      navToggle.classList.toggle("is-open", willOpen);
      navToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (navOverlay) navOverlay.classList.toggle("is-visible", willOpen);
      if (willOpen) {
        if (bineLenis) bineLenis.stop();
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        restoreBodyScroll();
      }
    });

    navOverlay.addEventListener("click", closeMenu);

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 960) {
          closeMenu();
        }
      },
      { passive: true }
    );
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";

      // In-page hash links: smooth scroll to target, then update active state
      if (href.startsWith("#")) {
        event.preventDefault();
        const id = href.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          if (bineLenis) {
            bineLenis.scrollTo(target, { offset: HOME_HASH_SCROLL_OFFSET });
          } else {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }

      // Remove active class from all nav links
      navLinks.forEach((l) => l.classList.remove("active"));

      // Set active on the clicked one
      link.classList.add("active");

      // Close mobile menu after selecting a link (overlay + body scroll cleared)
      if (window.innerWidth <= 960) {
        closeMenu();
      }
    });
  });

  // Footer: highlight the current Company page link (About/Services/Products/etc.)
  const footerCompanyLinks = Array.from(
    document.querySelectorAll(".footer-links-group ul a")
  ).filter((link) => {
    const group = link.closest(".footer-links-group");
    const heading = group?.querySelector("h4");
    return heading && (heading.textContent || "").trim().toLowerCase() === "company";
  });
  if (footerCompanyLinks.length) {
    const normalizePath = (value) => {
      const path = (value || "").toLowerCase().replace(/\\/g, "/");
      const clean = path.endsWith("/") ? `${path}index.html` : path;
      const parts = clean.split("/");
      return parts[parts.length - 1] || "index.html";
    };

    const currentPath = normalizePath(window.location.pathname || "index.html");
    const currentHash = (window.location.hash || "").toLowerCase();

    footerCompanyLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (!href) return;

      let isActive = false;

      if (href.startsWith("#")) {
        // On homepage, section links only become active when that section hash is open.
        isActive =
          currentPath === "index.html" &&
          currentHash.length > 0 &&
          href.toLowerCase() === currentHash;
      } else {
        let url;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }
        const linkPath = normalizePath(url.pathname);
        const linkHash = (url.hash || "").toLowerCase();

        // Exact page match for normal links (about/services/products/projects/privacy/cookie).
        if (linkPath === currentPath) {
          // If link contains hash, require hash match too; otherwise page match is enough.
          isActive = !linkHash || linkHash === currentHash;
        }

        // For links to index sections (e.g., index.html#contact), only active when hash matches.
        if (linkPath === "index.html" && linkHash) {
          isActive = currentPath === "index.html" && currentHash === linkHash;
        }
      }

      link.classList.toggle("footer-link-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  document.querySelectorAll("footer a[href^='#']").forEach((link) => {
    link.addEventListener("click", (e) => {
      scrollToHashAnchor(link.getAttribute("href") || "", e);
    });
  });

  const navCtaHash = document.querySelector(".main-nav a.nav-cta[href^='#']");
  if (navCtaHash) {
    navCtaHash.addEventListener("click", (e) => {
      scrollToHashAnchor(navCtaHash.getAttribute("href") || "", e);
    });
  }

  /* Get started (nav-cta) is outside .main-nav ul – must close menu on mobile (fixes scroll lock bug) */
  mainNav?.addEventListener(
    "click",
    (e) => {
      const link = e.target?.closest?.("a");
      if (link && link.classList.contains("nav-cta") && window.innerWidth <= 960) {
        closeMenu();
      }
    },
    { capture: true }
  );

  // Defer reveal/stagger so the page paints first (faster perceived load, especially on Services/Projects)
  requestAnimationFrame(() => {
    // 3) Reveal-on-load animations (header, etc. – not scroll-reveal)
    const revealEls = document.querySelectorAll(".reveal-on-load");
    revealEls.forEach((el, index) => {
      if (el.classList.contains("scroll-reveal")) return;
      const delay = 0.15 * index;
      el.style.animationDelay = `${delay}s`;
      el.classList.add("is-visible");
    });

    // 3b) Staggered reveal on load (hero on index + top sections on other pages)
    const staggerSections = document.querySelectorAll(
      ".hero-section.hero-reveal-on-load, .stagger-reveal-on-load"
    );
    staggerSections.forEach((section) => {
      if (section.classList.contains("hero-reveal-on-load")) {
        section.classList.add("hero-revealed");
      }
      if (section.classList.contains("stagger-reveal-on-load")) {
        /* Skip contact form & hidden wizard panels – their stagger is triggered manually */
        if (section.closest("#contact-form")) return;
        if (section.closest(".about-story-expand-section")) return;
        if (section.closest(".wizard-panel:not(.is-active)")) return;
        section.classList.add("stagger-revealed");
      }
    });

    // 4) Scroll-triggered reveal (run after first paint)
    const scrollRevealEls = document.querySelectorAll(".scroll-reveal");
    if (scrollRevealEls.length && "IntersectionObserver" in window) {
      const staggerStep = 0.08;
      /** About page Core Values: much larger gap between each box’s reveal start */
      const aboutCoreStaggerStep = 0.26;

      const applyScrollRevealStaggerDelay = (el) => {
        const aboutCoreGrid = el.closest(".about-core-section .about-core-grid");
        if (aboutCoreGrid && el.classList.contains("about-core-card")) {
          const items = aboutCoreGrid.querySelectorAll(".about-core-card");
          const idx = [...items].indexOf(el);
          if (idx >= 0) {
            const delaySec = idx * aboutCoreStaggerStep;
            el.style.transitionDelay = `${delaySec}s`;
            /* Stagger delay must not apply to later hovers — inline delay was slowing lift/shadow */
            const revealMs = Math.ceil((delaySec + 0.65) * 1000);
            window.setTimeout(() => {
              el.style.removeProperty("transition-delay");
            }, revealMs);
          }
          return;
        }

        const storyInner = el.closest(".about-story-box-inner");
        if (storyInner) {
          const items = storyInner.querySelectorAll(".scroll-reveal");
          const idx = [...items].indexOf(el);
          if (idx >= 0) el.style.transitionDelay = `${idx * staggerStep}s`;
          return;
        }

        const staggerParent = el.closest(".about-stagger-parent");
        if (staggerParent) {
          const items = staggerParent.querySelectorAll(".scroll-reveal");
          const idx = [...items].indexOf(el);
          if (idx >= 0) el.style.transitionDelay = `${idx * staggerStep}s`;
          return;
        }

        const missionGrid = el.closest(".about-mission-commitment-grid");
        if (
          missionGrid &&
          (el.classList.contains("about-mission-column") || el.classList.contains("about-commitment-card"))
        ) {
          const siblings = missionGrid.querySelectorAll(".about-mission-column, .about-commitment-card");
          const idx = [...siblings].indexOf(el);
          if (idx >= 0) el.style.transitionDelay = `${idx * staggerStep}s`;
          return;
        }

        const goalsGrid = el.closest(".about-goals-vision-grid");
        if (
          goalsGrid &&
          (el.classList.contains("about-goals-card") || el.classList.contains("about-vision-column"))
        ) {
          const siblings = goalsGrid.querySelectorAll(".about-goals-card, .about-vision-column");
          const idx = [...siblings].indexOf(el);
          if (idx >= 0) el.style.transitionDelay = `${idx * staggerStep}s`;
          return;
        }

        const parent =
          el.closest(".services-grid") ||
          el.closest(".divisions-grid") ||
          el.closest(".advantage-grid") ||
          el.closest(".why-grid") ||
          el.closest(".about-grid") ||
          el.closest(".about-core-grid") ||
          el.closest(".construction-services-grid") ||
          el.closest(".bcdc-advantage-grid") ||
          el.closest(".industrial-advantage-grid");
        const isStaggerCard =
          el.classList.contains("service-panel") ||
          el.classList.contains("division-card") ||
          el.classList.contains("advantage-card") ||
          el.classList.contains("why-card") ||
          el.classList.contains("about-card") ||
          el.classList.contains("about-core-card") ||
          el.classList.contains("construction-service-card") ||
          el.classList.contains("bcdc-advantage-card") ||
          el.classList.contains("industrial-advantage-card");
        if (parent && isStaggerCard) {
          const siblings = parent.querySelectorAll(
            ".service-panel, .division-card, .advantage-card, .why-card, .about-card, .about-core-card, .construction-service-card, .bcdc-advantage-card, .industrial-advantage-card"
          );
          const idx = [...siblings].indexOf(el);
          if (idx >= 0) el.style.transitionDelay = `${idx * staggerStep}s`;
        }
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            applyScrollRevealStaggerDelay(el);
            el.classList.add("is-visible");
            observer.unobserve(el);
          });
        },
        { rootMargin: "0px 0px -50px 0px", threshold: 0 }
      );
      scrollRevealEls.forEach((el) => observer.observe(el));
    }
  });

  // Defer all page-specific UI (Services, About, Projects) so first paint is not blocked — fixes slight pause on Services/Projects
  requestAnimationFrame(() => {
    try {
      runPageSpecificScripts();
    } catch (err) {
      console.error("runPageSpecificScripts:", err);
    }
  });

  function runPageSpecificScripts() {
  // 4a) Homepage contact form – empty dropdown first, then elements appear one by one
  const contactFormToggle = document.getElementById("contact-form-toggle");
  const contactFormSection = document.getElementById("contact-form");
  const contactFormInner = contactFormSection?.querySelector(".contact-form-inner");
  if (contactFormToggle && contactFormSection && contactFormInner) {
    const DROPDOWN_DURATION = 500;
    const staggerContainers = () =>
      contactFormSection.querySelectorAll(".stagger-reveal-on-load");

    contactFormToggle.addEventListener("click", () => {
      const isExpanding = contactFormSection.classList.contains("contact-form-collapsed");

      if (isExpanding) {
        /* Expand: hide content first, then open dropdown (empty), then reveal after it finishes */
        contactFormInner.classList.add("contact-form-content-pending");
        contactFormSection.classList.remove("contact-form-collapsed");
        contactFormToggle.setAttribute("aria-expanded", "true");
        contactFormSection.setAttribute("aria-hidden", "false");
        const toggleText = contactFormToggle.querySelector(".contact-form-toggle-text");
        if (toggleText) toggleText.textContent = "Hide Form";
        if (bineLenis) {
          bineLenis.scrollTo(contactFormSection, { offset: HOME_HASH_SCROLL_OFFSET });
        } else {
          contactFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        setTimeout(() => {
          contactFormInner.classList.remove("contact-form-content-pending");
          staggerContainers().forEach((el) => {
            el.classList.remove("stagger-revealed");
            void el.offsetHeight;
            el.classList.add("stagger-revealed");
          });
        }, DROPDOWN_DURATION);
      } else {
        /* Collapse: hide content, close dropdown, clear stagger */
        contactFormInner.classList.add("contact-form-content-pending");
        contactFormSection.classList.add("contact-form-collapsed");
        contactFormToggle.setAttribute("aria-expanded", "false");
        contactFormSection.setAttribute("aria-hidden", "true");
        const toggleText = contactFormToggle.querySelector(".contact-form-toggle-text");
        if (toggleText) toggleText.textContent = "Contact";
        staggerContainers().forEach((el) => el.classList.remove("stagger-revealed"));
      }
    });
  }

  // ── Form validation (shared by contact + quote forms) ──
  function getFieldError(field) {
    if (field.type === "checkbox") {
      if (field.required && !field.checked) {
        return "Please agree to the Privacy Policy before submitting.";
      }
      return null;
    }

    const val = field.value.trim();
    const empty = field.tagName === "SELECT" ? !field.value : !val;
    if (empty) return "required";

    if (field.type === "email" && val) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Please enter a valid email address";
    }

    if (field.type === "tel" && val) {
      const digits = val.replace(/\D/g, "");
      if (digits.length !== 10) return "Please enter a complete 10-digit number";
    }

    return null;
  }

  function showFieldError(field, errorText) {
    const wrapper = field.closest(".quote-field, .contact-field, .stagger-reveal-item");
    const label = wrapper?.querySelector("label");
    const name = label ? label.textContent.replace(/\s*\*\s*$/, "").trim() : "This field";
    const msg = document.createElement("span");
    msg.className = "field-error-msg";
    msg.setAttribute("role", "alert");
    msg.textContent = errorText === "required" ? name + " is required" : errorText;
    field.classList.add("field-invalid");
    field.setAttribute("aria-invalid", "true");
    const outerWrap = field.closest(".quote-phone-wrap") || field.closest(".search-dropdown");
    (outerWrap || field).insertAdjacentElement("afterend", msg);
  }

  function validateForm(form) {
    let firstInvalid = null;
    form.querySelectorAll("[required]").forEach((field) => {
      const wrapper = field.closest(".quote-field, .contact-field, .stagger-reveal-item");
      const existing = wrapper?.querySelector(".field-error-msg");
      if (existing) existing.remove();
      field.classList.remove("field-invalid");

      const error = getFieldError(field);
      if (error) {
        showFieldError(field, error);
        if (!firstInvalid) firstInvalid = field;
      }
    });
    return firstInvalid;
  }

  function clearFieldError(field) {
    const wrapper = field.closest(".quote-field, .contact-field, .stagger-reveal-item");
    const msg = wrapper?.querySelector(".field-error-msg");
    if (msg) msg.remove();
    field.classList.remove("field-invalid");
    field.removeAttribute("aria-invalid");
  }

  const API_ENDPOINTS = {
    contact: "/api/contact",
    quote: "/api/quote",
  };

  function updateFormStatus(form, type, message) {
    const statusEl = form.querySelector(".form-status");
    if (!statusEl) {
      if (message) alert(message);
      return;
    }

    statusEl.hidden = false;
    statusEl.textContent = message || "";
    statusEl.classList.remove("is-success", "is-error", "is-loading");
    if (type === "success") statusEl.classList.add("is-success");
    if (type === "error") statusEl.classList.add("is-error");
    if (type === "loading") statusEl.classList.add("is-loading");
  }

  function clearFormStatus(form) {
    const statusEl = form.querySelector(".form-status");
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = "";
    statusEl.classList.remove("is-success", "is-error", "is-loading");
  }

  function toPayload(form) {
    const data = new FormData(form);
    const payload = {};
    data.forEach((value, key) => {
      payload[key] = typeof value === "string" ? value.trim() : value;
    });
    return payload;
  }

  async function postFormPayload(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let body = {};
    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    if (!response.ok) {
      const errorMessage = body?.error || "Unable to submit your request right now. Please try again.";
      throw new Error(errorMessage);
    }

    return body;
  }

  function setSubmitState(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
    if (isLoading) {
      submitBtn.dataset.originalText = submitBtn.innerHTML;
      submitBtn.textContent = "Sending...";
      return;
    }

    if (submitBtn.dataset.originalText) {
      submitBtn.innerHTML = submitBtn.dataset.originalText;
      delete submitBtn.dataset.originalText;
    }
  }

  function setupFormValidation(form, options) {
    if (!form) return;
    const endpoint = options?.endpoint;
    const successMessage = options?.successMessage || "Your request has been submitted successfully.";
    const onSuccess = options?.onSuccess;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const firstInvalid = validateForm(form);
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      clearFormStatus(form);
      setSubmitState(form, true);
      updateFormStatus(form, "loading", "Submitting your request...");

      try {
        const payload = toPayload(form);
        await postFormPayload(endpoint, payload);
        updateFormStatus(form, "success", successMessage);
        form.reset();
        if (typeof onSuccess === "function") onSuccess();
      } catch (error) {
        updateFormStatus(
          form,
          "error",
          error?.message || "Unable to submit your request right now. Please try again."
        );
      } finally {
        setSubmitState(form, false);
      }
    });
    form.querySelectorAll("[required]").forEach((field) => {
      field.addEventListener("input", () => {
        clearFieldError(field);
        clearFormStatus(form);
      });
      field.addEventListener("change", () => {
        clearFieldError(field);
        clearFormStatus(form);
      });
    });
  }

  // 4b) Homepage contact form
  setupFormValidation(
    document.getElementById("home-contact-form"),
    {
      endpoint: API_ENDPOINTS.contact,
      successMessage: "Thanks for reaching out. Our team will get back to you within 24 hours.",
    }
  );

  // Quote form wizard
  const quoteForm = document.getElementById("quote-form");
  if (quoteForm) {
    const panels = quoteForm.querySelectorAll(".wizard-panel");
    const dots = quoteForm.querySelectorAll(".wizard-step-dot");
    const labels = quoteForm.querySelectorAll(".wizard-step-label");
    const lineFills = [
      document.getElementById("wizard-line-1"),
      document.getElementById("wizard-line-2"),
    ];
    let currentStep = 1;

    function updateProgress(step) {
      dots.forEach((dot) => {
        const s = parseInt(dot.dataset.step);
        dot.classList.toggle("is-active", s === step);
        dot.classList.toggle("is-done", s < step);
      });
      labels.forEach((label, i) => {
        label.classList.toggle("is-active", i + 1 === step);
        label.classList.toggle("is-done", i + 1 < step);
      });
      lineFills.forEach((line, i) => {
        if (line) line.classList.toggle("is-filled", i + 1 < step);
      });
    }

    function goToStep(step) {
      const currentPanel = quoteForm.querySelector('.wizard-panel.is-active');
      if (currentPanel) {
        const stagger = currentPanel.querySelector(".wizard-panel-stagger");
        if (stagger) stagger.classList.remove("stagger-revealed");
        currentPanel.classList.remove("is-active");
      }

      const nextPanel = quoteForm.querySelector('[data-wizard-step="' + step + '"]');
      if (nextPanel) {
        nextPanel.classList.add("is-active");
        const stagger = nextPanel.querySelector(".wizard-panel-stagger");
        if (stagger) {
          stagger.classList.remove("stagger-revealed");
          void stagger.offsetHeight;
          stagger.classList.add("stagger-revealed");
        }
      }

      currentStep = step;
      updateProgress(step);
    }

    function validateCurrentStep() {
      const panel = quoteForm.querySelector('.wizard-panel.is-active');
      if (!panel) return true;
      let firstInvalid = null;
      panel.querySelectorAll("[required]").forEach((field) => {
        const wrapper = field.closest(".quote-field, .stagger-reveal-item");
        const existing = wrapper?.querySelector(".field-error-msg");
        if (existing) existing.remove();
        field.classList.remove("field-invalid");
        if (field.disabled) return;

        const error = getFieldError(field);
        if (error) {
          showFieldError(field, error);
          if (!firstInvalid) firstInvalid = field;
        }
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return false;
      }
      return true;
    }

    quoteForm.addEventListener("click", (e) => {
      const nextBtn = e.target.closest(".wizard-btn-next");
      const backBtn = e.target.closest(".wizard-btn-back");
      if (nextBtn) {
        if (!validateCurrentStep()) return;
        if (currentStep < panels.length) goToStep(currentStep + 1);
      }
      if (backBtn) {
        if (currentStep > 1) goToStep(currentStep - 1);
      }
    });

    quoteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateCurrentStep()) return;

      clearFormStatus(quoteForm);
      setSubmitState(quoteForm, true);
      updateFormStatus(quoteForm, "loading", "Submitting your quote request...");

      try {
        const payload = toPayload(quoteForm);
        await postFormPayload(API_ENDPOINTS.quote, payload);

        updateFormStatus(
          quoteForm,
          "success",
          "Quote request submitted. Our team will get back to you within 24 hours."
        );
      } catch (error) {
        updateFormStatus(
          quoteForm,
          "error",
          error?.message || "Unable to submit your quote right now. Please try again."
        );
      } finally {
        setSubmitState(quoteForm, false);
      }
    });

    quoteForm.querySelectorAll("[required]").forEach((field) => {
      field.addEventListener("input", () => {
        clearFieldError(field);
        clearFormStatus(quoteForm);
      });
      field.addEventListener("change", () => {
        clearFieldError(field);
        clearFormStatus(quoteForm);
      });
    });
  }

  // ── Philippine Location Search (Province → City cascading dropdowns) ──
  (function initLocationSearch() {
    const provinceInput = document.getElementById("quote-province");
    const cityInput = document.getElementById("quote-city");
    const provinceList = document.getElementById("province-list");
    const cityList = document.getElementById("city-list");
    const provinceHidden = document.getElementById("quote-province-value");
    const cityHidden = document.getElementById("quote-city-value");
    const provinceDropdown = document.getElementById("province-dropdown");
    const cityDropdown = document.getElementById("city-dropdown");

    if (!provinceInput || !cityInput) return;

    let allProvinces = [];
    let provinceCityMap = {};
    let provinceRegionMap = {};
    let highlightIdx = -1;

    async function loadLocationData() {
      if (typeof PHGeo === "undefined") return;
      await PHGeo.ensureDataLoaded();
      const data = PHGeo.data;
      if (!data || !data.regions) return;

      const provinceSet = new Set();
      const regionNames = new Set(Object.keys(data.regions).map((r) => r.toLowerCase()));

      for (const regionName of Object.keys(data.regions)) {
        const region = data.regions[regionName];
        if (!region.provinces) continue;
        for (const provinceName of Object.keys(region.provinces)) {
          const lower = provinceName.toLowerCase();
          const isRegion = regionNames.has(lower) || /\(NCR\)|Region|BARMM|CAR|CARAGA/i.test(provinceName);
          if (isRegion && provinceName !== "Metro Manila") continue;

          const province = region.provinces[provinceName];
          const cities = province.cities ? Object.keys(province.cities).sort() : [];

          if (provinceSet.has(provinceName)) {
            if (provinceCityMap[provinceName]) {
              const merged = new Set([...provinceCityMap[provinceName], ...cities]);
              provinceCityMap[provinceName] = [...merged].sort();
            }
            continue;
          }

          provinceSet.add(provinceName);
          provinceRegionMap[provinceName] = regionName;
          provinceCityMap[provinceName] = cities;
        }
      }
      allProvinces = [...provinceSet].sort();
      provinceInput.placeholder = "Type to search province...";
    }

    function highlightMatch(text, query) {
      if (!query) return text;
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return text;
      return text.slice(0, idx) + "<mark>" + text.slice(idx, idx + query.length) + "</mark>" + text.slice(idx + query.length);
    }

    function renderList(listEl, items, query, onSelect, wrapperEl) {
      listEl.innerHTML = "";
      highlightIdx = -1;
      if (!items.length) {
        const li = document.createElement("li");
        li.className = "search-dropdown-empty";
        li.textContent = query ? "No results found" : "Type to search...";
        listEl.appendChild(li);
        wrapperEl.classList.add("is-open");
        return;
      }
      const shown = items.slice(0, 50);
      shown.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = highlightMatch(item, query);
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          onSelect(item);
        });
        listEl.appendChild(li);
      });
      wrapperEl.classList.add("is-open");
    }

    function closeAll() {
      provinceDropdown?.classList.remove("is-open");
      cityDropdown?.classList.remove("is-open");
      highlightIdx = -1;
    }

    function keyboardNav(e, listEl, wrapperEl, onSelect, items) {
      const lis = listEl.querySelectorAll("li:not(.search-dropdown-empty)");
      if (!lis.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightIdx = Math.min(highlightIdx + 1, lis.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightIdx = Math.max(highlightIdx - 1, 0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < items.length) {
          onSelect(items[highlightIdx]);
        }
        return;
      } else if (e.key === "Escape") {
        closeAll();
        return;
      } else {
        return;
      }
      lis.forEach((li, i) => li.classList.toggle("is-highlighted", i === highlightIdx));
      lis[highlightIdx]?.scrollIntoView({ block: "nearest" });
    }

    let filteredProvinces = [];
    let filteredCities = [];

    function selectProvince(name) {
      provinceInput.value = name;
      if (provinceHidden) provinceHidden.value = name;
      closeAll();
      clearFieldError(provinceInput);

      const cities = provinceCityMap[name] || [];
      cityInput.value = "";
      if (cityHidden) cityHidden.value = "";
      cityInput.disabled = false;
      cityInput.placeholder = cities.length ? "Type to search city..." : "No cities found";
      filteredCities = cities;
    }

    function selectCity(name) {
      cityInput.value = name;
      if (cityHidden) cityHidden.value = name;
      closeAll();
      clearFieldError(cityInput);
    }

    function closeDropdown(wrapperEl) {
      wrapperEl?.classList.remove("is-open");
      highlightIdx = -1;
    }

    provinceInput.addEventListener("focus", () => {
      const q = provinceInput.value.trim().toLowerCase();
      filteredProvinces = q ? allProvinces.filter((p) => p.toLowerCase().includes(q)) : allProvinces;
      renderList(provinceList, filteredProvinces, q, selectProvince, provinceDropdown);
    });

    provinceInput.addEventListener("input", () => {
      const q = provinceInput.value.trim().toLowerCase();
      filteredProvinces = q ? allProvinces.filter((p) => p.toLowerCase().includes(q)) : allProvinces;
      renderList(provinceList, filteredProvinces, q, selectProvince, provinceDropdown);
      cityInput.value = "";
      cityInput.disabled = true;
      cityInput.placeholder = "Select province first";
      if (cityHidden) cityHidden.value = "";
      if (provinceHidden) provinceHidden.value = "";
    });

    provinceInput.addEventListener("keydown", (e) => {
      keyboardNav(e, provinceList, provinceDropdown, selectProvince, filteredProvinces);
    });

    provinceInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== provinceInput) closeDropdown(provinceDropdown);
      }, 150);
    });

    cityInput.addEventListener("focus", () => {
      if (cityInput.disabled) return;
      closeDropdown(provinceDropdown);
      const selectedProvince = provinceInput.value.trim();
      const cities = provinceCityMap[selectedProvince] || [];
      const q = cityInput.value.trim().toLowerCase();
      filteredCities = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
      renderList(cityList, filteredCities, q, selectCity, cityDropdown);
    });

    cityInput.addEventListener("input", () => {
      const selectedProvince = provinceInput.value.trim();
      const cities = provinceCityMap[selectedProvince] || [];
      const q = cityInput.value.trim().toLowerCase();
      filteredCities = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
      renderList(cityList, filteredCities, q, selectCity, cityDropdown);
      if (cityHidden) cityHidden.value = "";
    });

    cityInput.addEventListener("keydown", (e) => {
      keyboardNav(e, cityList, cityDropdown, selectCity, filteredCities);
    });

    cityInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== cityInput) closeDropdown(cityDropdown);
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#province-dropdown")) closeDropdown(provinceDropdown);
      if (!e.target.closest("#city-dropdown")) closeDropdown(cityDropdown);
    });

    loadLocationData();
  })();

  // 5) Construction/Services sections: dropdown groups (arrow down, boxes appear one by one)
  const serviceSections = document.querySelectorAll(".construction-services-section");

  serviceSections.forEach((section) => {
    const buttons = section.querySelectorAll(".construction-services-cta-btn");
    const panels = section.querySelectorAll(".services-dropdown-panel");
    if (!buttons.length || !panels.length) return;

    const panelsById = {};
    panels.forEach((panel) => {
      if (panel.id) panelsById[panel.id] = panel;
    });

    function closeAll() {
      buttons.forEach((btn) => {
        const targetId = btn.getAttribute("aria-controls");
        const panel = targetId ? panelsById[targetId] : null;
        if (!panel) return;
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        btn.classList.remove("is-expanded");
        btn.setAttribute("aria-expanded", "false");
        const arrow = btn.querySelector(".arrow-chevron");
        if (arrow) {
          arrow.classList.add("fa-chevron-right");
          arrow.classList.remove("fa-chevron-down");
        }
      });
    }

    buttons.forEach((btn) => {
      const targetId = btn.getAttribute("aria-controls");
      const panel = targetId ? panelsById[targetId] : null;
      if (!panel) return;

      btn.addEventListener("click", () => {
        const isOpen = panel.classList.contains("is-open");
        closeAll();
        const nextOpen = !isOpen;
        panel.classList.toggle("is-open", nextOpen);
        panel.setAttribute("aria-hidden", nextOpen ? "false" : "true");
        btn.classList.toggle("is-expanded", nextOpen);
        btn.setAttribute("aria-expanded", nextOpen ? "true" : "false");
        const arrow = btn.querySelector(".arrow-chevron");
        if (arrow) {
          arrow.classList.toggle("fa-chevron-right", !nextOpen);
          arrow.classList.toggle("fa-chevron-down", nextOpen);
        }
      });
    });
  });

  // 5a) road-banner-page — mobile: banner bg layer with slight zoom on scroll
  (function initConstructionBannerMobileScrollZoom() {
    if (!document.body.classList.contains("road-banner-page")) return;
    const banner = document.querySelector(".construction-road-banner--parallax");
    const layer = document.querySelector(".construction-road-banner-scroll-bg");
    if (!banner || !layer) return;

    const mobileMq = window.matchMedia("(max-width: 720px)");
    const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ticking = false;
    const zoomExtra = 0.072;

    function applyZoom() {
      ticking = false;
      if (!mobileMq.matches) {
        layer.style.transform = "";
        return;
      }
      if (reduceMotionMq.matches) {
        layer.style.transform = "scale(1)";
        return;
      }
      const rect = banner.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = Math.max(vh + rect.height * 0.75, 1);
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / span));
      const scale = 1 + progress * zoomExtra;
      layer.style.transform = `scale(${scale})`;
    }

    function onScrollOrResize() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyZoom);
      }
    }

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    if (typeof mobileMq.addEventListener === "function") {
      mobileMq.addEventListener("change", onScrollOrResize);
    } else if (typeof mobileMq.addListener === "function") {
      mobileMq.addListener(onScrollOrResize);
    }
    if (typeof reduceMotionMq.addEventListener === "function") {
      reduceMotionMq.addEventListener("change", onScrollOrResize);
    } else if (typeof reduceMotionMq.addListener === "function") {
      reduceMotionMq.addListener(onScrollOrResize);
    }

    applyZoom();
    requestAnimationFrame(applyZoom);
  })();

  // 6) Our Story expand / collapse (About page) — measured max-height so collapse animates
  // the real content height (large fixed max-height values make most of the duration invisible).
  const storyExpandSection = document.querySelector(".about-story-expand-section");
  const storyReadBtn = document.querySelector(".about-story-box .story-read-more");
  const storyExpandInner = document.querySelector(".about-story-expand-inner");
  const STORY_DROPDOWN_MS = 500;
  const storyReduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (storyExpandSection && storyReadBtn && storyExpandInner) {
    const storyToggleText = storyReadBtn.querySelector(".story-read-more-label");
    const storyStaggerContainers = () =>
      storyExpandSection.querySelectorAll(".stagger-reveal-on-load");
    let storyAnimatingClose = false;
    let storyAnimatingOpen = false;
    const ourStorySection = document.querySelector("#about-storyflow");

    const scrollToOurStoryAfterCollapse = () => {
      if (!ourStorySection) return;
      if (bineLenis) {
        bineLenis.scrollTo(ourStorySection, { offset: HOME_HASH_SCROLL_OFFSET });
      } else {
        const top =
          ourStorySection.getBoundingClientRect().top +
          window.scrollY +
          HOME_HASH_SCROLL_OFFSET;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: storyReduceMotionMq.matches ? "auto" : "smooth",
        });
      }
      if (bineLenis) {
        requestAnimationFrame(() => {
          bineLenis.resize();
        });
      }
    };

    const runStoryStaggerReveal = () => {
      storyExpandInner.classList.remove("about-story-content-pending");
      storyStaggerContainers().forEach((el) => {
        el.classList.remove("stagger-revealed");
        void el.offsetHeight;
        el.classList.add("stagger-revealed");
      });
    };

    const openStoryPanel = () => {
      if (storyReduceMotionMq.matches) {
        storyExpandInner.classList.add("about-story-content-pending");
        storyExpandSection.classList.remove("about-story-collapsed");
        storyExpandSection.style.maxHeight = "";
        storyReadBtn.setAttribute("aria-expanded", "true");
        storyExpandSection.setAttribute("aria-hidden", "false");
        if (storyToggleText) storyToggleText.textContent = "Show less";
        requestAnimationFrame(() => {
          runStoryStaggerReveal();
        });
        if (bineLenis) {
          bineLenis.scrollTo(storyExpandSection, { offset: HOME_HASH_SCROLL_OFFSET });
        } else {
          storyExpandSection.scrollIntoView({ behavior: "auto", block: "start" });
        }
        return;
      }

      storyAnimatingClose = false;
      storyAnimatingOpen = true;
      storyExpandInner.classList.add("about-story-content-pending");
      storyExpandSection.classList.remove("about-story-collapsed");
      storyExpandSection.style.maxHeight = "0px";
      void storyExpandSection.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const h = storyExpandSection.scrollHeight;
          storyExpandSection.style.maxHeight = `${h}px`;
        });
      });
      storyReadBtn.setAttribute("aria-expanded", "true");
      storyExpandSection.setAttribute("aria-hidden", "false");
      if (storyToggleText) storyToggleText.textContent = "Show less";
      if (bineLenis) {
        bineLenis.scrollTo(storyExpandSection, { offset: HOME_HASH_SCROLL_OFFSET });
      } else {
        storyExpandSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      setTimeout(() => {
        runStoryStaggerReveal();
      }, STORY_DROPDOWN_MS);
    };

    const closeStoryPanel = () => {
      if (storyReduceMotionMq.matches) {
        storyStaggerContainers().forEach((el) => el.classList.remove("stagger-revealed"));
        storyExpandSection.classList.add("about-story-collapsed");
        storyExpandSection.style.maxHeight = "";
        storyExpandInner.classList.add("about-story-content-pending");
        storyReadBtn.setAttribute("aria-expanded", "false");
        storyExpandSection.setAttribute("aria-hidden", "true");
        if (storyToggleText) storyToggleText.textContent = "Read more";
        requestAnimationFrame(() => {
          scrollToOurStoryAfterCollapse();
        });
        return;
      }

      storyAnimatingOpen = false;
      storyAnimatingClose = true;
      storyStaggerContainers().forEach((el) => el.classList.remove("stagger-revealed"));
      const h = storyExpandSection.scrollHeight;
      storyExpandSection.style.maxHeight = `${h}px`;
      void storyExpandSection.offsetHeight;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          storyExpandSection.style.maxHeight = "0px";
          scrollToOurStoryAfterCollapse();
        });
      });
      storyReadBtn.setAttribute("aria-expanded", "false");
      storyExpandSection.setAttribute("aria-hidden", "true");
      if (storyToggleText) storyToggleText.textContent = "Read more";
    };

    storyExpandSection.addEventListener("transitionend", (e) => {
      if (e.target !== storyExpandSection || e.propertyName !== "max-height") return;

      if (storyAnimatingClose) {
        storyAnimatingClose = false;
        storyExpandSection.classList.add("about-story-collapsed");
        storyExpandSection.style.maxHeight = "";
        storyExpandInner.classList.add("about-story-content-pending");
        if (bineLenis) {
          requestAnimationFrame(() => {
            bineLenis.resize();
          });
        }
        return;
      }

      if (storyAnimatingOpen && !storyExpandSection.classList.contains("about-story-collapsed")) {
        storyAnimatingOpen = false;
        storyExpandSection.style.maxHeight = "";
      }
    });

    storyReadBtn.addEventListener("click", () => {
      const isExpanding = storyExpandSection.classList.contains("about-story-collapsed");

      if (isExpanding) {
        openStoryPanel();
      } else {
        closeStoryPanel();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (storyExpandSection.classList.contains("about-story-collapsed")) return;
      closeStoryPanel();
      storyReadBtn.focus();
    });
  }

  // 7) Projects / Product Category filter tabs (safe per-section)
  const initProjectsTabs = (tabsContainer) => {
    const tabs = tabsContainer.querySelectorAll(".projects-tab");
    const indicator = tabsContainer.querySelector(".projects-tabs-indicator");
    const section = tabsContainer.closest("section") || document;
    const sectionId = section && section.id ? section.id : "";
    const grid = section.querySelector(".projects-grid");
    const cards = grid ? grid.querySelectorAll(".project-card") : [];
    if (!tabs.length || !cards.length) return;

    const moveIndicator = (activeTab) => {
      if (!indicator || !activeTab) return;
      const left = activeTab.offsetLeft;
      const width = activeTab.offsetWidth;
      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${width}px`;
    };

    const revealActiveTab = (activeTab) => {
      if (!activeTab || sectionId !== "product-category") return;
      const container = tabsContainer;
      const tabCenter = activeTab.offsetLeft + activeTab.offsetWidth / 2;
      const targetLeft = tabCenter - container.clientWidth / 2;
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const nextScrollLeft = Math.max(0, Math.min(targetLeft, maxScrollLeft));

      container.scrollTo({
        left: nextScrollLeft,
        behavior: "smooth",
      });
    };

    const applyFilter = (filter) => {
      const visibleCards = [];
      const normalized = (filter || "all").trim();

      cards.forEach((card, index) => {
        const category = card.getAttribute("data-category") || "";
        const matches =
          normalized === "all"
            ? true // All Projects / All Products: show all tiles
            : category === normalized;

        if (matches) {
          card.style.display = "";
          card.classList.remove("project-visible");
          visibleCards.push(card);
        } else {
          card.style.display = "none";
          card.classList.remove("project-visible");
        }
      });

      visibleCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add("project-visible");
        }, index * 160);
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        revealActiveTab(tab);
        moveIndicator(tab);
        applyFilter(tab.getAttribute("data-filter") || "all");
      });
    });

    let initialActive = tabsContainer.querySelector(".projects-tab.is-active") || tabs[0];
    let requestedCategory = "";

    if (sectionId === "product-category") {
      requestedCategory = new URLSearchParams(window.location.search).get("category") || "";
      if (requestedCategory) {
        const requestedTab = Array.from(tabs).find(
          (tab) => (tab.getAttribute("data-filter") || "") === requestedCategory
        );
        if (requestedTab) {
          tabs.forEach((t) => t.classList.remove("is-active"));
          requestedTab.classList.add("is-active");
          initialActive = requestedTab;
        }
      }
    }

    if (initialActive) {
      if (sectionId === "product-category") {
        tabsContainer.scrollLeft = 0;
      }
      revealActiveTab(initialActive);
      moveIndicator(initialActive);
      applyFilter(initialActive.getAttribute("data-filter") || "all");
    }
  };

  document.querySelectorAll(".projects-tabs").forEach(initProjectsTabs);

  // 8) Products page: clickable tiles → modal gallery
  const productModal = document.getElementById("product-modal");
  const productModalDialog = productModal?.querySelector(".product-modal-dialog");
  const productModalClose = productModal?.querySelector(".product-modal-close");
  const productModalTitle = document.getElementById("product-modal-title");
  const productModalSubtitle = document.getElementById("product-modal-subtitle");
  const productModalImg = document.getElementById("product-modal-image");
  const productModalEmpty = document.getElementById("product-modal-empty");
  const productModalCounter = document.getElementById("product-modal-counter");
  const productPrev = productModal?.querySelector(".product-modal-prev");
  const productNext = productModal?.querySelector(".product-modal-next");
  const productModalMedia = productModal?.querySelector(".product-modal-media");

  const productsSection = document.getElementById("product-category");
  const projectsSection = document.getElementById("projects");

  if (productModal && productModalDialog && productModalMedia && productModalClose && productModalTitle && productModalSubtitle && productModalImg && productModalEmpty && productModalCounter && productPrev && productNext) {
    let gallery = [];
    let galleryIndex = 0;
    let lastFocusedEl = null;
    let carouselEl = null;
    let carouselBound = false;

    const isMobileModal = () => {
      return window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
    };

    const ensureCarousel = () => {
      if (carouselEl) return carouselEl;
      carouselEl = document.createElement("div");
      carouselEl.className = "product-modal-carousel";
      productModalMedia.appendChild(carouselEl);
      return carouselEl;
    };

    // Mobile: block background scroll without altering body scroll position
    const preventBackgroundScroll = (e) => {
      if (!productModal.classList.contains("is-open")) return;
      if (!isMobileModal()) return;
      // Allow horizontal swipe inside the carousel (2+ images).
      if (carouselEl && e.target && carouselEl.contains(e.target)) return;
      e.preventDefault();
    };

    const lockPageScroll = () => {
      if (bineLenis) bineLenis.stop();
      if (isMobileModal()) {
        // iOS + Android mobile: don't touch body styles (prevents jump on close).
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
        document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
        productModal.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
        productModal.addEventListener("wheel", preventBackgroundScroll, { passive: false });
        // Also block gesture scrolling inside the dialog to prevent scroll chaining to the page.
        productModalDialog.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
        productModalDialog.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      } else {
        // Desktop: overflow lock is reliable and keeps background fixed.
        document.body.style.overflow = "hidden";
      }
    };

    const unlockPageScroll = () => {
      if (isMobileModal()) {
        document.documentElement.style.overflow = "";
        document.removeEventListener("touchmove", preventBackgroundScroll);
        document.removeEventListener("wheel", preventBackgroundScroll);
        productModal.removeEventListener("touchmove", preventBackgroundScroll);
        productModal.removeEventListener("wheel", preventBackgroundScroll);
        productModalDialog.removeEventListener("touchmove", preventBackgroundScroll);
        productModalDialog.removeEventListener("wheel", preventBackgroundScroll);
        document.body.style.overflow = "";
      } else {
        document.body.style.overflow = "";
      }
      if (bineLenis) {
        bineLenis.start();
        refreshLenisAfterScrollLock();
      }
    };

    const parseGallery = (value) => {
      return (value || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const galleryCounterLabel = () =>
      gallery.length > 1 ? `${galleryIndex + 1}/${gallery.length}` : "";

    const renderGallery = () => {
      const hasImages = gallery.length > 0;
      productModalEmpty.hidden = hasImages;
      productModalImg.style.display = "none";
      if (carouselEl) carouselEl.style.display = "none";

      productPrev.disabled = !hasImages || gallery.length <= 1;
      productNext.disabled = !hasImages || gallery.length <= 1;

      if (!hasImages) {
        productModalImg.removeAttribute("src");
        productModalImg.alt = "";
        productModalCounter.textContent = "";
        if (carouselEl) carouselEl.replaceChildren();
        return;
      }

      // Mobile: swipeable carousel for multi-photo products
      if (isMobileModal() && gallery.length > 1) {
        const c = ensureCarousel();
        c.style.display = "flex";
        c.replaceChildren(
          ...gallery.map((src) => {
            const slide = document.createElement("div");
            slide.className = "product-modal-slide";
            const img = document.createElement("img");
            img.className = "product-modal-slide-image";
            img.src = src;
            img.alt = (productModalTitle.textContent || "Product") + " photo";
            img.loading = "eager";
            slide.appendChild(img);
            return slide;
          })
        );

        if (!carouselBound) {
          carouselBound = true;
          c.addEventListener(
            "scroll",
            () => {
              const w = c.clientWidth || 1;
              const idx = Math.round(c.scrollLeft / w);
              galleryIndex = Math.max(0, Math.min(gallery.length - 1, idx));
              productModalCounter.textContent = galleryCounterLabel();
            },
            { passive: true }
          );
        }

        // Jump to current index
        requestAnimationFrame(() => {
          const w = c.clientWidth || 0;
          c.scrollLeft = w * galleryIndex;
        });

        productModalCounter.textContent = galleryCounterLabel();
        return;
      }

      // Desktop (and single-photo): normal image + nav buttons
      const src = gallery[galleryIndex];
      productModalImg.style.display = "block";
      productModalImg.src = src;
      productModalImg.alt = productModalTitle.textContent || "Product photo";
      productModalCounter.textContent = galleryCounterLabel();
    };

    const openProductModal = (tile) => {
      lastFocusedEl = document.activeElement;
      const title = tile.getAttribute("data-product-title") || tile.textContent?.trim() || "Product";
      gallery = parseGallery(tile.getAttribute("data-gallery"));
      galleryIndex = 0;
      productModalDialog.classList.remove("product-modal-bus-sheds");

      if (title === "Solar-powered Bus Shed") {
        productModalTitle.innerHTML = "<span>Solar-powered</span> <span>Bus Shed</span>";
        productModalDialog.classList.add("product-modal-bus-sheds");
      } else if (title === "Thermoplastic Road Marking" || title === "Thermoplasctic Road Marking") {
        productModalTitle.innerHTML = "Thermoplastic<br>Road Marking";
      } else {
        productModalTitle.textContent = title;
      }
      productModalSubtitle.textContent = gallery.length
        ? gallery.length > 1
          ? "Photos"
          : "Photo"
        : "Photos coming soon";

      productModal.classList.add("is-open");
      productModal.setAttribute("aria-hidden", "false");
      lockPageScroll();

      renderGallery();
      // On mobile, focusing can cause scroll jumps when closing.
      if (!isMobileModal()) {
        productModalClose.focus();
      }
    };

    const closeProductModal = () => {
      productModal.classList.remove("is-open");
      productModal.setAttribute("aria-hidden", "true");
      productModalDialog.classList.remove("product-modal-bus-sheds");
      unlockPageScroll();

      gallery = [];
      galleryIndex = 0;

      // On mobile, restoring focus can scroll the page unexpectedly.
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function" && !isMobileModal()) {
        lastFocusedEl.focus();
      }
    };

    const step = (dir) => {
      if (gallery.length <= 1) return;
      galleryIndex = (galleryIndex + dir + gallery.length) % gallery.length;
      renderGallery();
    };

    const handleTileClick = (e) => {
      const tile = e.target?.closest?.(".product-tile");
      if (!tile) return;
      openProductModal(tile);
    };
    if (productsSection) productsSection.addEventListener("click", handleTileClick);
    if (projectsSection) projectsSection.addEventListener("click", handleTileClick);

    productPrev.addEventListener("click", () => step(-1));
    productNext.addEventListener("click", () => step(1));
    productModalClose.addEventListener("click", closeProductModal);

    productModal.addEventListener("click", (e) => {
      if (e.target === productModal) closeProductModal();
    });

    // Prevent wheel/touch scrolling from bubbling to the page behind the modal
    productModalDialog.addEventListener(
      "wheel",
      (e) => e.stopPropagation(),
      { passive: true }
    );
    productModalDialog.addEventListener(
      "touchmove",
      (e) => e.stopPropagation(),
      { passive: true }
    );

    document.addEventListener("keydown", (e) => {
      if (!productModal.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        closeProductModal();
      } else if (e.key === "ArrowLeft") {
        step(-1);
      } else if (e.key === "ArrowRight") {
        step(1);
      }
    });
  }
  const isAndroidOrIOS = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const normalizePhoneDigits = (rawValue) => {
    let digits = rawValue.replace(/\D/g, "");
    if (!isAndroidOrIOS) {
      return digits.length > 10 ? digits.slice(0, 10) : digits;
    }

    // Pattern-first parsing for mobile suggestions/autofill.
    // Handles:
    // - +639XXXXXXXXX / 639XXXXXXXXX
    // - 09XXXXXXXXX (e.g. 09662292414)
    // - 9XXXXXXXXX
    const intlMatch = digits.match(/639\d{9}/);
    if (intlMatch) return intlMatch[0].slice(2); // -> 9XXXXXXXXX

    const localWithZeroMatch = digits.match(/09\d{9}/);
    if (localWithZeroMatch) return localWithZeroMatch[0].slice(1); // -> 9XXXXXXXXX

    const localMatch = digits.match(/9\d{9}/);
    if (localMatch) return localMatch[0];

    // Fallbacks for partially typed values.
    if (digits.length > 10) digits = digits.slice(0, 10);
    return digits;
  };

  document.querySelectorAll("#quote-phone, #contact-phone").forEach((phoneInput) => {
    const applyNormalizedValue = () => {
      const normalized = normalizePhoneDigits(phoneInput.value);
      if (phoneInput.value !== normalized) phoneInput.value = normalized;
    };

    phoneInput.addEventListener("input", applyNormalizedValue);
    phoneInput.addEventListener("change", applyNormalizedValue);
    phoneInput.addEventListener("blur", applyNormalizedValue);
    phoneInput.addEventListener("keyup", applyNormalizedValue);
    phoneInput.addEventListener("paste", () => setTimeout(applyNormalizedValue, 0));

    // iOS/Android keyboard suggestions can commit value slightly after input event.
    phoneInput.addEventListener("input", () => {
      setTimeout(applyNormalizedValue, 0);
      requestAnimationFrame(applyNormalizedValue);
    });
  });

  } // end runPageSpecificScripts
});

