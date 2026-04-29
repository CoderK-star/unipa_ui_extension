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
      mountHost.style.margin = "8px 0";
    }

    shadow.innerHTML = `
      <style>${baseStyles()}
        .toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          flex-wrap: wrap;
        }
        input {
          min-width: 180px;
          flex: 1 1 180px;
        }
        .count {
          margin-left: auto;
          font-size: 12px;
          white-space: nowrap;
        }
      </style>
      <div class="panel toolbar">
        <strong>掲示板ツール</strong>
        <input data-search type="search" placeholder="掲示を絞り込み">
        <select data-mode>
          <option value="all">すべて</option>
          <option value="unread">未読のみ</option>
          <option value="deadline">締切が近い順</option>
        </select>
        <button data-mark-read type="button">表示中を既読</button>
        <span class="count muted" data-count></span>
      </div>
    `;

    shadow.querySelector("[data-search]").addEventListener("input", applyFilters);
    shadow.querySelector("[data-mode]").addEventListener("change", applyFilters);
    shadow.querySelector("[data-mark-read]").addEventListener("click", markVisibleRead);
  }

  function getToolbar() {
    const host = Array.from(document.querySelectorAll(`[id^="${ui.bulletinRootId}"]`))[0];
    return host && host.shadowRoot;
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
