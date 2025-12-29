(() => {
  const state = {
    query: "",
    scrollY: 0,
    isLoading: false,
    controller: null,
    subDrawerOpen: false,
    timeouts: { search: null, loading: null, fade: [] },
  };

  let dom = {};

  const initializeElements = () => {
    const ids = ["searchDrawer", "searchLoading", "noResultsContainer", "noResultsSearchButton", "searchResultsContainer", "productResults", "productResultsList", "collectionResults", "collectionResultsList", "searchResultsButton", "popularSearches", "subDrawerTrigger", "subDrawer", "subDrawerBack", "newArrivals", "search"];

    ids.forEach((id) => (dom[id] = document.getElementById(id)));

    dom.container = document.querySelector(".search-drawer__container");
    dom.closeBtn = document.querySelector(".search-drawer__close");
    dom.searchInput = dom.search;
  };

  const toggleElement = (el, show, opacity = "1") => {
    if (!el) return;
    el.style.display = show ? "block" : "none";
    el.classList.toggle("hidden", !show);
    if (show && opacity) el.style.opacity = opacity;
  };

  const fadeElement = (el, opacity, callback) => {
    if (!el) return;
    el.style.opacity = opacity;
    if (callback) setTimeout(callback, opacity === "0" ? 200 : 10);
  };

  const toggleElements = (keys, show, fade = false) => {
    keys.forEach((key) => {
      if (dom[key]) {
        toggleElement(dom[key], show, fade ? "0" : "1");
        if (fade && show) setTimeout(() => (dom[key].style.opacity = "1"), 10);
      }
    });
  };

  const clearTimeouts = () => {
    Object.values(state.timeouts).flat().forEach(clearTimeout);
    state.timeouts = { search: null, loading: null, fade: [] };
  };

  const showDefaultContent = (fade = false) => {
    ["searchLoading", "noResultsContainer", "searchResultsContainer", "productResults", "collectionResults", "searchResultsButton"].forEach((key) => toggleElement(dom[key], false));
    toggleElements(["popularSearches", "subDrawerTrigger", "newArrivals"], true, fade);
  };

  const hideDefaultContent = () => {
    ["popularSearches", "subDrawerTrigger", "newArrivals"].forEach((key) => {
      if (!dom[key]) return;
      dom[key].style.opacity = "0";
      state.timeouts.fade.push(
        setTimeout(() => {
          dom[key].style.display = "none";
          dom[key].classList.add("hidden");
        }, 200)
      );
    });
  };

  const openSearchDrawer = () => {
    state.scrollY = document.body.style.position === "fixed" ? Math.abs(parseInt(document.body.style.top || "0")) : window.scrollY;

    if (document.body.style.position !== "fixed") {
      Object.assign(document.body.style, {
        position: "fixed",
        top: `-${state.scrollY}px`,
        width: "100%",
      });
    }

    document.body.classList.add("search-open");
    dom.searchDrawer?.classList.add("search-drawer--active");
    showDefaultContent();
    setTimeout(() => dom.searchInput?.focus(), 300);
  };

  const closeSearchDrawer = () => {
    Object.assign(state, { subDrawerOpen: false, query: "", isLoading: false });
    if (dom.searchInput) dom.searchInput.value = "";

    dom.subDrawer?.classList.remove("sub-drawer--active");
    showDefaultContent();
    document.body.classList.remove("search-open");
    dom.searchDrawer?.classList.remove("search-drawer--active");

    document.documentElement.style.scrollBehavior = "auto";
    Object.assign(document.body.style, { position: "", top: "", width: "" });
    window.scrollTo(0, state.scrollY);
    document.documentElement.style.scrollBehavior = "";
  };

  const toggleSubDrawer = () => {
    state.subDrawerOpen = !state.subDrawerOpen;
    dom.subDrawer?.classList.toggle("sub-drawer--active", state.subDrawerOpen);
  };

  const performSearch = () => {
    if (state.query) {
      window.location.href = `/search?q=${encodeURIComponent(state.query)}&type=product&options[prefix]=last`;
    }
  };

  const renderSearchResults = (results) => {
    if (!results) return;

    [
      { type: "product", plural: "products", showImage: true },
      { type: "collection", plural: "collections", showImage: false },
    ].forEach(({ type, plural, showImage }) => {
      const list = dom[`${type}ResultsList`];
      const container = dom[`${type}Results`];
      const items = results[plural];

      if (!list || !container) return;
      list.innerHTML = "";

      if (items?.length > 0) {
        list.innerHTML = items
            .map((item) => {
              const baseUrl = item.image?.replace(/width=\d+/, "") || "";
              const sep = baseUrl.includes("?") ? "&" : "?";
              const imgHtml =
                  showImage && item.image
                      ? `
              <div class="predictive-search__image-container">
                <img src="${item.image}" 
                  srcset="${baseUrl}${sep}width=80 1x, ${baseUrl}${sep}width=160 2x, ${baseUrl}${sep}width=240 3x"
                  alt="${item.title}" class="predictive-search__image" 
                  loading="eager" fetchpriority="high" decoding="async"
                  width="40" height="40">
              </div>`
                      : "";

              return `<li class="predictive-search__item">
              <a href="${item.url}" class="predictive-search__link">
                ${imgHtml}
                <span class="predictive-search__text body">${item.title}</span>
              </a>
            </li>`;
            })
            .join("");
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    });

    const hasResults = results.products.length || results.collections.length;
    if (dom.searchResultsButton) {
      dom.searchResultsButton.textContent = `Search for '${state.query}'`;
      dom.searchResultsButton.style.display = hasResults ? "block" : "none";
    }
  };

  const fetchSearchResults = async (query) => {
    try {
      state.controller = new AbortController();
      const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product,collection&resources[limit]=5&resources[limit_scope]=each`, { signal: state.controller.signal });

      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      const results = { products: [], collections: [] };
      const imagePreloads = [];

      ["products", "collections"].forEach((type) => {
        const items = data.resources?.results?.[type] || [];
        results[type] = items.map((item) => {
          if (item.image && type === "products") {
            const baseUrl = item.image.replace(/width=\d+/, "");
            const sep = baseUrl.includes("?") ? "&" : "?";

            [80, 160, 240].forEach((size) => {
              const img = new Image();
              img.src = `${baseUrl}${sep}width=${size}`;
              imagePreloads.push(img.decode().catch(() => {}));
            });

            return {
              url: item.url,
              title: item.title,
              image: `${baseUrl}${sep}width=80`,
            };
          }
          return { url: item.url, title: item.title, image: item.image?.replace(/width=\d+/, "width=80") };
        });
      });

      results.collections = results.collections.slice(0, 3);

      await Promise.all(imagePreloads);

      state.isLoading = false;

      fadeElement(dom.searchLoading, "0", () => {
        toggleElement(dom.searchLoading, false);
        renderSearchResults(results);

        const hasResults = results.products.length || results.collections.length;
        const target = hasResults ? dom.searchResultsContainer : dom.noResultsContainer;

        if (!hasResults && dom.noResultsSearchButton) {
          dom.noResultsSearchButton.textContent = `Search for '${query}'`;
        }

        toggleElement(target, true, "0");
        setTimeout(() => fadeElement(target, "1"), 10);
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        state.isLoading = false;
        fadeElement(dom.searchLoading, "0", () => toggleElement(dom.searchLoading, false));
      }
    } finally {
      state.controller = null;
    }
  };

  const handleSearchInput = (e) => {
    const query = (state.query = e.target.value);

    clearTimeouts();
    state.controller?.abort();
    state.controller = null;

    if (!query) {
      state.isLoading = false;
      toggleElement(dom.searchLoading, false);
      ["noResultsContainer", "searchResultsContainer", "productResults", "collectionResults", "searchResultsButton"].forEach((key) => toggleElement(dom[key], false));
      showDefaultContent(true);
      if (state.subDrawerOpen) toggleSubDrawer();
      return;
    }

    state.isLoading = true;
    hideDefaultContent();
    ["noResultsContainer", "searchResultsContainer", "productResults", "collectionResults", "searchResultsButton"].forEach((key) => toggleElement(dom[key], false));

    state.timeouts.loading = setTimeout(() => {
      if (state.query) {
        toggleElement(dom.searchLoading, true, "0");
        fadeElement(dom.searchLoading, "1");
      }
    }, 200);

    if (state.subDrawerOpen) toggleSubDrawer();
    state.timeouts.search = setTimeout(() => fetchSearchResults(query), 300);
  };

  const attachEventListeners = () => {
    const events = [
      [dom.closeBtn, "click", closeSearchDrawer],
      [document, "keydown", (e) => e.key === "Escape" && closeSearchDrawer()],
      [dom.searchDrawer, "click", (e) => e.target === dom.searchDrawer && closeSearchDrawer()],
      [dom.container, "click", (e) => e.stopPropagation()],
      [dom.subDrawerTrigger, "click", toggleSubDrawer],
      [dom.subDrawerBack, "click", toggleSubDrawer],
      [dom.searchInput, "input", handleSearchInput],
      [dom.noResultsSearchButton, "click", performSearch],
      [dom.searchResultsButton, "click", performSearch],
    ];

    events.forEach(([el, event, handler]) => el?.addEventListener(event, handler));

    window.toggleSearch = openSearchDrawer;
    window.closeSearch = closeSearchDrawer;
  };

  const initialize = () => {
    initializeElements();
    document.querySelectorAll(".faq-item__description[data-full-text]").forEach((desc) => {
      const text = desc.getAttribute("data-full-text");
      if (text) desc.textContent = text.length > 200 ? `${text.substring(0, 200)}...` : text;
    });

    showDefaultContent();
    attachEventListeners();
  };

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", initialize) : initialize();
})();
