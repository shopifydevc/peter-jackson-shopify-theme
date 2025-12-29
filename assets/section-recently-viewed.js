(() => {
  const productHandle = document.currentScript.getAttribute('data-product-handle')
  const templateIsProduct = document.currentScript.getAttribute('data-template-is-product') === "true"

  function getRecentlyViewed() {
    let recentlyViewed = localStorage.getItem("recentlyViewed");
    let items = JSON.parse(recentlyViewed);
    if (items !== null && items[0] !== undefined) {
      return items.sort(function (a, b) {
        return a.timestamp - b.timestamp;
      });
    } else {
      return [];
    }
  }

  function saveRecentlyViewedProduct(handle) {
    let recentlyViewed = getRecentlyViewed();
    let exists = false;
    let maxItemsToSave = 4;
    recentlyViewed.forEach(function (item) {
      if (item.handle === handle) {
        exists = true;
      }
    });

    if (exists === false) {
      recentlyViewed.splice(maxItemsToSave);
      recentlyViewed.unshift({
        handle: handle,
        date: Date.now(),
      });
      localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));
    }

    getRecentlyViewed();
  }

  function displayRecentlyViewed() {
    let items = getRecentlyViewed();
    const limit = 4;
    const el = document.getElementById("js--recently_viewed");
    if (document.getElementById("recently-viewed") != null) {
      if (items.length > 0) {
        items.forEach(function (item, index) {
          if ((index + 1) <= limit) {
            let url = `/products/${item.handle}?view=card`;
            fetch(url, {
              method: "GET",
              redirect: "error",
            })
              .then(function (response) {
                if (response.status === 200) {
                  return response.text();
                } else {
                  let cleanUpArray = items.filter((i) => i.handle !== item.handle);
                  localStorage.setItem("recentlyViewed", JSON.stringify(cleanUpArray));
                  return "";
                }
              })
              .then(function (card) {
                el.insertAdjacentHTML("beforeend", card);
              })
              .catch(function (error) {
                let cleanUpArray = items.filter((i) => i.handle !== item.handle);
                localStorage.setItem("recentlyViewed", JSON.stringify(cleanUpArray));
              });
          }
        });
      } else {
        document.getElementById("recently-viewed").style.display = "none";
      }
    }
  }

  const ready = (callback) => {
    if (document.readyState !== 'loading') callback();
    else document.addEventListener('DOMContentLoaded', callback);
  };

  ready(function () {
    displayRecentlyViewed();
    if (templateIsProduct) {
      saveRecentlyViewedProduct(productHandle);
    }

    document.addEventListener(
      'click',
      function (event) {
        if (event.target.closest('.splide__arrow')) {
          event.preventDefault();
        }
      },
      true
    );
  });
})()