/**
 * @namespace
 */
const gPano = {
  tabGroups: {
    onPopupShowing: function PanoMenu_init (aEvent) {
      var id = aEvent.target.id,
          isAllTabsPopup    = (id === "alltabs-popup"),
          isPanoButtonPopup = (id === "pano-toolbarbutton-popup");

      if (isAllTabsPopup || isPanoButtonPopup) {
        if (arguments.callee === gPano.tabGroups.onPopupShowing)
          Services.scriptloader.loadSubScript("chrome://pano/content/pano-menu.sub.js", gPano.tabGroups);

        gPano.tabGroups.onPopupShowing(aEvent);

        if (isAllTabsPopup) {
          aEvent.target.parentNode.removeEventListener("popupshowing", arguments.callee, true);
          aEvent.target.parentNode.addEventListener("popupshowing", gPano.tabGroups.onPopupShowing, true);
        }
      }
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

window.addEventListener("load", function () {
  window.removeEventListener("load", arguments.callee, false);
  var allTabsButton = document.getElementById("alltabs-button") ||
                      getNavToolbox().palette.querySelector("#alltabs-button");
  if (allTabsButton)
    allTabsButton.addEventListener("popupshowing", gPano.tabGroups.onPopupShowing, true);
}, false);

// vim: sw=2 ts=2 et fdm=marker:
