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
  pane: {
    toggleOpen: function PanoPane_init () {
      Cu.import("resource://pano/panoramaTree.jsm", this);
      Services.scriptloader.loadSubScript("chrome://pano/content/pano-pane.sub.js", this);
      this.toggleOpen();
      Services.scriptloader.loadSubScript("chrome://pano/content/pano-tree.sub.js", this);
    },
  },
};

// vim: sw=2 ts=2 et fdm=marker:
