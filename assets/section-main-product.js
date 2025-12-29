window.Shopify = window.Shopify || {};
Shopify.money_format = shopify_money_format;

document.addEventListener("DOMContentLoaded", () => {
  const productElement = document.querySelector("#product");
  if (productElement) {
    registerBuyableProduct(true)(productElement);
    setupModalOverlay(productElement);
    initStickyCartBar(productElement);
  }
});

window.setupModalOverlay = (containerElement) => {
  const sizeGuideButton = containerElement.querySelector(".size-guide-button");
  const modalOverlayElem = document.querySelector(".modal-overlay");
  const modalClose = modalOverlayElem.querySelector(".modal-close");

  if (sizeGuideButton && modalOverlayElem) {
    sizeGuideButton.addEventListener("click", function () {
      modalOverlayElem.classList.add("is-active");
      document.body.classList.add("modal-open");
    });

    modalOverlayElem.addEventListener("click", function (e) {
      if (e.target === modalOverlayElem) {
        modalOverlayElem.classList.remove("is-active");
        document.body.classList.remove("modal-open");
      }
    });

    if (modalClose) {
      modalClose.addEventListener("click", function () {
        modalOverlayElem.classList.remove("is-active");
        document.body.classList.remove("modal-open");
      });
    }
  }
};

const registerBuyableProduct = (isMainElement) => (elementWrapper) => {
  if (isMainElement) {
    if (typeof Splide !== "undefined") {
      initializeProductSlider(elementWrapper);
    } else {
      window.addEventListener("load", function () {
        initializeProductSlider(elementWrapper);
      });
    }
  }

  /** @param elementWrapper {HTMLElement} */
  function initializeProductSlider(elementWrapper) {
    let splideInstance = null;
    const container = elementWrapper.querySelector(".product-images-container");
    const progressBar = elementWrapper.querySelector(".product-images-progress__bar");

    function initSlider() {
      if (splideInstance) {
        splideInstance.destroy();
      }

      const isMobile = window.innerWidth < 1100;

      const options = {
        direction: "ttb",
        height: product_image_height * ((window.innerWidth * 0.5) / product_image_width),
        wheel: true,
        waitForTransition: true,
        arrows: false,
        pagination: false,
        speed: 300,
        drag: true,
        breakpoints: {
          1100: {
            type: "loop",
            direction: "ltr",
            height: product_image_height * (window.innerWidth / product_image_width),
            arrows: true,
            perPage: 1,
            pagination: false,
            rewind: false,
            wheel: false,
            drag: true,
            speed: 300,
            waitForTransition: true,
          },
        },
      };

      splideInstance = new Splide(".product-images-splide", options);

      splideInstance.on("mounted move", function () {
        const end = splideInstance.Components.Controller.getEnd() + 1;
        const rate = Math.min((splideInstance.index + 1) / end, 1);

        if (isMobile) {
          progressBar.style.width = String(100 * rate) + "%";
        } else {
          progressBar.style.height = String(100 * rate) + "%";
        }
      });

      splideInstance.mount();
      if (splideInstance.length <= 1) {
        elementWrapper.querySelector(".product-images-progress").style.display = "none";
        if (isMobile) {
          elementWrapper.querySelector(".splide__arrows").style.display = "none";
        }
      } else {
        elementWrapper.querySelector(".product-images-progress").style.display = "";
        if (isMobile) {
          elementWrapper.querySelector(".splide__arrows").style.display = "";
        }
      }

      if (isMobile) {
        container.classList.add("product-images-container--mobile");
      } else {
        container.classList.remove("product-images-container--mobile");
      }

      const progress = elementWrapper.querySelector(".product-images-progress");
      if (isMobile) {
        progress.classList.add("product-images-progress--mobile");
      } else {
        progress.classList.remove("product-images-progress--mobile");
      }
    }

    initSlider();

    let resizeTimeout;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(initSlider, 250);
    });
  }

  const tabButtons = elementWrapper.querySelectorAll(".product-tabs__tab");
  const tabContents = elementWrapper.querySelectorAll(".product-tabs__content");

  if (tabButtons.length > 0) {
    const descriptionTab = elementWrapper.querySelector('[data-tab="description"]');
    if (descriptionTab) {
      descriptionTab.classList.add("is-active");
      const descriptionContent = elementWrapper.querySelector('[data-content="description"]');
      if (descriptionContent) {
        descriptionContent.classList.add("is-active");
      }
    } else if (tabButtons[0]) {
      tabButtons[0].classList.add("is-active");
      const firstTabContent = elementWrapper.querySelector(`[data-content="${tabButtons[0].dataset.tab}"]`);
      if (firstTabContent) {
        firstTabContent.classList.add("is-active");
      }
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const tabName = this.dataset.tab;

        tabButtons.forEach((tab) => tab.classList.remove("is-active"));
        tabContents.forEach((content) => content.classList.remove("is-active"));

        this.classList.add("is-active");
        const activeContent = elementWrapper.querySelector(`[data-content="${tabName}"]`);

        if (activeContent) {
          activeContent.classList.add("is-active");
        }
      });
    });
  }
};

