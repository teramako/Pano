
const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;

/**
 * @namespace
 * @name XPCOMUtils
 */
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
/**
 * @namespace
 * @name Serivces
 */
Cu.import("resource://gre/modules/Services.jsm");

/**
 * @type {Window}
 */
var gWin = window.top;

/**
 * @namespace
 */
var gPanoramaTree = {
  gBrowser: gWin.gBrowser,
  init: function PT_init () {
    Cu.import("resource://pano/panoramaTree.jsm", this);
    gWin.TabView._initFrame(this.tabViewCallback.bind(this));
    Services.scriptloader.loadSubScript("chrome://pano/content/pano-tree.sub.js", this);
    this.tabbar.init();
    this.buttons.init();
  },
  destroy: function PT_destroy () {
    this.view.destroy();
    Services.prefs.removeObserver(this.PREF_SWITCH_BY, this);
    if (this.tabbar.pref) {
      this.tabbar.toolbar.style.visibility = "visible";
    }
    this.buttons.uninit();
  },
  view: null,
  tabViewCallback: function PT_tabViewCallback () {
    this.view = new this.PanoramaTreeView(gWin);
    this.tree.view = this.view;
  },
  isPanel: false,
  tabbar: {
    init: function () {
      var checkBox = this.checkBox;
      if (this.pref)
        checkBox.setAttribute("checked", "true");
      else
        checkBox.removeAttribute("checked");

      this.toggleHide();
    },
    get toolbar () {
      var t = gWin.document.getElementById("TabsToolbar");
      delete this.toolbar;
      return this.toolbar = t;
    },
    get pref () {
      return Services.prefs.getBoolPref("extensions.pano.autoHideTabbar");
    },
    set pref (val) {
      val = !!val;
      Services.prefs.setBoolPref("extensions.pano.autoHideTabbar", val);
      return val;
    },
    get checkBox () {
      var elm = document.getElementById("hideTabbarCheck");
      if (!elm)
        elm = document.getElementById("panoToolBox").palette.querySelector("#hideTabbarCheck");

      return elm;
    },
    toggleHide: function () {
      var bool = this.checkBox.hasAttribute("checked");
      this.pref = bool;
      this.toolbar.style.visibility = bool ? "collapse" : "visible";
      // Compatibility for LessChrome HD
      if (this.toolbar.toolbox.style.height) {
        var height = Array.reduce(this.toolbar.toolbox.children, function (total, elm) {
          var h = elm.boxObject.height;
          if (h !== 0) {
            var s = window.getComputedStyle(elm, "");
            if (s.opacity === "0")
              h = 0;
          }
          return total + h;
        }, 0);
        this.toolbar.toolbox.style.height = height + "px";
      }
    },
  },
  buttons: {
    init: function () {
      this.commands = {
        tabHistoryForwardCmd: document.getElementById("panoCmdTabHistoryForward"),
        tabHistoryBackCmd:    document.getElementById("panoCmdTabHistoryBack")
      };
      Services.obs.addObserver(this, "pano-tab-selection-changed", true);
      this.enableCommand(this.commands.tabHistoryForwardCmd, gWin.gPano.tabHistory.canGoForward);
      this.enableCommand(this.commands.tabHistoryBackCmd,    gWin.gPano.tabHistory.canGoBack);
    },
    uninit: function () {
      Services.obs.removeObserver(this, "pano-tab-selection-changed");
    },
    observe: function Pano_observe (aSubject, aTopic, aData) {
      if (aTopic === "pano-tab-selection-changed" && aSubject === gWin) {
        let data = JSON.parse(aData);
        this.enableCommand(this.commands.tabHistoryForwardCmd, data.canGoForward);
        this.enableCommand(this.commands.tabHistoryBackCmd,    data.canGoBack);
      }
    },
    enableCommand: function (aCommand, aEnable) {
      if (aEnable)
        aCommand.removeAttribute("disabled");
      else
        aCommand.setAttribute("disabled", "true");
    },
    QueryInterface: XPCOMUtils.generateQI(["nsIObserver", "nsISupportsWeakReference"]),
  }
};

/**
 * @name tree
 * @memberOf gPanoramaTree
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree, "tree", function () document.getElementById("panoTabGroupTree"));

XPCOMUtils.defineLazyGetter(this, "gSubFrame", function () {
  var container = {};
  Services.scriptloader.loadSubScript("chrome://pano/content/sidebar-sub.js", container);
  return container;
});

XPCOMUtils.defineLazyGetter(this, "gToolbarContextMenu", function () {
  var container = {};
  Services.scriptloader.loadSubScript("chrome://pano/content/toolbarmenu.sub.js", container);
  return container;
});

