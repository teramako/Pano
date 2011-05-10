
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
// Cu.import("resource://gre/modules/Services.jsm");

/**
 * @type {Window}
 */
var gWin = window.top;

/**
 * @namespace
 */
var gPanoramaTree = {
  init: function PT_init () {
    Cu.import("resource://pano/panoramaSidebar.jsm", this);
    gWin.TabView._initFrame(this.tabViewCallback.bind(this));
  },
  destroy: function PT_destroy () {
    this.view.destroy();
  },
  view: null,
  tabViewCallback: function PT_tabViewCallback () {
    this.view = new this.PanoramaSidebar(gWin.TabView);
    this.tree.view = this.view;
  },
  onDblClick: function PT_onDblClick (aEvent) {
    var item = this.view.rows[this.view.selection.currentIndex];
    if (item.type & this.TAB_ITEM_TYPE) {
      aEvent.preventDefault();
      aEvent.stopPropagation();
      gWin.gBrowser.mTabContainer.selectedIndex = item.tab._tPos;
    }
  },
  onDragStart: function PT_onDragStart (aEvent) {
    this.PanoramaSidebar.onDragStart(aEvent, this.view);
  },
  tooltip: {
    show: function PS_showTooltip (aEvent) {
      aEvent.stopPropagation();
      var row = {}, col = {}, elt = {};
      gPanoramaTree.tree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, col, elt); 
      if (row.value < 0) {
        aEvent.preventDefault();
        return;
      }
      var item = gPanoramaTree.view.rows[row.value];
      if (!(item.type & gPanoramaTree.TAB_ITEM_TYPE)) {
        aEvent.preventDefault();
        return;
      }
      this.titleElm.setAttribute("value", item.title);
      this.urlElm.setAttribute("value", item.url);
      this.imageElm.classList.remove("hide")
      var browser = item.tab.linkedBrowser;
      if (browser.__SS_restoreState) {
        if (item.tab._tabViewTabItem)
          document.mozSetImageElement("tabCapture", item.tab._tabViewTabItem.$cachedThumb[0]);
        else
          this.imageElm.classList.add("hide");
      } else {
        document.mozSetImageElement("tabCapture", browser);
      }
    },
  },
  select: function PT_select () {
    var index = this.view.selection.currentIndex;
    if (index > 0 && this.view.rows[index].type & this.TAB_ITEM_TYPE) {
      gWin.gBrowser.mTabContainer.selectedIndex = this.view.rows[index].tab._tPos;
    }
  },
  editGroupName: function PT_editGroupName () {
    var index = this.view.selection.currentIndex;
    if (index > 0 && this.view.rows[index].type & this.TAB_GROUP_TYPE &&
        this.view.isEditable(index, this.view.treeBox.columns[0])) {
      this.tree.startEditing(index, this.view.treeBox.columns[0]);
    }
  }
};

/**
 * @name tree
 * @memberOf gPanoramaTree
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree, "tree", function () document.getElementById("tabGroupTree"));

/**
 * @name titleElm
 * @memberof gPanoramaTree.tooltip
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree.tooltip, "titleElm", function() document.getElementById("tooltipTitle"));
/**
 * @name urlElm
 * @memberof gPanoramaTree.tooltip
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree.tooltip, "urlElm", function() document.getElementById("tooltipURL"));
/**
 * @name imageElm
 * @memberof gPanoramaTree.tooltip
 * @type {Element}
 */
XPCOMUtils.defineLazyGetter(gPanoramaTree.tooltip, "imageElm", function() document.getElementById("tooltipImage"));

