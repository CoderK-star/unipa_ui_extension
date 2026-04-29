(function () {
  const namespace = globalThis.UnipaExt || {};

  namespace.constants = {
    storageKeys: {
      autosaveEntries: "unipa.autosave.entries",
      navigationHistory: "unipa.navigation.history",
      settings: "unipa.settings",
      keepaliveStatus: "unipa.keepalive.status",
      keepaliveOrigin: "unipa.keepalive.origin"
    },
    defaults: {
      autosaveEnabled: true,
      keepaliveEnabled: false,
      keepaliveIntervalMinutes: 5
    },
    limits: {
      navigationHistorySize: 10,
      autosaveDebounceMs: 800,
      autosaveIntervalMs: 30000,
      maxDraftAgeDays: 30
    },
    ui: {
      rootId: "unipa-ui-helper-root",
      autosaveRootId: "unipa-ui-helper-autosave-root",
      navRootId: "unipa-ui-helper-nav-root"
    },
    messages: {
      pageSeen: "UNIPA_PAGE_SEEN",
      settingsChanged: "UNIPA_SETTINGS_CHANGED",
      clearLocalData: "UNIPA_CLEAR_LOCAL_DATA"
    }
  };

  globalThis.UnipaExt = namespace;
})();
