(function () {
  const namespace = globalThis.UnipaExt || {};

  namespace.constants = {
    storageKeys: {
      autosaveEntries: "unipa.autosave.entries",
      navigationHistory: "unipa.navigation.history",
      settings: "unipa.settings",
      keepaliveStatus: "unipa.keepalive.status",
      keepaliveOrigin: "unipa.keepalive.origin",
      bulletinReadItems: "unipa.bulletin.readItems",
      deadlineEntries: "unipa.deadlines.entries",
      deadlineNotifications: "unipa.deadlines.notifications"
    },
    defaults: {
      autosaveEnabled: true,
      keepaliveEnabled: false,
      keepaliveIntervalMinutes: 5,
      bulletinEnhancerEnabled: true,
      pdfViewerEnabled: true,
      deadlineDashboardEnabled: true,
      deadlineNotificationsEnabled: false,
      deadlineNotificationHours: 24,
      commandPaletteEnabled: true,
      uiTheme: "light"
    },
    limits: {
      navigationHistorySize: 10,
      autosaveDebounceMs: 800,
      autosaveIntervalMs: 30000,
      maxDraftAgeDays: 30,
      bulletinScanLimit: 200,
      deadlineScanLimit: 80,
      deadlineHistorySize: 80
    },
    ui: {
      rootId: "unipa-ui-helper-root",
      autosaveRootId: "unipa-ui-helper-autosave-root",
      navRootId: "unipa-ui-helper-nav-root",
      bulletinRootId: "unipa-ui-helper-bulletin-root",
      pdfRootId: "unipa-ui-helper-pdf-root",
      deadlineRootId: "unipa-ui-helper-deadline-root",
      commandPaletteRootId: "unipa-ui-helper-command-palette-root"
    },
    messages: {
      pageSeen: "UNIPA_PAGE_SEEN",
      settingsChanged: "UNIPA_SETTINGS_CHANGED",
      clearLocalData: "UNIPA_CLEAR_LOCAL_DATA",
      deadlinesUpdated: "UNIPA_DEADLINES_UPDATED"
    }
  };

  globalThis.UnipaExt = namespace;
})();