/** @param elementWrapper {HTMLElement} */
function initStickyCartBar(elementWrapper) {
  const originalButton = document.querySelector("#js--addtocart");
  const stickyBar = document.querySelector(".sticky-cart-bar");
  const stickyContainer = document.querySelector(".sticky-cart-bar__container");

  if (!originalButton || !stickyBar || !stickyContainer) {
    console.warn(`sticky bar not being initialised because: ${!originalButton}, ${!stickyBar}, ${!stickyContainer}`);
    return;
  }

  const clonedButton = originalButton.cloneNode(true);
  stickyContainer.appendChild(clonedButton);

  function syncButtons() {
    const originalNotifyButton = elementWrapper.querySelector("#js--notify-me");
    const klaviyoForm = elementWrapper.querySelector(".klaviyo-form-WMidEs");

    const isNotifyMeVisible = originalNotifyButton && originalNotifyButton.style.display !== "none";
    const isKlaviyoVisible = klaviyoForm && klaviyoForm.style.display !== "none" && klaviyoForm.style.display !== "";

    if (product_has_only_default_variant) {
      if (isNotifyMeVisible || isKlaviyoVisible) {
        clonedButton.textContent = "Notify Me";
        clonedButton.disabled = false;
        clonedButton.className = originalButton.className;
        const originalStyle = originalButton.getAttribute("style");
        if (originalStyle) {
          clonedButton.setAttribute("style", originalStyle);
        }
        clonedButton.style.display = "flex";
      } else {
        clonedButton.disabled = originalButton.disabled;
        clonedButton.innerHTML = originalButton.innerHTML;
        clonedButton.className = originalButton.className;
        clonedButton.type = originalButton.type;
        clonedButton.name = originalButton.name;
        clonedButton.value = originalButton.value;

        Array.from(originalButton.attributes).forEach((attr) => {
          if (attr.name !== "id") {
            clonedButton.setAttribute(attr.name, attr.value);
          }
        });

        const originalStyle = originalButton.getAttribute("style");
        if (originalStyle) {
          clonedButton.setAttribute("style", originalStyle);
        }
      }
    } else {
      if (isNotifyMeVisible || isKlaviyoVisible) {
        clonedButton.textContent = "Notify Me";
        clonedButton.disabled = false;
        clonedButton.className = originalButton.className;
        const originalStyle = originalButton.getAttribute("style");
        if (originalStyle) {
          clonedButton.setAttribute("style", originalStyle);
        }
        clonedButton.style.display = "flex";
      } else {
        if (product_is_gift_card) {
          clonedButton.textContent = "Select Card Amount";
        } else {
          clonedButton.textContent = "Select Your Size";
        }
        clonedButton.disabled = false;
        clonedButton.className = originalButton.className;
        const originalStyle = originalButton.getAttribute("style");
        if (originalStyle) {
          clonedButton.setAttribute("style", originalStyle);
        }
      }
    }
  }

  function syncAll() {
    syncButtons();
    updateStickyProductInfo(elementWrapper);
    updateStickyPrices(elementWrapper);
  }

  clonedButton.addEventListener("click", function (e) {
    e.preventDefault();
    const originalNotifyButton = elementWrapper.querySelector("#js--notify-me");
    const klaviyoForm = elementWrapper.querySelector(".klaviyo-form-WMidEs");

    const isNotifyMeVisible = originalNotifyButton && originalNotifyButton.style.display !== "none";
    const isKlaviyoVisible = klaviyoForm && klaviyoForm.style.display !== "none" && klaviyoForm.style.display !== "";

    if (isNotifyMeVisible || isKlaviyoVisible) {
      scrollToVariantForm();
      if (isNotifyMeVisible) {
        setTimeout(() => {
          if (originalNotifyButton) {
            originalNotifyButton.click();
          }
        }, 300);
      }
    } else if (!product_has_only_default_variant) {
      scrollToVariantForm();
    } else {
      originalButton.click();
    }
  });

  function checkButtonPosition() {
    const originalNotifyButton = elementWrapper.querySelector("#js--notify-me");
    const klaviyoForm = elementWrapper.querySelector(".klaviyo-form-WMidEs");
    const addToCartButton = elementWrapper.querySelector("#js--addtocart");

    const isNotifyMeVisible = originalNotifyButton && originalNotifyButton.style.display !== "none";
    const isKlaviyoVisible = klaviyoForm && klaviyoForm.style.display !== "none" && klaviyoForm.style.display !== "";
    const isAddToCartVisible = addToCartButton && addToCartButton.style.display !== "none";

    let buttonRect;
    if (isKlaviyoVisible) {
      buttonRect = klaviyoForm.getBoundingClientRect();
    } else if (isNotifyMeVisible) {
      buttonRect = originalNotifyButton.getBoundingClientRect();
    } else if (isAddToCartVisible) {
      buttonRect = addToCartButton.getBoundingClientRect();
    } else {
      buttonRect = originalButton.getBoundingClientRect();
    }

    const buttonBottom = buttonRect.bottom;

    if (buttonBottom < 0) {
      stickyBar.classList.add("is-visible");
    } else {
      stickyBar.classList.remove("is-visible");
    }
  }

  const variantOptions = elementWrapper.querySelectorAll(".js--variant-option");
  variantOptions.forEach(function (option) {
    option.addEventListener("change", function () {
      setTimeout(syncAll, 10);
    });
  });

  window.addEventListener("scroll", checkButtonPosition);

  window.addEventListener("resize", function () {
    checkButtonPosition();
    syncAll();
  });

  const mutationObserver = new MutationObserver(syncAll);
  mutationObserver.observe(originalButton, {
    attributes: true,
    childList: true,
    subtree: true,
  });

  const notifyButton = elementWrapper.querySelector("#js--notify-me");
  if (notifyButton) {
    const notifyMutationObserver = new MutationObserver(syncAll);
    notifyMutationObserver.observe(notifyButton, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  checkButtonPosition();
  syncAll();
}

/** @param elementWrapper {HTMLElement} */
function getSelectedVariantOptions(elementWrapper) {
  const selectedOptions = [];
  const optionInputs = elementWrapper.querySelectorAll(".js--variant-option:checked");

  optionInputs.forEach(function (input) {
    let value = input.value;
    if (input.name === "option1" && value.includes(".0")) {
      value = value.replace(".0", "");
    }
    selectedOptions.push(value);
  });

  return selectedOptions;
}

function updateStickyProductInfo(elementWrapper) {
  const stickyInfo = elementWrapper.querySelector(".js--sticky-product-info");
  if (!stickyInfo) return;

  const selectedOptions = getSelectedVariantOptions(elementWrapper);
  const mainPrice = elementWrapper.querySelector(".js--variant-price");

  let variantString = "";
  if (selectedOptions.length > 0) {
    variantString = " " + selectedOptions.join(" / ");
  }

  const priceString = mainPrice ? " - " + mainPrice.textContent.trim() : "";

  stickyInfo.innerHTML = '<span class="heading--l">' + product_title + ":</span>" + variantString + priceString;
}

function updateStickyPrices(elementWrapper) {
  const stickyPrice = elementWrapper.querySelector(".js--sticky-price");
  const stickyComparePrice = elementWrapper.querySelector(".js--sticky-compare-price");
  const stickyComparePriceContainer = stickyComparePrice ? stickyComparePrice.parentElement : null;

  const stickyMobilePrice = elementWrapper.querySelector(".js--sticky-mobile-price");
  const stickyMobileComparePrice = elementWrapper.querySelector(".js--sticky-mobile-compare-price");

  const mainPrice = elementWrapper.querySelector(".js--variant-price");
  const mainComparePrice = elementWrapper.querySelector(".js--variant-compareatprice");

  if (stickyPrice && mainPrice) {
    stickyPrice.textContent = mainPrice.textContent;
  }

  if (stickyComparePrice && stickyComparePriceContainer) {
    if (mainComparePrice && mainComparePrice.textContent.trim() !== "") {
      stickyComparePrice.textContent = mainComparePrice.textContent;
      stickyComparePrice.style.display = "inline";
    } else {
      stickyComparePrice.style.display = "none";
    }
  }

  if (stickyMobilePrice && mainPrice) {
    stickyMobilePrice.textContent = mainPrice.textContent;
  }

  if (stickyMobileComparePrice) {
    if (mainComparePrice && mainComparePrice.textContent.trim() !== "") {
      stickyMobileComparePrice.textContent = mainComparePrice.textContent;
      stickyMobileComparePrice.style.display = "inline";
    } else {
      stickyMobileComparePrice.style.display = "none";
    }
  }
}

function scrollToVariantForm() {
  const productDetails = document.querySelector("#product-details");
  const fixedHeader = document.querySelector(".header-fixed");

  if (productDetails) {
    const rect = productDetails.getBoundingClientRect();
    const headerHeight = fixedHeader ? fixedHeader.offsetHeight : 0;
    const targetPosition = window.pageYOffset + rect.top - headerHeight + 1;

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });
  }
}

