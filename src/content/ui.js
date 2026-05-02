(function () {
  const namespace = globalThis.UnipaExt || {};
  const { ui } = namespace.constants;

  function createRoot(id, position) {
    let host = document.getElementById(id);
    if (host) {
      return host.shadowRoot;
    }

    host = document.createElement("div");
    host.id = id;
    host.style.all = "initial";
    host.style.position = position === "top" ? "sticky" : position === "inline" ? "static" : "fixed";
    host.style.zIndex = "2147483647";
    if (position === "top") {
      host.style.top = "0";
      host.style.display = "block";
    } else if (position === "modal") {
      host.style.boxSizing = "border-box"; // padding が width/height に含まれるよう明示（style.all: initial で content-box になるため）
      host.style.inset = "0";
      host.style.width = "100%";
      host.style.height = "100%";
      host.style.display = "grid";
      host.style.placeItems = "start center";
      host.style.padding = "12vh 16px 16px";
      host.style.background = "rgba(15, 23, 42, 0.26)";
    } else if (position !== "inline") {
      host.style.right = "16px";
      host.style.bottom = "16px";
    }

    const shadow = host.attachShadow({ mode: "open" });
    const mount = document.body || document.documentElement;
    if (position === "top" && mount.firstChild) {
      mount.insertBefore(host, mount.firstChild);
    } else {
      mount.appendChild(host);
    }
    return shadow;
  }

  function baseStyles() {
    return `
      :host {
        /* ブランドカラー */
        --color-brand-50:  #E6F1FB;
        --color-brand-100: #B5D4F4;
        --color-brand-200: #85B7EB;
        --color-brand-400: #378ADD;
        --color-brand-600: #185FA5;
        --color-brand-800: #0C447C;
        --color-brand-900: #042C53;
        /* 状態カラー */
        --color-danger-50:  #FCEBEB;
        --color-danger-400: #E24B4A;
        --color-danger-600: #A32D2D;
        --color-danger-800: #791F1F;
        --color-warning-50:  #FAEEDA;
        --color-warning-400: #EF9F27;
        --color-warning-600: #854F0B;
        --color-warning-800: #633806;
        --color-success-50:  #EAF3DE;
        --color-success-400: #639922;
        --color-success-600: #3B6D11;
        --color-success-800: #27500A;
        --color-info-50:  #E6F1FB;
        --color-info-400: #378ADD;
        --color-info-600: #185FA5;
        --color-info-800: #0C447C;
        /* ニュートラル */
        --color-neutral-0:   #FFFFFF;
        --color-neutral-50:  #F8F8F6;
        --color-neutral-100: #F1EFE8;
        --color-neutral-200: #D3D1C7;
        --color-neutral-400: #888780;
        --color-neutral-600: #5F5E5A;
        --color-neutral-800: #444441;
        --color-neutral-900: #2C2C2A;
        /* テキスト */
        --text-primary:   var(--color-neutral-900);
        --text-secondary: var(--color-neutral-600);
        --text-tertiary:  var(--color-neutral-400);
        --text-inverse:   var(--color-neutral-0);
        /* 背景 */
        --bg-primary:   var(--color-neutral-0);
        --bg-secondary: var(--color-neutral-50);
        --bg-tertiary:  var(--color-neutral-100);
        /* ボーダー */
        --border-default:  rgba(44, 44, 42, 0.15);
        --border-emphasis: rgba(44, 44, 42, 0.30);
        --border-strong:   rgba(44, 44, 42, 0.40);
        /* スペーシング */
        --space-1:  4px;
        --space-2:  8px;
        --space-3:  12px;
        --space-4:  16px;
        --space-5:  20px;
        --space-6:  24px;
        --space-8:  32px;
        --space-10: 40px;
        /* ボーダー半径 */
        --radius-sm:   4px;
        --radius-md:   8px;
        --radius-lg:   12px;
        --radius-xl:   16px;
        --radius-full: 9999px;
        /* ボーダー太さ */
        --border-width-default: 0.5px;
        --border-width-accent:  2px;
        /* Z-index */
        --z-widget:     1000;
        --z-toast:      1100;
        --z-breadcrumb: 900;
        --z-palette:    2000;
        --z-overlay:    1999;
        /* コンポーネント寸法 */
        --widget-width:    200px;
        --widget-bottom:   20px;
        --widget-right:    16px;
        --toast-max-width: 360px;
        --toast-bottom:    20px;
        --palette-width:   480px;
        --palette-radius:  var(--radius-xl);
        color-scheme: light;
      }
      :host, * {
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }
      button, select, input {
        font-family: inherit;
        font-size: 13px;
        letter-spacing: 0;
      }
      button {
        border: var(--border-width-default) solid var(--border-emphasis);
        background: var(--bg-primary);
        color: var(--text-primary);
        border-radius: var(--radius-md);
        min-height: 30px;
        padding: 4px 10px;
        line-height: 1.4;
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;
      }
      button:hover {
        background: var(--bg-tertiary);
      }
      button.primary {
        border-color: var(--color-brand-400);
        background: var(--color-brand-400);
        color: var(--text-inverse);
      }
      button.danger {
        border-color: var(--color-danger-50);
        background: var(--color-danger-50);
        color: var(--color-danger-600);
      }
      input, select {
        border: var(--border-width-default) solid var(--border-emphasis);
        border-radius: var(--radius-md);
        min-height: 32px;
        padding: 4px 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
      }
      .panel {
        color: var(--text-primary);
        background: var(--bg-primary);
        border: var(--border-width-default) solid var(--border-emphasis);
        border-radius: var(--radius-md);
      }
      .muted {
        color: var(--text-secondary);
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 4px 10px;
        border: var(--border-width-default) solid var(--border-emphasis);
        border-radius: var(--radius-full);
        background: var(--bg-primary);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 500;
      }
      .chip.active,
      .chip[aria-pressed="true"] {
        border-color: transparent;
        background: var(--color-info-50);
        color: var(--color-info-600);
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }
    `;
  }

  function renderAutosaveBar(draftCount, handlers) {
    const shadow = createRoot(ui.autosaveRootId, "bottom");
    shadow.innerHTML = `
      <style>${baseStyles()}
        .autosave {
          width: min(440px, calc(100vw - 32px));
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 8px;
          align-items: center;
          border-left: var(--border-width-accent) solid var(--color-warning-400);
        }
        .title {
          font-size: 13px;
          font-weight: 500;
        }
        .detail {
          font-size: 12px;
          margin-top: 2px;
        }
      </style>
      <div class="panel autosave" role="status">
        <div>
          <div class="title">保存済みの下書きがあります</div>
          <div class="detail muted">${draftCount}件の入力内容を復元できます。</div>
        </div>
        <button class="primary" data-action="restore">復元</button>
        <button data-action="discard">破棄</button>
      </div>
    `;

    shadow.querySelector("[data-action='restore']").addEventListener("click", handlers.onRestore);
    shadow.querySelector("[data-action='discard']").addEventListener("click", handlers.onDiscard);
  }

  function hideAutosaveBar() {
    const host = document.getElementById(ui.autosaveRootId);
    if (host) {
      host.remove();
    }
  }

  function renderNavigation(history, handlers) {
    const shadow = createRoot(ui.navRootId, "top");
    const trail = history
      .slice(0, 5)
      .map((entry, index) => {
        const label = entry.title || entry.url;
        return `<button class="chip" data-index="${index}" title="${escapeHtml(entry.url)}">${escapeHtml(label)}</button>`;
      })
      .join("");

    shadow.innerHTML = `
      <style>${baseStyles()}
        .nav {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          min-height: 44px;
          padding: 6px var(--space-3);
          border-radius: 0;
          border-left: 0;
          border-right: 0;
        }
        .back {
          flex: 0 0 auto;
        }
        .trail {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .trail button {
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .status {
          margin-left: auto;
          font-size: 12px;
          white-space: nowrap;
        }
      </style>
      <div class="panel nav">
        <button class="back" data-action="back" title="戻る">戻る</button>
        <div class="trail">${trail}</div>
        <span class="status muted" data-status></span>
      </div>
    `;

    shadow.querySelector("[data-action='back']").addEventListener("click", handlers.onBack);
    shadow.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("click", () => handlers.onGo(Number(button.dataset.index)));
    });
  }

  function setNavStatus(text) {
    const host = document.getElementById(ui.navRootId);
    const status = host && host.shadowRoot && host.shadowRoot.querySelector("[data-status]");
    if (status) {
      status.textContent = text || "";
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  namespace.uiHelpers = {
    createRoot,
    baseStyles,
    renderAutosaveBar,
    hideAutosaveBar,
    renderNavigation,
    setNavStatus,
    escapeHtml
  };

  globalThis.UnipaExt = namespace;
})();
