const dataLocations = JSON.parse(document.currentScript.getAttribute("data-locations"));
const dataLocationUrls = JSON.parse(document.currentScript.getAttribute("data-location-urls"));

class StoreLocator {
  constructor() {
    this.searchTerm = "";
    this.selectedState = "";
    this.selectedStatus = "";
    this.selectedService = "";
    this.markers = [];
    this.map = null;
    this.timezoneHandler = null;
    this.searchInput = document.getElementById("searchInput");
    this.stateSelect = document.getElementById("stateSelect");
    this.statusSelect = document.getElementById("statusSelect");
    this.serviceSelect = document.getElementById("serviceSelect");
    this.autocomplete = document.getElementById("autocomplete");
    this.sidebar = document.querySelector(".store-locator__sidebar");
    this.fixedHeader = document.querySelector(".store-locator__fixed-header");
    this.searchTimeout = null;
    this.postcodeCache = {};
    this.noResultsContainer = null;
    this.stateBounds = {
      NSW: [
        [-37.5, 141],
        [-28, 154],
      ],
      VIC: [
        [-39.2, 141],
        [-34, 150],
      ],
      QLD: [
        [-29, 138],
        [-10, 154],
      ],
      SA: [
        [-38, 129],
        [-26, 141],
      ],
      WA: [
        [-35, 113],
        [-14, 129],
      ],
      TAS: [
        [-43.7, 144],
        [-40, 149],
      ],
      NT: [
        [-26, 129],
        [-11, 138],
      ],
      ACT: [
        [-35.9, 148.7],
        [-35.1, 149.4],
      ],
    };

    this.init();
  }

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const querySearch = urlParams.get("search");

    if (querySearch) {
      this.searchTerm = querySearch;
      this.searchInput.value = querySearch;
      this.selectedState = "";
    }

    const queryState = urlParams.get("state");
    const storedState = sessionStorage.getItem("selectedState");

    if (!querySearch) {
      if (queryState && ["WA", "NT", "SA", "QLD", "NSW", "VIC", "ACT", "TAS", ""].includes(queryState)) {
        this.selectedState = queryState;
        this.stateSelect.value = queryState;
        sessionStorage.setItem("selectedState", queryState);
      } else if (storedState && ["WA", "NT", "SA", "QLD", "NSW", "VIC", "ACT", "TAS", ""].includes(storedState)) {
        this.selectedState = storedState;
        this.stateSelect.value = storedState;
      }
    }

    this.timezoneHandler = new ShopifyTimezoneHandler();

    this.searchInput.addEventListener("input", () => {
      this.handleSearch();
    });

    this.stateSelect.addEventListener("change", () => {
      this.selectedState = this.stateSelect.value;
      this.selectedStatus = "";
      this.selectedService = "";
      this.statusSelect.value = "";
      this.serviceSelect.value = "";
      this.filterLocations();
      this.zoomToState(this.selectedState);
    });

    this.statusSelect.addEventListener("change", () => {
      this.selectedStatus = this.statusSelect.value;
      this.filterLocations();
    });

