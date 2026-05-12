const DEFAULT_SETTINGS = {
  keywordBlacklist: [],
  mutedAuthors: [],
  collapseInsteadOfHide: false,
  filterAiSlop: true
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

// Hard phrase / structural patterns — one match is enough to flag a post.
const AI_PATTERNS = [
  // Hook openers
  /\bhere'?s\s+the\s+thing\b/i,
  /\blet\s+that\s+sink\s+in\b/i,
  /\bhot\s+take\s*:/i,
  /\bunpopular\s+opinion\s*:/i,
  /\bplot\s+twist\s*:/i,

  // Engagement bait
  /\bsave\s+this\s+post\b/i,
  /\bdrop\s+a\s+🔥\s+if\b/i,
  /\bcomment\s+yes\s+if\b/i,
  /\btag\s+someone\s+who\b/i,
  /\brepost\s+if\s+you\s+agree\b/i,
  /\blike\s+if\s+you\s+agree\b/i,
  /\bfollow\s+me\s+for\s+more\b/i,

  // False urgency / nobody-talks-about
  /\bthis\s+is\s+your\s+reminder\b/i,
  /\bi\s+need\s+to\s+talk\s+about\b/i,
  /\bwe\s+need\s+to\s+talk\s+about\b/i,
  /\bnobody\s+talks\s+about\s+this\b/i,
  /\bthe\s+secret\s+no\s+one\s+tells\s+you\b/i,
  /\bthis\s+changed\s+everything\b/i,

  // AI meta-tells
  /\bas\s+an\s+ai\b/i,
  /\bi\s+cannot\s+stress\s+this\s+enough\b/i,
  /\bit'?s?\s+worth\s+noting\b/i,
  /\bit'?s?\s+important\s+to\s+note\b/i,
  /\bit'?s?\s+crucial\s+to\b/i,
  /\bneedless\s+to\s+say\b/i,
  /\bwithout\s+further\s+ado\b/i,
  /\bthat\s+being\s+said\b/i,
  /\bwith\s+that\s+said\b/i,
  /\bin\s+today'?s?\s+world\b/i,
  /\bat\s+the\s+end\s+of\s+the\s+day\b/i,
  /\bmoving\s+forward\b/i,
  /\bin\s+essence\b/i,
  /\bsimply\s+put\b/i,
  /\bthe\s+bottom\s+line\s+is\b/i,
  /\bto\s+put\s+it\s+simply\b/i,
  /\bin\s+other\s+words\b/i,

  // Filler transitions (only flag when they open a sentence / paragraph)
  /(?:^|\n)\s*furthermore[,\s]/i,
  /(?:^|\n)\s*moreover[,\s]/i,
  /(?:^|\n)\s*nevertheless[,\s]/i,
  /(?:^|\n)\s*consequently[,\s]/i,
  /(?:^|\n)\s*subsequently[,\s]/i,
  /(?:^|\n)\s*in\s+conclusion[,\s]/i,
  /(?:^|\n)\s*all\s+things\s+considered[,\s]/i,

  // Inflated / buzzword vocabulary
  /\bdelve\s+into\b/i,
  /\bdive\s+deep\s+into\b/i,
  /\bin\s+the\s+realm\s+of\b/i,
  /\bparadigm\s+shift\b/i,
  /\bmultifaceted\b/i,
  /\bgroundbreaking\b/i,
  /\btransformative\b/i,
  /\brevolutionary\b/i,
  /\bsynergy\b/i,

  // Formulaic story openers
  /\bi\s+recently\s+had\s+a\s+conversation\s+with\b/i,
  /\ba\s+client\s+asked\s+me\b/i,
  /\bi\s+was\s+on\s+a\s+call\s+with\b/i,
  /\bsomeone\s+dm'?e?d?\s+me\b/i,
  /\bi'?ve\s+been\s+getting\s+a\s+lot\s+of\s+questions\s+about\b/i,

  // Structural / template patterns
  /\bno\s+\w+[,.]?\s+no\s+\w+[,.]?\s+just\s+\w+/i,
  /\b(?:not|no)\s+about\s+.{1,60},\s+it'?s?\s+about\b/i,
  /\d+\s+things?\s+(?:i\s+)?(?:wish|learned|discovered)\b/i,
  /\d+\s+(?:lessons?|tips?|ways?|steps?|rules?)\s+(?:from|to)\b/i,
  /\bi\s+used\s+to\s+(?:think|believe).{1,80}but\s+now\b/i,
  /\bswipe\s+(?:left|right)\s+to\b/i,
  /\bshare\s+this\s+with\s+(?:someone|anyone)\b/i,
  /\bcomment\s+(?:below|down|your)\b/i,
  /\bwhat\s+do\s+you\s+think\?/i,

  // Bullet / list structural tells
  /(?:→.+\n){2}→/,
];

// Density signals — individually weak, but ≥ 3 together flag a post.
const AI_LONG_POST_MIN_LENGTH = 800;
const AI_DENSITY_SIGNALS = [
  // More than 3 exclamation-terminated sentences
  (text) => (text.match(/!\s/g) || []).length > 3,
  // 4+ standalone emoji-only lines
  (text) =>
    (
      text.match(
        /^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+\s*$/gimu
      ) || []
    ).length >= 4,
  // Long post (>800 chars) with no hyperlinks or @mentions
  (text) => text.length > AI_LONG_POST_MIN_LENGTH && !/https?:\/\/|@\w/.test(text),
  // 3+ rocket / bulb / checkmark / fire / pointing-down emojis
  (text) => (text.match(/[🚀💡✅🔥👇]/gu) || []).length > 3,
];

function looksLikeAiSlop(text) {
  if (AI_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  const signals = AI_DENSITY_SIGNALS.filter((fn) => fn(text)).length;
  return signals >= 3;
}

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
    return "Sponsored";
  }

  if (hasAnyPattern(content, RECOMMENDED_PATTERNS)) {
    return "Recommended";
  }

  const keywordBlacklist = normalizeList(settings.keywordBlacklist);
  for (const keyword of keywordBlacklist) {
    if (content.includes(keyword)) {
      return "Keyword match";
    }
  }

  const mutedAuthors = normalizeList(settings.mutedAuthors);
  const author = parseAuthor(post);
  if (Boolean(author) && mutedAuthors.has(author)) {
    return "Muted author";
  }

  if (settings.filterAiSlop && looksLikeAiSlop(post.innerText)) {
    return "AI Slop";
  }

  return null;
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

  const reason = shouldFilter(post);
  if (!reason) {
    return;
  }

  if (settings.collapseInsteadOfHide) {
    post.classList.add(COLLAPSED_CLASS);
    const badge = document.createElement("div");
    badge.className = BADGE_CLASS;
    badge.textContent = `${reason} – DeSlop`;
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
    collapseInsteadOfHide: Boolean(stored.collapseInsteadOfHide),
    filterAiSlop: stored.filterAiSlop !== false
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

  if (changes.filterAiSlop) {
    settings.filterAiSlop = changes.filterAiSlop.newValue !== false;
  }

  scheduleApplyFilters();
});

(async function init() {
  injectStyles();
  await loadSettings();
  scheduleApplyFilters();
  observeFeed();
})();
