const DEFAULT_SETTINGS = {
  keywordBlacklist: [],
  mutedAuthors: [],
  collapseInsteadOfHide: false,
  filterAiSlop: true
};

const elements = {
  keywordBlacklist: document.getElementById("keywordBlacklist"),
  mutedAuthors: document.getElementById("mutedAuthors"),
  collapseInsteadOfHide: document.getElementById("collapseInsteadOfHide"),
  filterAiSlop: document.getElementById("filterAiSlop"),
  save: document.getElementById("save"),
  status: document.getElementById("status")
};

function splitLines(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinLines(list) {
  return list.join("\n");
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  elements.keywordBlacklist.value = joinLines(settings.keywordBlacklist || []);
  elements.mutedAuthors.value = joinLines(settings.mutedAuthors || []);
  elements.collapseInsteadOfHide.checked = Boolean(settings.collapseInsteadOfHide);
  elements.filterAiSlop.checked = settings.filterAiSlop !== false;
}

async function saveSettings() {
  await chrome.storage.sync.set({
    keywordBlacklist: splitLines(elements.keywordBlacklist.value),
    mutedAuthors: splitLines(elements.mutedAuthors.value),
    collapseInsteadOfHide: elements.collapseInsteadOfHide.checked,
    filterAiSlop: elements.filterAiSlop.checked
  });

  elements.status.textContent = "Saved";
  setTimeout(() => {
    elements.status.textContent = "";
  }, 1200);
}

elements.save.addEventListener("click", saveSettings);

document.addEventListener("DOMContentLoaded", loadSettings);
