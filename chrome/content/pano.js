/**
 * @namespace
 */
const gPano = {
  tabGroups: {
    onPopupShowing: function PanoMenu_init (aEvent) {
      Services.scriptloader.loadSubScript("chrome://pano/content/pano-menu.sub.js", this);
      this.onPopupShowing(aEvent);
    },
  },
    },
  },
};

// vim: sw=2 ts=2 et fdm=marker:
