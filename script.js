// Interactive behaviors for buttons and navigation

document.addEventListener("DOMContentLoaded", () => {
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
      document.body.style.overflow = willOpen ? "hidden" : "";
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
          target.scrollIntoView({ behavior: "smooth", block: "start" });
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
        section.classList.add("stagger-revealed");
      }
    });

    // 4) Scroll-triggered reveal (run after first paint)
    const scrollRevealEls = document.querySelectorAll(".scroll-reveal");
    if (scrollRevealEls.length && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const parent = el.closest(".divisions-grid") || el.closest(".advantage-grid") || el.closest(".why-grid") || el.closest(".about-grid") || el.closest(".about-core-grid") || el.closest(".construction-services-grid") || el.closest(".bcdc-advantage-grid");
            const isStaggerCard = el.classList.contains("division-card") || el.classList.contains("advantage-card") || el.classList.contains("why-card") || el.classList.contains("about-card") || el.classList.contains("about-core-card") || el.classList.contains("construction-service-card") || el.classList.contains("bcdc-advantage-card");
            if (parent && isStaggerCard) {
              const siblings = parent.querySelectorAll(".division-card, .advantage-card, .why-card, .about-card, .about-core-card, .construction-service-card, .bcdc-advantage-card");
              const idx = [...siblings].indexOf(el);
              el.style.transitionDelay = `${idx * 0.08}s`;
            }
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
    runPageSpecificScripts();
  });

  function runPageSpecificScripts() {
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

  // 5b) About page: timeline line and scroll move together (scroll-driven fill + glowing dot)
  const aboutTimeline = document.getElementById("about-timeline");
  const timelineLineFill = document.getElementById("timeline-line-fill");
  const timelineItems = document.querySelectorAll("#about-timeline .about-timeline-item");

  if (aboutTimeline && timelineLineFill && timelineItems.length) {
    function updateTimelineLine() {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const timelineRect = aboutTimeline.getBoundingClientRect();
      const sectionHeight = timelineRect.height;
      const viewportHeight = window.innerHeight;

      // First dot position (line always reaches at least this when timeline is in view)
      const firstItem = timelineItems[0];
      const firstDot = firstItem ? firstItem.querySelector(".about-timeline-dot") : null;
      const firstDotCenterY = firstDot
        ? (() => {
            const r = firstDot.getBoundingClientRect();
            return r.top - timelineRect.top + r.height / 2;
          })()
        : 40;

      const atTopOfPage = scrollY < 180;

      let fillHeight;
      let activeIndex;

      if (atTopOfPage) {
        // At very top of page: first circle glows, green line reaches first dot (always visible)
        fillHeight = Math.max(firstDotCenterY, 24);
        activeIndex = 0;
      } else {
        // Scrolled: fill grows with scroll so glow moves 1st → 2nd → 3rd (no skipping)
        const scrollStart = 180 - firstDotCenterY;
        const scrolledThroughSection = Math.max(0, Math.min(sectionHeight, scrollY - scrollStart));
        const atBottomOfPage =
          scrollY >=
          (document.documentElement.scrollHeight - window.innerHeight - 20);
        const timelineFullyScrolledPast = timelineRect.bottom < 0;

        if (atBottomOfPage || timelineFullyScrolledPast) {
          fillHeight = sectionHeight;
        } else {
          fillHeight = Math.min(
            sectionHeight,
            Math.max(firstDotCenterY, scrolledThroughSection)
          );
        }

        // Glow the dot that the line has reached (one by one)
        activeIndex = 0;
        timelineItems.forEach((item, index) => {
          const dot = item.querySelector(".about-timeline-dot");
          if (!dot) return;
          const dotRect = dot.getBoundingClientRect();
          const dotCenterY = dotRect.top - timelineRect.top + dotRect.height / 2;
          if (dotCenterY <= fillHeight + 2) {
            activeIndex = index;
          }
        });
      }

      timelineLineFill.style.height = fillHeight + "px";

      timelineItems.forEach((item, index) => {
        item.classList.toggle("about-timeline-item-active", index === activeIndex);
      });
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateTimelineLine();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", updateTimelineLine);
    updateTimelineLine();
    requestAnimationFrame(updateTimelineLine);
    setTimeout(updateTimelineLine, 100);
    setTimeout(updateTimelineLine, 400);
  }

  // 6) Our Story modal (About page)
  const storyButton = document.querySelector(".story-read-more");
  const storyModal = document.getElementById("story-modal");
  const storyClose = storyModal?.querySelector(".story-modal-close");

  if (storyButton && storyModal && storyClose) {
    // Detect iOS devices (including iPadOS) so we can apply a safer scroll-lock strategy.
    const isIOS =
      /iP(ad|hone|od)/i.test(window.navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    let storyScrollY = 0;

    const lockBodyScroll = () => {
      if (!isIOS) {
        document.body.style.overflow = "hidden";
        return;
      }
      // iOS Safari: use fixed positioning instead of overflow: hidden to avoid
      // leaving the page in a non-scrollable, gray-overlay state after closing.
      storyScrollY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0;
      document.body.style.position = "fixed";
      document.body.style.top = `-${storyScrollY}px`;
      document.body.style.width = "100%";
    };

    const unlockBodyScroll = () => {
      if (!isIOS) {
        document.body.style.overflow = "";
        return;
      }
      // Restore original scroll position and layout on iOS after closing modal.
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, storyScrollY || 0);
    };

    const openModal = () => {
      storyModal.classList.add("is-open");
      storyModal.setAttribute("aria-hidden", "false");
      lockBodyScroll();
    };

    const closeModal = () => {
      storyModal.classList.remove("is-open");
      storyModal.setAttribute("aria-hidden", "true");
      unlockBodyScroll();
    };

    storyButton.addEventListener("click", openModal);
    storyClose.addEventListener("click", closeModal);

    storyModal.addEventListener("click", (event) => {
      if (event.target === storyModal) {
        closeModal();
      }
    });

    /* Prevent wheel from scrolling the page when scrolling inside the modal */
    const storyModalInner = storyModal.querySelector(".story-modal");
    if (storyModalInner) {
      storyModalInner.addEventListener(
        "wheel",
        (e) => e.stopPropagation(),
        { passive: false }
      );
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && storyModal.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  // 7) Projects filter tabs
  const projectTabs = document.querySelectorAll(".projects-tab");
  const projectCards = document.querySelectorAll(".project-card");
  const projectsTabsContainer = document.querySelector(".projects-tabs");
  const projectsTabsIndicator = document.querySelector(".projects-tabs-indicator");

  const moveProjectsIndicator = (activeTab) => {
    if (!projectsTabsContainer || !projectsTabsIndicator || !activeTab) return;
    // Use offsetLeft within the tabs container; because the indicator
    // is positioned inside the same scrolling container, we do not
    // subtract scrollLeft, which keeps alignment correct on mobile.
    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;
    projectsTabsIndicator.style.transform = `translateX(${left}px)`;
    projectsTabsIndicator.style.width = `${width}px`;
  };

  if (projectTabs.length && projectCards.length) {
    const applyFilter = (filter) => {
      const visibleCards = [];

      projectCards.forEach((card, index) => {
        const category = card.getAttribute("data-category");
        const matches =
          filter === "all"
            ? index < 8 // All Projects: always show only the first 8 cards
            : category === filter;

        if (matches) {
          card.style.display = "";
          card.classList.remove("project-visible");
          visibleCards.push(card);
        } else {
          card.style.display = "none";
          card.classList.remove("project-visible");
        }
      });

      // Professional staggered effect: tiles fade/slide in one by one
      visibleCards.forEach((card, index) => {
        setTimeout(() => {
          card.classList.add("project-visible");
        }, index * 160);
      });
    };

    projectTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        projectTabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        moveProjectsIndicator(tab);
        const filter = tab.getAttribute("data-filter") || "all";
        applyFilter(filter);
      });
    });

    // Initialize indicator position on load
    const initialActive = document.querySelector(".projects-tab.is-active");
    if (initialActive) {
      moveProjectsIndicator(initialActive);
      applyFilter(initialActive.getAttribute("data-filter") || "all");
    }
  }
  } // end runPageSpecificScripts
});

