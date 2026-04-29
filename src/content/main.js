(function () {
  const namespace = globalThis.UnipaExt || {};
  const { messages } = namespace.constants;
  const { getSettings, sendMessage } = namespace.storage;
  const { isLikelyUnipaPage } = namespace.selectors;

  function notifyBackground(settings) {
    return sendMessage({
      type: messages.pageSeen,
      origin: location.origin,
      url: location.href,
      settings
    });
  }

  function start() {
    if (!isLikelyUnipaPage()) {
      return;
    }

    getSettings().then((settings) => {
      notifyBackground(settings);

      if (settings.autosaveEnabled) {
        namespace.autosave.start();
      }

      namespace.navigation.start();

      if (settings.bulletinEnhancerEnabled) {
        namespace.bulletin.start();
      }

      if (settings.pdfViewerEnabled) {
        namespace.pdfViewer.start();
      }

      if (settings.deadlineDashboardEnabled) {
        namespace.deadlineDashboard.start(settings);
      }

      if (settings.commandPaletteEnabled) {
        namespace.commandPalette.start();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
