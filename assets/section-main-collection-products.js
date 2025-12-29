(() => {
  const mobileBreakpoint = 768;
  const animationDelay = 300;
  const gridColumns = { mobile: [1, 2], desktop: [2, 4] };

  let currentColumns = 4;

  const isMobile = () => window.innerWidth < mobileBreakpoint;

  const getGridColumns = () => {
    const columns = isMobile() ? gridColumns.mobile : gridColumns.desktop;
    return currentColumns === columns[0] ? columns[1] : columns[0];
  };

  const toggleFilter = (open) => {
    const filterContainer = document.querySelector("[data-filter-container]");
    if (!filterContainer) return;

    if (open) {
      document.body.classList.add("filter-open");
      filterContainer.style.display = "block";
    } else {
      const filterSidebar = document.querySelector(".filter-sidebar");
      if (filterSidebar) {
        filterSidebar.classList.add("closing");
      }

      setTimeout(() => {
        document.body.classList.remove("filter-open");
        if (filterSidebar) {
          filterSidebar.classList.remove("closing");
        }
        filterContainer.style.display = "none";
      }, animationDelay);
    }
  };

  const updateGrid = () => {
    const grid = document.getElementById("AjaxinateContainer");
    if (!grid) return;

    grid.className = grid.className.replace(/products-grid--cols-\d/g, "");
    grid.classList.add(`products-grid--cols-${currentColumns}`);

    updateGridIcon();
  };

  const updateGridIcon = () => {
    const icons = {
      1: "grid-2",
      2: isMobile() ? "grid-1" : "grid-4",
      4: "grid-2",
    };

    document.querySelectorAll(".grid-toggle-btn span").forEach((span) => {
      span.style.display = span.dataset.icon === icons[currentColumns] ? "block" : "none";
    });
  };

  const toggleGrid = () => {
    currentColumns = getGridColumns();
    updateGrid();

    document.querySelectorAll(".product-card__image").forEach((img) => {
      const newSrc = currentColumns === 2 ? img.dataset.srcLarge : img.dataset.srcSmall;
      if (newSrc) {
        img.src = newSrc;
        img.srcset = newSrc;
      }
    });
  };

  const initializeCollection = () => {
    currentColumns = isMobile() ? 1 : 4;
    updateGrid();

    const listeners = [
      { selector: ".filter-sidebar__overlay", event: "click", handler: () => toggleFilter(false) },
      { selector: ".filter-close-btn", event: "click", handler: () => toggleFilter(false) },
      { selector: ".collection-controls__filter-button", event: "click", handler: () => toggleFilter(true) },
      { selector: ".grid-toggle-btn", event: "click", handler: toggleGrid },
    ];

    listeners.forEach(({ selector, event, handler }) => {
      const element = document.querySelector(selector);
      if (element) element.addEventListener(event, handler);
    });

    let wasMobile = isMobile();
    window.addEventListener("resize", () => {
      const isNowMobile = isMobile();
      if (wasMobile !== isNowMobile) {
        wasMobile = isNowMobile;
        currentColumns = isNowMobile ? 1 : 4;
        updateGrid();
      }
    });
  };

  window.addEventListener("load", () => {
    initializeCollection();

    if (typeof Ajaxinate !== "undefined") {
      new Ajaxinate({
        method: "scroll",
        container: "#AjaxinateContainer",
        pagination: "#AjaxinatePagination",
        offset: 2000,
        loadingText: '<div style="margin:auto 0;display:flex;justify-content:center;align-items:center;padding:var(--space-m) 0;width:100%;height:1px;overflow:hidden"><svg fill=#E7E7E7 height=1 style=max-width:300px viewBox="0 0 100 1"width=100% xmlns=http://www.w3.org/2000/svg><style>.react{animation:moving 1s ease-in-out infinite;transform-origin:0 50%}@keyframes moving{0%{width:0%}50%{width:100%;transform:translateX(0)}100%{width:0;transform:translateX(100%)}}</style><rect class=react fill=#E7E7E7 height=1 width=100% /></svg></div>',
        callback: function () {
          try {
            const paginationEl = document.querySelector("#AjaxinatePagination a");
            if (paginationEl && paginationEl.href) {
              const existingPrefetch = document.querySelector('link[rel="prefetch"][data-ajaxinate]');
              if (existingPrefetch) existingPrefetch.remove();

              const prefetch = document.createElement("link");
              prefetch.rel = "prefetch";
              prefetch.href = paginationEl.href;
              prefetch.setAttribute("data-ajaxinate", "true");
              document.head.appendChild(prefetch);
            }
          } catch (e) {
            console.warn("Ajaxinate prefetch error:", e);
          }
        },
      });
    }
  });
})();
