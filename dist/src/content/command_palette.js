(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, ui } = namespace.constants;
  const { read, stableHash } = namespace.storage;
  const { normalizeText, debounce } = namespace.utils;
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
    // document ではなく window に登録することで、JSF 等が document レベルで
    // stopImmediatePropagation() しても確実にショートカットを受け取る
    window.addEventListener("keydown", handleKeydown, true);

    const observer = new MutationObserver(debounce(rebuildCommands, 500));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function handleKeydown(event) {
    // event.key はキーボードレイアウトによって変わるため (例: Mac で Alt+K → "˚")、
    // event.code（物理キー）も併用して確実に検出する
    const isKKey = event.key.toLowerCase() === "k" || event.code === "KeyK";
    const isAltShortcut = event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && isKKey;
    const isFallbackShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && isKKey;
    const isPaletteShortcut = isAltShortcut || isFallbackShortcut;
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
    // すでに開いている場合はトグルで閉じる（重複レンダリング・イベント二重登録を防ぐ）
    if (document.getElementById(ui.commandPaletteRootId)) {
      closePalette();
      return;
    }
    rebuildCommands().then(() => {
      selectedIndex = 0;
      renderPalette();
    });
  }

  function renderPalette() {
    const shadow = createRoot(ui.commandPaletteRootId, "modal");

    shadow.innerHTML = `
      <style>${baseStyles()}
        .palette {
          width: min(var(--palette-width), calc(100vw - 32px));
          max-height: min(560px, calc(100vh - 120px));
          display: grid;
          grid-template-rows: auto 1fr auto;
          overflow: hidden;
        }
        .search {
          display: grid;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-bottom: var(--border-width-default) solid var(--border-default);
        }
        .search input {
          width: 100%;
          min-height: 40px;
          font-size: 14px;
          border-color: transparent;
          background: transparent;
          padding-left: 0;
        }
        .search input:focus {
          outline: none;
          border-color: transparent;
        }
        .hint {
          font-size: 11px;
        }
        .results {
          overflow: auto;
          padding: var(--space-1);
        }
        .result {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-2);
          align-items: center;
          min-height: 48px;
          padding: var(--space-2) var(--space-4);
          border: var(--border-width-default) solid transparent;
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          text-align: left;
          transition: background 100ms ease;
        }
        .result:hover,
        .result[aria-selected="true"] {
          border-color: transparent;
          background: var(--bg-secondary);
        }
        .title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .subtitle {
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .badge {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 7px;
          border: var(--border-width-default) solid var(--border-emphasis);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-family: monospace;
        }
        .footer {
          border-top: var(--border-width-default) solid var(--border-default);
          padding: var(--space-2) var(--space-4);
          display: flex;
          gap: var(--space-4);
          align-items: center;
        }
        .footer-hint {
          font-size: 11px;
          color: var(--text-tertiary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .footer-hint kbd {
          padding: 1px 5px;
          border: var(--border-width-default) solid var(--border-emphasis);
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 10px;
          color: var(--text-secondary);
        }
        .empty {
          padding: 18px var(--space-3);
          font-size: 12px;
        }
      </style>
      <div class="panel palette" role="dialog" aria-modal="true" aria-label="コマンドパレット">
        <div class="search">
          <input data-query type="search" placeholder="移動先や操作を検索" autocomplete="off">
          <div class="hint muted">検索ワードを入力…</div>
        </div>
        <div class="results" data-results></div>
        <div class="footer">
          <span class="footer-hint"><kbd>↑↓</kbd> 選択</span>
          <span class="footer-hint"><kbd>↵</kbd> 実行</span>
          <span class="footer-hint"><kbd>Esc</kbd> 閉じる</span>
          <span class="footer-hint"><kbd>Alt/⌥+K</kbd> 起動</span>
        </div>
      </div>
    `;

    const input = shadow.querySelector("[data-query]");
    input.addEventListener("input", () => {
      selectedIndex = 0;
      renderResults(shadow, input.value);
    });
    input.addEventListener("keydown", (event) => handlePaletteKeydown(event, shadow));
    // オーバーレイ背景クリックで閉じる（shadow.host = モーダル全体の div）
    // composedPath()[0] が host 自身 = パレット外の背景をクリックした場合
    shadow.host.addEventListener("mousedown", (event) => {
      if (event.target === shadow.host) {
        closePalette();
      }
    });

    renderResults(shadow, "");
    // requestAnimationFrame でフォーカスを確実に当てる
    requestAnimationFrame(() => input.focus());
  }

  function handlePaletteKeydown(event, shadow) {
    // パレットがすでに閉じられている場合（Alt+K で同時クローズなど）は何もしない
    if (!document.getElementById(ui.commandPaletteRootId)) {
      return;
    }
    const queryEl = shadow.querySelector("[data-query]");
    if (!queryEl) {
      return;
    }
    const visible = getVisibleCommands(queryEl.value);
    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, Math.max(visible.length - 1, 0));
      renderResults(shadow, queryEl.value);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderResults(shadow, queryEl.value);
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

  namespace.commandPalette = { start, openPalette };
  globalThis.UnipaExt = namespace;
})();
