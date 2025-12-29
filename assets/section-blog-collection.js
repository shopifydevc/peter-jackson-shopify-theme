const ARTICLES_PER_PAGE = 8;

const params = new URLSearchParams(window.location.search);
const selectedTag = params.get("tag");
let currentPageNumber = parseInt(params.get("page")) || 1;

const requiresLifestyleFilter = document.querySelector(".blog-collection").dataset.lifestyleFilter === "true";

const allArticles = JSON.parse(document.currentScript.getAttribute("data-articles"));

const displayableArticleIds = allArticles
  .filter((article) => {
    if (requiresLifestyleFilter && !article.tags.includes("Lifestyle")) return false;
    if (selectedTag && !article.tags.includes(selectedTag)) return false;
    return true;
  })
  .map((article) => article.id);

const totalPages = Math.ceil(displayableArticleIds.length / ARTICLES_PER_PAGE);

const renderArticles = (pageNum) => {
  const startIndex = (pageNum - 1) * ARTICLES_PER_PAGE;
  const pageArticleIds = displayableArticleIds.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
  const articlesContainer = document.getElementById("article-list");

  if (!pageArticleIds.length) {
    articlesContainer.innerHTML = '<div class="blog-collection__empty"><h3>Sorry, unfortunately no articles were found for this topic.</h3></div>';
    return;
  }

  articlesContainer.innerHTML = "";
  pageArticleIds.forEach((id) => {
    const template = document.querySelector(`template[data-article="${id}"]`);
    if (template) {
      articlesContainer.appendChild(template.content.cloneNode(true));
    }
  });

  window.triggerCardLoadAnimation?.("#article-list");
};

const renderPagination = () => {
  const paginationContainer = document.getElementById("pagination");

  if (totalPages <= 1 || !displayableArticleIds.length) {
    paginationContainer.innerHTML = "";
    return;
  }

  paginationContainer.innerHTML = [
    currentPageNumber > 1 && createPageLink(currentPageNumber - 1, "Previous", "prev"),
    ...Array.from({length: totalPages}, (_, i) => {
      const pageNum = i + 1;
      return pageNum === currentPageNumber ? `<span class="blog-collection__pagination-current">${pageNum}</span>` : createPageLink(pageNum, pageNum);
    }),
    currentPageNumber < totalPages && createPageLink(currentPageNumber + 1, "Next", "next"),
  ]
      .filter(Boolean)
      .join("");
};

const createPageLink = (pageNum, text, modifier = "") => {
  const classModifier = modifier ? `blog-collection__pagination-link--${modifier}` : "";
  return `<a href="#" class="blog-collection__pagination-link ${classModifier}" data-page="${pageNum}">${text}</a>`;
};

const handlePaginationClick = (e) => {
  const link = e.target.closest("[data-page]");
  if (!link) return;

  e.preventDefault();
  const newPage = parseInt(link.dataset.page);

  const newParams = new URLSearchParams({ page: newPage });
  if (selectedTag) newParams.set("tag", selectedTag);
  history.pushState(null, "", `${window.location.pathname}?${newParams}`);

  currentPageNumber = newPage;
  renderArticles(newPage);
  renderPagination();

  document.querySelector(".blog-collection").scrollIntoView({ behavior: "smooth" });
};

renderArticles(currentPageNumber);
renderPagination();
document.getElementById("pagination").addEventListener("click", handlePaginationClick);
