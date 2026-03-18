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
      // On iOS we avoid locking the body altogether because both
      // overflow: hidden and position: fixed can leave the page
      // stuck behind a dark overlay after closing the modal.
      if (isIOS) return;

      document.body.style.overflow = "hidden";
    };

    const unlockBodyScroll = () => {
      if (isIOS) return;
      document.body.style.overflow = "";
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

    const applyFilter = (filter) => {
      const visibleCards = [];
      const normalized = (filter || "all").trim();

      cards.forEach((card, index) => {
        const category = card.getAttribute("data-category") || "";
        const matches =
          normalized === "all"
            ? sectionId === "product-category"
              ? true // Product Category: show all tiles in All tab
              : index < 8 // Projects: keep "All shows 8 tiles"
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
        moveIndicator(tab);
        applyFilter(tab.getAttribute("data-filter") || "all");
      });
    });

    const initialActive = tabsContainer.querySelector(".projects-tab.is-active") || tabs[0];
    if (initialActive) {
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

  const productsSection = document.getElementById("product-category");

  if (productModal && productModalDialog && productsSection && productModalClose && productModalTitle && productModalSubtitle && productModalImg && productModalEmpty && productModalCounter && productPrev && productNext) {
    const isIOS =
      /iP(ad|hone|od)/i.test(window.navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    let gallery = [];
    let galleryIndex = 0;
    let lastFocusedEl = null;
    let lockedScrollY = 0;
    let isScrollLocked = false;
    let usedFixedLock = false;

    const isMobileModal = () => {
      return window.matchMedia && window.matchMedia("(max-width: 720px)").matches;
    };

    const lockPageScroll = () => {
      if (isScrollLocked) return;
      isScrollLocked = true;
      usedFixedLock = false;

      lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;

      if (isMobileModal()) {
        // Mobile (iOS + Android): most stable scroll lock is body fixed.
        usedFixedLock = true;
        document.body.style.position = "fixed";
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
      } else {
        // Desktop + Android: overflow lock is reliable and keeps background fixed.
        document.body.style.overflow = "hidden";
      }
    };

    const unlockPageScroll = () => {
      if (!isScrollLocked) return;
      isScrollLocked = false;

      if (usedFixedLock) {
        const top = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        // Always restore to the exact captured position on mobile.
        const restoreY =
          top && top.length ? Math.abs(parseInt(top, 10) || 0) : lockedScrollY;
        window.scrollTo(0, restoreY);
        // Mobile browsers may apply a late layout pass; re-apply a few times.
        requestAnimationFrame(() => window.scrollTo(0, restoreY));
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, restoreY)));
        setTimeout(() => window.scrollTo(0, restoreY), 0);
      } else {
        document.body.style.overflow = "";
      }
    };

    const parseGallery = (value) => {
      return (value || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const renderGallery = () => {
      const hasImages = gallery.length > 0;
      productModalEmpty.hidden = hasImages;
      productModalImg.style.display = hasImages ? "block" : "none";

      productPrev.disabled = !hasImages || gallery.length <= 1;
      productNext.disabled = !hasImages || gallery.length <= 1;

      if (!hasImages) {
        productModalImg.removeAttribute("src");
        productModalImg.alt = "";
        productModalCounter.textContent = "";
        return;
      }

      const src = gallery[galleryIndex];
      productModalImg.src = src;
      productModalImg.alt = productModalTitle.textContent || "Product photo";
      productModalCounter.textContent = `${galleryIndex + 1} / ${gallery.length}`;
    };

    const openProductModal = (tile) => {
      lastFocusedEl = document.activeElement;
      const title = tile.getAttribute("data-product-title") || tile.textContent?.trim() || "Product";
      gallery = parseGallery(tile.getAttribute("data-gallery"));
      galleryIndex = 0;

      productModalTitle.textContent = title;
      productModalSubtitle.textContent = gallery.length ? "Photos" : "Photos coming soon";

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

    productsSection.addEventListener("click", (e) => {
      const tile = e.target?.closest?.(".product-tile");
      if (!tile) return;
      openProductModal(tile);
    });

    productPrev.addEventListener("click", () => step(-1));
    productNext.addEventListener("click", () => step(1));
    productModalClose.addEventListener("click", closeProductModal);

    productModal.addEventListener("click", (e) => {
      if (e.target === productModal) closeProductModal();
    });

    // Mobile: block background scroll gestures on the overlay itself.
    productModal.addEventListener(
      "touchmove",
      (e) => {
        if (productModal.classList.contains("is-open") && isMobileModal()) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

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
  } // end runPageSpecificScripts
});