/**
 * Adds a product by its ID into the logged in customer's wishlist
 * @param productId {String}
 * @returns {Promise<Response|Error>}
 */
const addToWishlist = async (productId) => {
  const params = new URLSearchParams({
    productid: productId,
  });

  const endpoint = `/apps/wishlist?${params.toString()}`;

  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    });
  } catch (e) {
    return e;
  }
};

/**
 * Removes a product by its ID from the logged in customer's wishlist
 * @param productId {String}
 * @returns {Promise<Response|Error>}
 */
const removeFromWishlist = async (productId) => {
  const params = new URLSearchParams({
    productid: productId,
  });

  const endpoint = `/apps/wishlist?${params.toString()}`;

  try {
    return await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    });
  } catch (e) {
    return e;
  }
};

(async () => {
  /**
   * @param button {HTMLButtonElement}
   * @return {{
   *   setRemoveFromWishlist: () => void,
   *   setAddToWishlist: () => void,
   *   setLoading: () => void,
   * }}
   */
  const getWishlistButtonActions = (button) => {
    const buttonImageAdd = button.querySelector(".wishlist-button__icon-add-to-wishlist");
    const buttonImageRemove = button.querySelector(".wishlist-button__icon-remove-from-wishlist");
    const buttonImageLoad = button.querySelector(".wishlist-button__icon-loading");

    return {
      setRemoveFromWishlist: () => {
        buttonImageAdd.style.display = "none";
        buttonImageRemove.style.display = "flex";
        buttonImageLoad.style.display = "none";
      },
      setAddToWishlist: () => {
        buttonImageAdd.style.display = "flex";
        buttonImageRemove.style.display = "none";
        buttonImageLoad.style.display = "none";
      },
      setLoading: () => {
        buttonImageAdd.style.display = "none";
        buttonImageRemove.style.display = "none";
        buttonImageLoad.style.display = "flex";
      },
    };
  };

  const registerWishlistForm = (wishlistForm) => {
    const state = {
      loading: false,
    };

    const productId = wishlistForm.getAttribute("data-product-id");
    const button = wishlistForm.querySelector(".wishlist-button");
    const wishlistButtonActions = getWishlistButtonActions(button);

    wishlistForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (state.loading) return;

      let isWishlisted = wishlistForm.getAttribute("data-is-wishlisted") === "true";

      state.loading = true;
      wishlistButtonActions.setLoading();

      const response = await (isWishlisted ? removeFromWishlist(productId) : addToWishlist(productId));

      if (response instanceof Error) {
        console.error(response);
      } else {
        switch (response.status) {
          case 201:
            isWishlisted = !isWishlisted;
            break;
          case 200:
            break;
          default:
            console.error("Could not add this product to your wishlist. Please try again later.");
            response.json().then(console.error);
            break;
        }
      }

      state.loading = false;
      wishlistForm.setAttribute("data-is-wishlisted", isWishlisted ? "true" : "false");
      if (isWishlisted) {
        wishlistButtonActions.setRemoveFromWishlist();
      } else {
        wishlistButtonActions.setAddToWishlist();
      }
    });
  };

  document.querySelectorAll(".wishlist-form").forEach(registerWishlistForm);
})();
