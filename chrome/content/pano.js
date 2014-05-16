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
      // Fit to Personas theme
      var elem = document.getAnonymousElementByAttribute(this.panel, "class", "panel-arrowcontent"),
          rootStyle = document.documentElement.style,
          bottomStyle = document.getElementById("browser-bottombox").style;
      elem.style.backgroundColor = rootStyle.backgroundColor;
      elem.style.backgroundImage = rootStyle.backgroundImage +
                                   (bottomStyle.backgroundImage ? ", " + bottomStyle.backgroundImage : "");
    },
    isPanel: true,
    onButtonMouseOver: function PanoPane_onMouseOver (aEvent) {
      if (Services.prefs.getBoolPref("extensions.pano.panel.openOnMouseOver")) {
        if ("panel" in this) {
          if (this.panel.state === "closed")
            this.panel.openPopup(this.button, "bottomcenter topright");
        } else {
          this.toggleOpen();
        }
      }
    },
  },
};
XPCOMUtils.defineLazyModuleGetter(gPano, "styler", "resource://pano/panoStyle.jsm", "PanoStyle");

window.addEventListener("load", function () {
  window.removeEventListener("load", arguments.callee, false);

  let (styler = gPano.styler, cssFile = gPano.styler.getCSSFile()) {
    if (cssFile.exists() && cssFile.isReadable())
      styler.load(cssFile);
    else
      styler.load(styler.defaultCSS);
  }

  var allTabsButton = document.getElementById("alltabs-button") ||
                      getNavToolbox().palette.querySelector("#alltabs-button");
  if (allTabsButton)
    allTabsButton.addEventListener("popupshowing", gPano.tabGroups.onPopupShowing, true);

}, false);

// vim: sw=2 ts=2 et fdm=marker:
