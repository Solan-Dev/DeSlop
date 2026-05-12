const DEFAULT_SETTINGS = {
  keywordBlacklist: [],
  mutedAuthors: [],
  collapseInsteadOfHide: false
};

const POST_SELECTOR = "div.occludable-update";
const SPONSORED_PATTERNS = [/\bsponsored\b/i, /\bpromoted\b/i];
const RECOMMENDED_PATTERNS = [
  /suggested\s+for\s+you/i,
  /recommended\s+for\s+you/i,
  /because\s+you\s+follow/i,
  /people\s+you\s+may\s+know/i,
  /from\s+your\s+network/i
];

const COLLAPSED_CLASS = "deslop-collapsed";
const BADGE_CLASS = "deslop-badge";

let settings = { ...DEFAULT_SETTINGS };
let debounceTimer;

function normalizeList(values) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function injectStyles() {
  if (document.getElementById("deslop-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "deslop-styles";
  style.textContent = `
    .${COLLAPSED_CLASS} {
      max-height: 64px !important;
      overflow: hidden !important;
      opacity: 0.55 !important;
      position: relative;
    }

    .${BADGE_CLASS} {
      background: #e7f3ff;
      border: 1px solid #70b5f9;
      border-radius: 999px;
      color: #0a66c2;
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      margin: 8px 0;
      padding: 2px 8px;
    }
  `;

  document.documentElement.appendChild(style);
}

function parseAuthor(post) {
  const authorCandidates = [
    "span.update-components-actor__title span[aria-hidden='true']",
    "a[href*='/in/'] span[aria-hidden='true']",
    "a[href*='/company/'] span[aria-hidden='true']",
    "span.feed-shared-actor__name"
  ];

  for (const selector of authorCandidates) {
    const value = post.querySelector(selector)?.textContent?.trim();
    if (value) {
      return value.toLowerCase();
    }
  }

  return "";
}

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function shouldFilter(post) {
  const content = post.innerText.toLowerCase();

  if (hasAnyPattern(content, SPONSORED_PATTERNS)) {
    return true;
  }

  if (hasAnyPattern(content, RECOMMENDED_PATTERNS)) {
    return true;
  }

  const keywordBlacklist = normalizeList(settings.keywordBlacklist);
  for (const keyword of keywordBlacklist) {
    if (content.includes(keyword)) {
      return true;
    }
  }

  const mutedAuthors = normalizeList(settings.mutedAuthors);
  const author = parseAuthor(post);
  return Boolean(author) && mutedAuthors.has(author);
}

function resetPost(post) {
  if (post.dataset.deslopHidden === "true") {
    post.style.display = post.dataset.deslopDisplay || "";
    delete post.dataset.deslopHidden;
    delete post.dataset.deslopDisplay;
  }

  post.classList.remove(COLLAPSED_CLASS);
  post.querySelector(`.${BADGE_CLASS}`)?.remove();
}

function filterPost(post) {
  resetPost(post);

  if (!shouldFilter(post)) {
    return;
  }

  if (settings.collapseInsteadOfHide) {
    post.classList.add(COLLAPSED_CLASS);
    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.textContent = "Filtered by DeSlop";
    post.prepend(badge);
    return;
  }

  post.dataset.deslopDisplay = post.style.display || "";
  post.dataset.deslopHidden = "true";
  post.style.display = "none";
}

function applyFilters() {
  const posts = document.querySelectorAll(POST_SELECTOR);
  posts.forEach(filterPost);
}

function scheduleApplyFilters() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 150);
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  settings = {
    keywordBlacklist: Array.isArray(stored.keywordBlacklist)
      ? stored.keywordBlacklist
      : DEFAULT_SETTINGS.keywordBlacklist,
    mutedAuthors: Array.isArray(stored.mutedAuthors)
      ? stored.mutedAuthors
      : DEFAULT_SETTINGS.mutedAuthors,
    collapseInsteadOfHide: Boolean(stored.collapseInsteadOfHide)
  };
}

function observeFeed() {
  const observer = new MutationObserver(scheduleApplyFilters);
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") {
    return;
  }

  if (changes.keywordBlacklist) {
    settings.keywordBlacklist = Array.isArray(changes.keywordBlacklist.newValue)
      ? changes.keywordBlacklist.newValue
      : [];
  }

  if (changes.mutedAuthors) {
    settings.mutedAuthors = Array.isArray(changes.mutedAuthors.newValue)
      ? changes.mutedAuthors.newValue
      : [];
  }

  if (changes.collapseInsteadOfHide) {
    settings.collapseInsteadOfHide = Boolean(changes.collapseInsteadOfHide.newValue);
  }

  scheduleApplyFilters();
});

(async function init() {
  injectStyles();
  await loadSettings();
  scheduleApplyFilters();
  observeFeed();
})();
