document.querySelector(".contact-form__form").addEventListener("submit", function () {
  const button = document.querySelector(".contact-form__button");
  button.innerHTML = `<span class="loader--spinner"></span>`;
});
