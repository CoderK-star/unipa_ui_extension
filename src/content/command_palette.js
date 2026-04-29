(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, ui } = namespace.constants;
  const { read, stableHash } = namespace.storage;
  const { createRoot, baseStyles, escapeHtml } = namespace.uiHelpers;

  const builtInKeywords = [
    { label: "ホーム", keywords: ["home", "top", "menu", "\u30db\u30fc\u30e0"] },
    { label: "時間割", keywords: ["\u6642\u9593\u5272", "\u6642\u9593\u8868", "timetable", "schedule"] },
    { label: "掲示板", keywords: ["\u63b2\u793a", "\u304a\u77e5\u3089\u305b", "notice", "news"] },
    { label: "課題提出", keywords: ["\u8ab2\u984c", "\u63d0\u51fa", "report", "assignment"] },
    { label: "シラバス", keywords: ["\u30b7\u30e9\u30d0\u30b9", "syllabus"] },
    { label: "成績", keywords: ["\u6210\u7e3e", "grade", "result"] },
    { label: "履修", keywords: ["\u5c65\u4fee", "course", "registration"] }
  ];

  let commands = [];
  let selectedIndex = 0;

  function start() {
    rebuildCommands();
    document.addEventListener("keydown", handleKeydown, true);

    const observer = new MutationObserver(debounce(rebuildCommands, 500));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function handleKeydown(event) {
    const isPaletteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (!isPaletteShortcut) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openPalette();
  }

  function rebuildCommands() {
    return Promise.all([collectLinkCommands(), collectHistoryCommands()]).then(([linkCommands, historyCommands]) => {
      const byId = new Map();
      [...linkCommands, ...historyCommands].forEach((command) => {
        if (!byId.has(command.id)) {
          byId.set(command.id, command);
        }
      });
      commands = Array.from(byId.values()).slice(0, 80);
    });
  }

  function collectLinkCommands() {
    const links = Array.from(document.querySelectorAll("a[href], button, input[type='button'], input[type='submit']"));
    return Promise.resolve(links.map((element) => {
      const text = normalizeText(element.innerText || element.textContent || element.value || element.getAttribute("title") || "");
      if (!text || text.length > 80) {
        return null;
      }

      const href = element.getAttribute("href");
      const url = href ? normalizeUrl(href) : null;
      if (href && !url) {
        return null;
      }
      const group = matchBuiltInGroup(text, url);
      return {
        id: stableHash(`element:${text}:${url || ""}`),
        title: group ? `${group.label}: ${text}` : text,
        subtitle: url ? new URL(url).pathname : "現在のページの操作",
        searchText: `${text} ${url || ""} ${group ? group.label : ""}`,
        source: "page",
        run: () => {
          if (url) {
            location.href = url;
          } else {
            element.click();
          }
        }
      };
    }).filter(Boolean));
  }

  function collectHistoryCommands() {
    return read(storageKeys.navigationHistory).then((result) => {
      const history = result[storageKeys.navigationHistory] || [];
      return history
        .filter((entry) => entry.url && entry.url !== location.href)
        .map((entry) => ({
          id: stableHash(`history:${entry.url}`),
          title: entry.title || entry.url,
          subtitle: "最近開いたページ",
          searchText: `${entry.title || ""} ${entry.url}`,
          source: "history",
          run: () => {
            location.href = entry.url;
          }
        }));
    });
  }

  function matchBuiltInGroup(text, url) {
    const haystack = `${text} ${url || ""}`.toLowerCase();
    return builtInKeywords.find((entry) => (
      entry.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))
    ));
  }

  function openPalette() {
    rebuildCommands().then(() => {
      selectedIndex = 0;
      renderPalette();
    });
  }

  function renderPalette() {
    const shadow = createRoot(ui.commandPaletteRootId, "modal");
    const host = document.getElementById(ui.commandPaletteRootId);
    host.style.inset = "0";
    host.style.right = "auto";
    host.style.bottom = "auto";
    host.style.display = "grid";
    host.style.placeItems = "start center";
    host.style.padding = "12vh 16px 16px";
    host.style.background = "rgba(15, 23, 42, 0.26)";

    shadow.innerHTML = `
      <style>${baseStyles()}
        .palette {
          width: min(680px, calc(100vw - 32px));
          max-height: min(640px, calc(100vh - 120px));
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
          background: #ffffff;
        }
        .search {
          display: grid;
          gap: 6px;
          padding: 12px;
          border-bottom: 1px solid #eef2f7;
        }
        .search input {
          width: 100%;
          min-height: 42px;
          font-size: 15px;
        }
        .hint {
          font-size: 12px;
        }
        .results {
          overflow: auto;
          padding: 8px;
        }
        .result {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
          min-height: 48px;
          border: 1px solid transparent;
          background: #ffffff;
          text-align: left;
        }
        .result[aria-selected="true"] {
          border-color: #bfdbfe;
          background: var(--unipa-blue-soft);
        }
        .title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 800;
        }
        .subtitle {
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }
        .badge {
          color: #475467;
          font-size: 12px;
          font-weight: 700;
        }
        .empty {
          padding: 18px 10px;
          font-size: 13px;
        }
      </style>
      <div class="panel palette" role="dialog" aria-modal="true" aria-label="コマンドパレット">
        <div class="search">
          <input data-query type="search" placeholder="移動先や操作を検索" autocomplete="off">
          <div class="hint muted">Enterで実行、Escで閉じる、Ctrl+Kで再表示</div>
        </div>
        <div class="results" data-results></div>
      </div>
    `;

    const input = shadow.querySelector("[data-query]");
    input.addEventListener("input", () => {
      selectedIndex = 0;
      renderResults(shadow, input.value);
    });
    input.addEventListener("keydown", (event) => handlePaletteKeydown(event, shadow));
    shadow.host.addEventListener("click", (event) => {
      if (event.composedPath()[0] === shadow.host) {
        closePalette();
      }
    });

    renderResults(shadow, "");
    input.focus();
  }

  function handlePaletteKeydown(event, shadow) {
    const visible = getVisibleCommands(shadow.querySelector("[data-query]").value);
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, Math.max(visible.length - 1, 0));
      renderResults(shadow, shadow.querySelector("[data-query]").value);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderResults(shadow, shadow.querySelector("[data-query]").value);
      return;
    }
    if (event.key === "Enter" && visible[selectedIndex]) {
      event.preventDefault();
      const command = visible[selectedIndex];
      closePalette();
      command.run();
    }
  }

  function renderResults(shadow, query) {
    const container = shadow.querySelector("[data-results]");
    const visible = getVisibleCommands(query);
    if (!visible.length) {
      container.innerHTML = `<div class="empty muted">一致する移動先や操作がありません。</div>`;
      return;
    }

    container.innerHTML = visible.map((command, index) => `
      <button class="result" type="button" data-index="${index}" aria-selected="${index === selectedIndex ? "true" : "false"}">
        <span>
          <span class="title">${escapeHtml(command.title)}</span>
          <span class="subtitle muted">${escapeHtml(command.subtitle)}</span>
        </span>
        <span class="badge">${command.source === "history" ? "履歴" : "ページ"}</span>
      </button>
    `).join("");

    container.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const command = visible[Number(button.dataset.index)];
        closePalette();
        command.run();
      });
    });
  }

  function getVisibleCommands(query) {
    const normalized = normalizeText(query).toLowerCase();
    if (!normalized) {
      return commands.slice(0, 12);
    }

    return commands
      .map((command) => ({
        command,
        score: scoreCommand(command, normalized)
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.command)
      .slice(0, 12);
  }

  function scoreCommand(command, query) {
    const text = command.searchText.toLowerCase();
    if (text.includes(query)) {
      return 100 - text.indexOf(query);
    }
    return query.split(/\s+/).filter((part) => text.includes(part)).length * 20;
  }

  function closePalette() {
    const host = document.getElementById(ui.commandPaletteRootId);
    if (host) {
      host.remove();
    }
  }

  function normalizeUrl(href) {
    try {
      const url = new URL(href, location.href);
      if (!["http:", "https:", "file:"].includes(url.protocol)) {
        return null;
      }
      return url.href;
    } catch (error) {
      return null;
    }
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function debounce(callback, waitMs) {
    let timer = null;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(callback, waitMs);
    };
  }

  namespace.commandPalette = { start, openPalette };
  globalThis.UnipaExt = namespace;
})();
