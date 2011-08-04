
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
  },
  destroy: function PT_destroy () {
    this.view.destroy();
    Serivces.prefs.removeObserver(this.PREF_SWITCH_BY, this);
    if (this.tabbar.pref && this.tabbar.toolbar.collapsed) {
      this.tabbar.toolbar.collapsed = false;
    }
  },
  view: null,
  tabViewCallback: function PT_tabViewCallback () {
    this.view = new this.PanoramaTreeView(gWin);
    this.tree.view = this.view;
  },
  tabbar: {
    init: function () {
      this.checkBox.checked = this.pref;
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
      delete this.checkBox;
      return this.checkBox = elm;
    },
    toggleHide: function () {
      var bool = this.checkBox.checked;
      this.pref = bool;
      gWin.document.getElementById("TabsToolbar").collapsed = bool;
    },
  },
};

/**
 * @name tree
 * @memberOf gPanoramaTree
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree, "tree", function () document.getElementById("panoTabGroupTree"));


