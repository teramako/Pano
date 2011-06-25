
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
  },
  destroy: function PT_destroy () {
    this.view.destroy();
  },
  view: null,
  tabViewCallback: function PT_tabViewCallback () {
    this.view = new this.PanoramaTreeView(gWin);
    this.tree.view = this.view;
  },
};

/**
 * @name tree
 * @memberOf gPanoramaTree
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree, "tree", function () document.getElementById("panoTabGroupTree"));


