(function () {
  const namespace = globalThis.UnipaExt || {};
  const { storageKeys, limits, ui } = namespace.constants;
  const { read, write, stableHash } = namespace.storage;
  const { rules, hasAnySignal } = namespace.selectors;
  const { createRoot, baseStyles } = namespace.uiHelpers;

  let currentRows = [];

  function start() {
    const board = findBulletinBoard();
    if (!board) {
      return Promise.resolve();
    }

    return read(storageKeys.bulletinReadItems).then((result) => {
      const readItems = result[storageKeys.bulletinReadItems] || {};
      currentRows = buildRows(board, readItems);
      if (!currentRows.length) {
        return;
      }
      renderToolbar(board);
      applyFilters();
    });
  }

  function findBulletinBoard() {
    const tables = Array.from(document.querySelectorAll("table"))
      .map((table) => ({ element: table, score: scoreBoardCandidate(table) }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score);

    if (tables[0]) {
      return { type: "table", element: tables[0].element };
    }

    const lists = Array.from(document.querySelectorAll("ul, ol"))
      .map((list) => ({ element: list, score: scoreBoardCandidate(list) }))
      .filter((candidate) => candidate.score > 2)
      .sort((left, right) => right.score - left.score);

    return lists[0] ? { type: "list", element: lists[0].element } : null;
  }

  function scoreBoardCandidate(element) {
    const text = element.innerText || "";
    const rows = element.querySelectorAll("tr, li").length;
    let score = rows >= 3 ? rows : 0;
    if (hasAnySignal(text, rules.bulletinSignals)) {
      score += 8;
    }
    if (findDate(text)) {
      score += 4;
    }
    return score;
  }

  function buildRows(board, readItems) {
    const elements = board.type === "table"
      ? Array.from(board.element.querySelectorAll("tr")).slice(0, limits.bulletinScanLimit)
      : Array.from(board.element.querySelectorAll("li")).slice(0, limits.bulletinScanLimit);

    return elements
      .map((element) => {
        const text = normalizeText(element.innerText || element.textContent || "");
        const id = stableHash(`${location.pathname}:${text}`);
        const date = findDate(text);
        const hasCells = element.querySelectorAll("td").length > 0 || board.type === "list";
        if (!text || !hasCells) {
          return null;
        }
        return {
          id,
          element,
          text,
          date,
          read: Boolean(readItems[id]) || isVisuallyRead(element, text)
        };
      })
      .filter(Boolean);
  }

  function renderToolbar(board) {
    const anchorId = `${ui.bulletinRootId}-${stableHash(board.element.innerText || location.href)}`;
    const shadow = createRoot(anchorId, "inline");
    const mountHost = document.getElementById(anchorId);
    if (mountHost && mountHost.parentElement !== board.element.parentElement) {
      board.element.parentElement.insertBefore(mountHost, board.element);
      mountHost.style.position = "static";
      mountHost.style.display = "block";
      mountHost.style.margin = "10px 0";
    }

    shadow.innerHTML = `
      <style>${baseStyles()}
        .toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          flex-wrap: wrap;
        }
        .label {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: var(--color-info-50);
          color: var(--color-info-600);
          white-space: nowrap;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        input {
          min-width: 160px;
          flex: 1 1 160px;
        }
        select {
          display: none;
        }
        .count {
          margin-left: auto;
          font-size: 11px;
          white-space: nowrap;
          color: var(--text-tertiary);
        }
      </style>
      <div class="panel toolbar">
        <span class="label">UNIPA+</span>
        <input data-search type="search" placeholder="掲示を絞り込み">
        <button class="chip active" data-mode-button="all" type="button" aria-pressed="true">すべて</button>
        <button class="chip" data-mode-button="unread" type="button" aria-pressed="false">未読</button>
        <button class="chip" data-mode-button="deadline" type="button" aria-pressed="false">締切順</button>
        <button class="chip" data-mark-read type="button">表示中を既読</button>
        <select data-mode>
          <option value="all">すべて</option>
          <option value="unread">未読のみ</option>
          <option value="deadline">締切が近い順</option>
        </select>
        <span class="count muted" data-count></span>
      </div>
    `;

    shadow.querySelector("[data-search]").addEventListener("input", applyFilters);
    shadow.querySelectorAll("[data-mode-button]").forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.modeButton));
    });
    shadow.querySelector("[data-mark-read]").addEventListener("click", markVisibleRead);
  }

  function getToolbar() {
    const host = Array.from(document.querySelectorAll(`[id^="${ui.bulletinRootId}"]`))[0];
    return host && host.shadowRoot;
  }

  function setMode(mode) {
    const toolbar = getToolbar();
    if (!toolbar) {
      return;
    }

    toolbar.querySelector("[data-mode]").value = mode;
    toolbar.querySelectorAll("[data-mode-button]").forEach((button) => {
      const active = button.dataset.modeButton === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    applyFilters();
  }

  function applyFilters() {
    const toolbar = getToolbar();
    if (!toolbar) {
      return;
    }

    const query = toolbar.querySelector("[data-search]").value.trim().toLowerCase();
    const mode = toolbar.querySelector("[data-mode]").value;
    let visibleCount = 0;

    if (mode === "deadline") {
      reorderRows([...currentRows].sort((left, right) => {
        const leftTime = left.date ? left.date.getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.date ? right.date.getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }));
    }

    currentRows.forEach((row) => {
      const matchesQuery = !query || row.text.toLowerCase().includes(query);
      const matchesMode = mode !== "unread" || !row.read;
      const visible = matchesQuery && matchesMode;
      row.element.style.display = visible ? "" : "none";
      row.element.dataset.unipaRead = row.read ? "true" : "false";
      if (visible) {
        visibleCount += 1;
      }
    });

    toolbar.querySelector("[data-count]").textContent = `${visibleCount}/${currentRows.length}`;
  }

  function reorderRows(rows) {
    rows.forEach((row) => {
      const parent = row.element.parentElement;
      if (parent) {
        parent.appendChild(row.element);
      }
    });
  }

  function markVisibleRead() {
    read(storageKeys.bulletinReadItems).then((result) => {
      const readItems = result[storageKeys.bulletinReadItems] || {};
      currentRows.forEach((row) => {
        if (row.element.style.display !== "none") {
          row.read = true;
          readItems[row.id] = {
            readAt: new Date().toISOString(),
            text: row.text.slice(0, 120)
          };
        }
      });
      return write({ [storageKeys.bulletinReadItems]: readItems }).then(applyFilters);
    });
  }

  function isVisuallyRead(element, text) {
    const value = `${element.className || ""} ${text}`.toLowerCase();
    return value.includes("\u65e2\u8aad") || value.includes("read");
  }

  function findDate(text) {
    const pattern = new RegExp("(20\\d{2})[\\/\\-.\\u5e74](\\d{1,2})[\\/\\-.\\u6708](\\d{1,2})");
    const match = String(text).match(pattern);
    if (!match) {
      return null;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeText(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  namespace.bulletin = { start };
  globalThis.UnipaExt = namespace;
})();
