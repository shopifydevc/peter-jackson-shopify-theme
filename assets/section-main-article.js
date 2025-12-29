(() => {
  const articleContent = document.querySelector('.article-content');
  if (articleContent) {
    const firstParagraph = articleContent.querySelector('p');
    if (firstParagraph && firstParagraph.textContent.trim()) {
      const text = firstParagraph.innerHTML;
      const firstChar = firstParagraph.textContent.trim()[0];
      const charIndex = text.indexOf(firstChar);

      if (charIndex >= 0) {
        firstParagraph.innerHTML = text.substring(0, charIndex) +
            '<span class="leading-letter">' +
            firstChar +
            '</span>' +
            text.substring(charIndex + 1);
      }
    }
  }
})();