    this.serviceSelect.addEventListener("change", () => {
      this.selectedService = this.serviceSelect.value;
      this.filterLocations();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#searchInput") && !e.target.closest("#autocomplete")) {
        this.hideAutocomplete();
      }
    });

    this.waitForLeafletAndInit();
  }

  waitForLeafletAndInit() {
    if (typeof L !== "undefined") {
      this.initMap();
      this.filterLocations();
      this.updateAllLocationTimes();
      setInterval(() => this.updateAllLocationTimes(), 60000);
    } else {
      setTimeout(() => this.waitForLeafletAndInit(), 50);
    }
  }

  initMap() {
    const isMobile = window.innerWidth < 1000;
    const zoomLevel = isMobile ? 3 : 5;

    this.map = L.map("map").setView([-25.2744, 133.7751], zoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(this.map);

    const storeIcon = L.icon({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    for (let i = 0; i < dataLocations.length; i++) {
      const currentLocation = dataLocations[i];
      const currentLocationUrl = dataLocationUrls[i + 1];

      if (!currentLocation.latitude || !currentLocation.longitude) continue;

      const marker = L.marker([currentLocation.latitude, currentLocation.longitude], { icon: storeIcon }).bindPopup(`
          <div class="location-item__header">
            <h3 class="location-item__title heading--xl">${currentLocation.location_name}</h3>
          </div>
          <div class="location-item__address body">
            <a href="${currentLocation.google_maps_link}">${currentLocation.street_address}</a>
          </div>
          <div class="location-item__contact body">
            <a href="mailto:${currentLocation.email_address}">${currentLocation.email_address}</a><br>
            <a href="tel:${currentLocation.phone_number}">${currentLocation.phone_number}</a>
          </div>
          <div class="location-item__hours body">
            <a href="${currentLocationUrl}">View Location Details</a>
          </div>
          <div>
            <a href="mailto:${currentLocation.email_address}" class="location-item__contact-button body">Contact Store</a>
          </div>
        `);

      marker.locationData = {
        name: currentLocation.location_name,
        address: currentLocation.street_address ?? "",
        state: currentLocation.location_state ?? "",
      };
      this.markers.push(marker);
      marker.addTo(this.map);
    }
  }

  zoomToState(state) {
    if (!state) {
      const isMobile = window.innerWidth < 1000;
      const zoomLevel = isMobile ? 3 : 5;
      this.map.setView([-25.2744, 133.7751], zoomLevel);
    } else if (this.stateBounds[state]) {
      this.map.fitBounds(this.stateBounds[state], { padding: [20, 20] });
    }
  }

  centerOnLocation(locationName) {
    const locationItem = Array.from(document.querySelectorAll(".location-item[data-lat]")).find((item) => item.dataset.name === locationName);

    if (locationItem) {
      const lat = parseFloat(locationItem.dataset.lat);
      const lng = parseFloat(locationItem.dataset.lng);
      this.map.setView([lat, lng], 13);
    }
  }

  handleSearch() {
    clearTimeout(this.searchTimeout);

    const currentInput = this.searchInput.value;

    if (!currentInput) {
      this.searchTerm = "";
      this.filterLocations();
      this.hideAutocomplete();
      this.zoomToState(this.selectedState);
      return;
    }

    this.showLoader();

    const is4DigitPostcode = /^\d{4}$/.test(currentInput.trim());

    if (is4DigitPostcode) {
      this.searchTimeout = setTimeout(() => {
        this.findNearestByPostcode(currentInput.trim());
      }, 500);
    } else {
      this.searchTimeout = setTimeout(() => {
        this.showTextSearchResults(currentInput);
      }, 300);
    }
  }

  showLoader() {
    this.autocomplete.innerHTML = `
      <div class="store-locator__autocomplete-loader">
        <svg style="height:4px;display:block" viewBox="0 0 40 4" xmlns="http://www.w3.org/2000/svg">
          <style>.react{animation:moving 1s ease-in-out infinite}@keyframes moving{0%{width:0}50%{width:100%;transform:translate(0,0)}100%{width:0;right:0;transform:translate(100%,0)}}</style>
          <rect class="react" fill="#E7E7E7" height="4" width="40" />
        </svg>
      </div>
    `;
    this.showAutocomplete();
  }

  showAutocomplete() {
    this.autocomplete.style.display = "block";
    setTimeout(() => {
      this.autocomplete.classList.add("store-locator__autocomplete--visible");
    }, 10);
  }

  hideAutocomplete() {
    this.autocomplete.classList.remove("store-locator__autocomplete--visible");
    setTimeout(() => {
      this.autocomplete.style.display = "none";
    }, 300);
  }

  showTextSearchResults(searchValue) {
    const searchLower = searchValue.toLowerCase();

    const matches = Array.from(document.querySelectorAll(".location-item[data-lat]"))
      .filter((item) => {
        const name = item.dataset.name.toLowerCase();
        const address = item.dataset.address.toLowerCase();
        const state = item.dataset.state;
        const stateLower = state.toLowerCase();

        const matchesSearch = name.includes(searchLower) || address.includes(searchLower) || stateLower.includes(searchLower);
        const matchesState = !this.selectedState || state === this.selectedState;

        return matchesSearch && matchesState;
      })
      .slice(0, 5);

    if (!matches.length) {
      this.showNoResults(searchValue);
      return;
    }

    this.autocomplete.innerHTML = matches.map((item) => `<div class="store-locator__autocomplete-item" data-name="${item.dataset.name}">${item.dataset.name} - ${item.dataset.address}</div>`).join("");

    this.autocomplete.querySelectorAll(".store-locator__autocomplete-item").forEach((div) => {
      div.onclick = () => {
        this.searchInput.value = div.dataset.name;
        this.searchTerm = div.dataset.name;
        this.selectedStatus = "";
        this.selectedService = "";
        this.statusSelect.value = "";
        this.serviceSelect.value = "";
        this.centerOnLocation(div.dataset.name);
        this.filterLocations();
        this.hideAutocomplete();
      };
    });

    this.showAutocomplete();
  }

  showNoResults(searchValue) {
    this.autocomplete.innerHTML = `
      <div class="store-locator__autocomplete-error">
        <p class="body">Sorry, your search for "<span>${searchValue}</span>" returned zero results, please try search by state or postcode.</p>
      </div>
    `;
    this.showAutocomplete();
  }

  getLocalPostcodeMatches(postcode) {
    return Array.from(document.querySelectorAll(".location-item[data-lat]"))
      .filter((item) => {
        const itemPostcode = item.dataset.postcode;
        const state = item.dataset.state;
        const matchesPostcode = itemPostcode === postcode;
        const matchesState = !this.selectedState || state === this.selectedState;
        return matchesPostcode && matchesState;
      })
      .map((item) => ({
        element: item,
        name: item.dataset.name,
        postcode: item.dataset.postcode,
        distance: 0,
      }));
  }

  showLocalPostcodeResults(postcode, locations) {
    this.autocomplete.innerHTML = '<div class="store-locator__autocomplete-header heading--xl">Stores in ' + postcode + "</div>" + locations.map((loc) => `<div class="store-locator__autocomplete-item" data-name="${loc.name}"><strong class="body--bold">${loc.name}</strong></div>`).join("");

    this.autocomplete.querySelectorAll(".store-locator__autocomplete-item").forEach((div) => {
      div.onclick = () => {
        this.searchInput.value = div.dataset.name;
        this.searchTerm = div.dataset.name;
        this.selectedStatus = "";
        this.selectedService = "";
        this.statusSelect.value = "";
        this.serviceSelect.value = "";
        this.centerOnLocation(div.dataset.name);
        this.filterLocations();
        this.hideAutocomplete();
      };
    });

    this.showAutocomplete();
  }

  async findNearestByPostcode(postcode) {
    const localMatches = this.getLocalPostcodeMatches(postcode);

    if (localMatches.length > 0) {
      this.showLocalPostcodeResults(postcode, localMatches);
      return;
    }

    if (this.postcodeCache[postcode]) {
      this.displayCachedPostcodeResults(postcode, this.postcodeCache[postcode]);
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${postcode}&country=australia&format=json&limit=1`, {
        headers: {
          "User-Agent": "StoreLocator/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.length) {
        this.autocomplete.innerHTML = `
          <div class="store-locator__autocomplete-error">
            <p class="body">Invalid postcode</p>
          </div>
        `;
        this.showAutocomplete();
        return;
      }

      const userLocation = L.latLng(data[0].lat, data[0].lon);

      const locations = Array.from(document.querySelectorAll(".location-item[data-lat]"))
        .filter((item) => {
          const state = item.dataset.state;
          return !this.selectedState || state === this.selectedState;
        })
        .map((item) => ({
          element: item,
          name: item.dataset.name,
          postcode: item.dataset.postcode,
          distance: userLocation.distanceTo(L.latLng(item.dataset.lat, item.dataset.lng)) / 1000,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      this.postcodeCache[postcode] = {
        userLocation: userLocation,
        locations: locations,
      };

      this.autocomplete.innerHTML = '<div class="store-locator__autocomplete-header heading--xl">5 Nearest Stores</div>' +
          locations
              .map((loc) => {
                const distanceText = loc.postcode === postcode ? "" : ` - ${loc.distance.toFixed(1)} km away`;
                return `<div class="store-locator__autocomplete-item" data-name="${loc.name}"><strong class="body--bold">${loc.name}</strong>${distanceText}</div>`;
              })
              .join("");

      this.autocomplete.querySelectorAll(".store-locator__autocomplete-item").forEach((div) => {
        div.onclick = () => {
          this.searchInput.value = div.dataset.name;
          this.searchTerm = div.dataset.name;
          this.selectedStatus = "";
          this.selectedService = "";
          this.statusSelect.value = "";
          this.serviceSelect.value = "";
          this.centerOnLocation(div.dataset.name);
          this.filterLocations();
          this.hideAutocomplete();
        };
      });

      this.showAutocomplete();
    } catch (error) {
      console.error("Error finding nearest stores:", error);

      const fallbackMatches = this.getLocalPostcodeMatches(postcode);

      if (fallbackMatches.length > 0) {
        this.showLocalPostcodeResults(postcode, fallbackMatches);
      } else {
        this.autocomplete.innerHTML = `
          <div class="store-locator__autocomplete-error">
            <p class="body">Error finding nearest stores</p>
          </div>
        `;
        this.showAutocomplete();
      }
    }
  }

  displayCachedPostcodeResults(postcode, cachedData) {
    this.autocomplete.innerHTML = '<div class="store-locator__autocomplete-header heading--xl">5 Nearest Stores</div>' +
        cachedData.locations
            .map((loc) => {
              const distanceText = loc.postcode === postcode ? "" : ` - ${loc.distance.toFixed(1)} km away`;
              return `<div class="store-locator__autocomplete-item" data-name="${loc.name}"><strong class="body--bold">${loc.name}</strong>${distanceText}</div>`;
            })
            .join("");

    this.autocomplete.querySelectorAll(".store-locator__autocomplete-item").forEach((div) => {
      div.onclick = () => {
        this.searchInput.value = div.dataset.name;
        this.searchTerm = div.dataset.name;
        this.selectedStatus = "";
        this.selectedService = "";
        this.statusSelect.value = "";
        this.serviceSelect.value = "";
        this.centerOnLocation(div.dataset.name);
        this.filterLocations();
        this.hideAutocomplete();
      };
    });

    this.showAutocomplete();
  }

  isLocationVisible(name, address, state, statusDot, locationElement) {
    const searchLower = this.searchTerm.toLowerCase();
    const matchesSearch = !this.searchTerm || name.toLowerCase().includes(searchLower) || address.toLowerCase().includes(searchLower) || state.toLowerCase().includes(searchLower);

    const matchesState = !this.selectedState || state === this.selectedState;

    const isClosed = statusDot?.classList.contains("location-item__status-dot--closed");
    const matchesStatus = !this.selectedStatus || (this.selectedStatus === "open" && !isClosed) || (this.selectedStatus === "closed" && isClosed);

    const matchesServices = !this.selectedService || locationElement.dataset[this.selectedService.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] === "true";

    return matchesSearch && matchesState && matchesStatus && matchesServices;
  }

  clearStatusFilter() {
    this.selectedStatus = "";
    this.statusSelect.value = "";
    this.filterLocations();
  }

  clearServiceFilter() {
    this.selectedService = "";
    this.serviceSelect.value = "";
    this.filterLocations();
  }

  clearAllFilters() {
    this.selectedStatus = "";
    this.selectedService = "";
    this.statusSelect.value = "";
    this.serviceSelect.value = "";
    this.filterLocations();
  }

  showNoResultsMessage() {
    if (!this.noResultsContainer) {
      this.noResultsContainer = document.createElement("div");
      this.noResultsContainer.className = "store-locator__no-results";
    }

    const activeFilters = [];
    if (this.selectedStatus) activeFilters.push("status");
    if (this.selectedService) activeFilters.push("services");

    let buttonsHTML = "";
    if (this.selectedStatus && this.selectedService) {
      buttonsHTML = `
        <button class="store-locator__clear-button body" data-clear="status">Clear Status Filter</button>
        <button class="store-locator__clear-button body" data-clear="service">Clear Service Filter</button>
        <button class="store-locator__clear-button body" data-clear="all">Clear All Filters</button>
      `;
    } else if (this.selectedStatus) {
      buttonsHTML = `
        <button class="store-locator__clear-button body" data-clear="status">Clear Status Filter</button>
      `;
    } else if (this.selectedService) {
      buttonsHTML = `
        <button class="store-locator__clear-button body" data-clear="service">Clear Service Filter</button>
      `;
    }

    this.noResultsContainer.innerHTML = `
      <h3 class="store-locator__no-results-title heading--xl">No Stores Found</h3>
      <p class="store-locator__no-results-text body">No stores match your current filter selection. Try adjusting your filters below:</p>
      <div class="store-locator__clear-buttons">
        ${buttonsHTML}
      </div>
    `;

    const firstLocationItem = this.sidebar.querySelector(".location-item");
    if (firstLocationItem) {
      this.sidebar.insertBefore(this.noResultsContainer, firstLocationItem);
    } else {
      this.sidebar.appendChild(this.noResultsContainer);
    }

    this.noResultsContainer.querySelectorAll(".store-locator__clear-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const clearType = e.target.getAttribute("data-clear");
        if (clearType === "status") {
          this.clearStatusFilter();
        } else if (clearType === "service") {
          this.clearServiceFilter();
        } else if (clearType === "all") {
          this.clearAllFilters();
        }
      });
    });
  }

  hideNoResultsMessage() {
    if (this.noResultsContainer && this.noResultsContainer.parentNode) {
      this.noResultsContainer.remove();
    }
  }

  filterLocations() {
    sessionStorage.setItem("selectedState", this.selectedState);

    let visibleCount = 0;

    this.markers.forEach((marker) => {
      const data = marker.locationData;
      const locationElement = Array.from(document.querySelectorAll(".location-item[data-lat]")).find((item) => item.dataset.name === data.name);

      if (locationElement) {
        const statusDot = locationElement.querySelector(".location-item__status-dot");

        if (this.isLocationVisible(data.name, data.address, data.state, statusDot, locationElement)) {
          marker.addTo(this.map);
        } else {
          marker.remove();
        }
      }
    });

    const locations = document.querySelectorAll(".location-item[data-lat]");
    locations.forEach((item) => {
      const name = item.getAttribute("data-name");
      const address = item.getAttribute("data-address");
      const state = item.getAttribute("data-state") || "";
      const statusDot = item.querySelector(".location-item__status-dot");

      if (this.isLocationVisible(name, address, state, statusDot, item)) {
        item.style.display = "";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    if (visibleCount === 0 && (this.selectedStatus || this.selectedService)) {
      this.showNoResultsMessage();
    } else {
      this.hideNoResultsMessage();
    }

    this.updateAllLocationTimes();
  }

  updateAllLocationTimes() {
    const locationItems = document.querySelectorAll(".location-item[data-state]");
    locationItems.forEach((item) => {
      const state = item.getAttribute("data-state");
      const hours = item.getAttribute("data-hours");

      if (state && hours) {
        const timeData = this.timezoneHandler.getStateTime(state);
        const openingStatus = this.timezoneHandler.checkOpeningStatus(timeData, hours);

        const statusDot = item.querySelector(".location-item__status-dot");
        if (statusDot && openingStatus) {
          if (openingStatus.isOpen) {
            statusDot.classList.remove("location-item__status-dot--closed");
          } else {
            statusDot.classList.add("location-item__status-dot--closed");
          }
        }

        const popover = item.querySelector('[id^="popover-"]');
        if (popover && openingStatus && (openingStatus.openTime || openingStatus.closeTime)) {
          const timeUntil = openingStatus.isOpen ? this.timezoneHandler.getTimeUntil(timeData.time, openingStatus.closeTime) : this.timezoneHandler.getTimeUntil(timeData.time, openingStatus.openTime);

          if (timeUntil) {
            popover.textContent = openingStatus.isOpen ? `Closes in ${timeUntil}` : `Opens in ${timeUntil}`;

            if (!statusDot.dataset.popoverInit) {
              statusDot.onmouseenter = (e) => {
                const r = e.target.getBoundingClientRect();
                popover.style.cssText = `left:${r.left}px;top:${r.bottom + 5}px;`;
                popover.showPopover();
              };
              statusDot.onmouseleave = () => popover.hidePopover();
              statusDot.dataset.popoverInit = "true";
            }
          }
        }

        const todayHoursElement = item.querySelector("[data-today-hours]");
        if (todayHoursElement && openingStatus) {
          todayHoursElement.textContent = openingStatus.hours || "Hours not available";
        }
      }
    });
  }
}

class ShopifyTimezoneHandler {
  constructor() {
    this.timezones = {
      NSW: "Australia/Sydney",
      VIC: "Australia/Melbourne",
      QLD: "Australia/Brisbane",
      SA: "Australia/Adelaide",
      WA: "Australia/Perth",
      TAS: "Australia/Hobart",
      NT: "Australia/Darwin",
      ACT: "Australia/Sydney",
    };
    this.dstStates = ["NSW", "VIC", "SA", "TAS", "ACT"];
  }

  getStateTime(state) {
    if (!this.timezones[state]) {
      console.error(`Unknown state: ${state}`);
      return null;
    }

    const timezone = this.timezones[state];
    const now = new Date();

    const formatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "long",
    });

    const parts = formatter.formatToParts(now);
    const timeData = {};
    parts.forEach((part) => (timeData[part.type] = part.value));

    const offsetFormatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const currentOffset = offsetFormatter.formatToParts(now).find((part) => part.type === "timeZoneName").value;

    const isDSTActive = this.isDSTActive(timezone, now);

    return {
      state: state,
      time: `${timeData.hour}:${timeData.minute}`,
      day: timeData.weekday,
      date: `${timeData.day}/${timeData.month}/${timeData.year}`,
      offset: currentOffset,
      isDST: isDSTActive,
      observesDST: this.dstStates.includes(state),
    };
  }

  isDSTActive(timezone, date = new Date()) {
    const january = new Date(date.getFullYear(), 0, 15);
    const july = new Date(date.getFullYear(), 6, 15);

    const janOffset = this.getOffset(timezone, january);
    const julOffset = this.getOffset(timezone, july);
    const currentOffset = this.getOffset(timezone, date);

    return janOffset !== julOffset && currentOffset === janOffset;
  }

  getOffset(timezone, date) {
    return new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName").value;
  }

  checkOpeningStatus(timeData, openingHours) {
    if (!timeData || !openingHours) return null;

    const hoursLines = openingHours.split("\n");
    const currentDay = timeData.day;
    const currentTime = timeData.time;

    for (let line of hoursLines) {
      if (line.includes(currentDay)) {
        const parts = line.split(": ");
        if (parts.length < 2) continue;

        const todayHours = parts[1].trim();

        if (todayHours === "Closed") {
          return {
            isOpen: false,
            status: "Closed today",
            hours: todayHours,
          };
        }

        const timeRange = todayHours.split(" - ");
        if (timeRange.length !== 2) continue;

        const [openTime, closeTime] = timeRange;

        const currentMinutes = this.timeToMinutes(currentTime);
        const openMinutes = this.timeToMinutes(openTime);
        const closeMinutes = this.timeToMinutes(closeTime);

        const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

        return {
          isOpen: isOpen,
          status: isOpen ? `Open until ${closeTime}` : `Closed (opens at ${openTime})`,
          hours: todayHours,
          openTime: openTime,
          closeTime: closeTime,
        };
      }
    }

    return {
      isOpen: false,
      status: "Hours not available",
      hours: "Unknown",
    };
  }

  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  getTimeUntil(currentTime, targetTime) {
    const diff = this.timeToMinutes(targetTime) - this.timeToMinutes(currentTime);
    if (diff <= 0) return null;
    const h = Math.floor(diff / 60),
      m = diff % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new StoreLocator());
} else {
  new StoreLocator();
}
