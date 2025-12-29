(() => {
  document.querySelector(".filter").addEventListener("submit", function () {
    const button = document.querySelector(".filter__apply-button");
    button.innerHTML = `<span class="loader--spinner"></span>`;
  });
})();
