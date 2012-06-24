
var EXPORTED_SYMBOLS = [
  "PanoramaTreeView",
  "APPTAB_GROUP_TYPE",
  "TAB_GROUP_TYPE",
  "TAB_ITEM_TYPE",
];

const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;

const APPTAB_GROUP_TYPE   = 1 << 0,
      TAB_GROUP_TYPE      = 1 << 2,
      TAB_ITEM_TYPE       = 1 << 3;

const TAB_DROP_TYPE = "application/x-moz-tabbrowser-tab",
      GROUP_DROP_TYPE = "application/x-moz-pano-group";

const PANO_SESSION_ID = "pano-tabview-group";

const PREF_SHOW_NUMBER = "extensions.pano.showTabNumber",
      PREF_SELECT_CURRENTTAB = "extensions.pano.select_currenttab";

/**
 * @namespace
 * @name XPCOMUtils
 */
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
/**
 * @namespace
 * @name Services
 */
XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");
/**
 * @namespace
 * @name PlacesUtils
 */
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils", "resource://gre/modules/PlacesUtils.jsm");
/**
 * @namespace
 * @name PlacesUIUtils
 */
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUIUtils", "resource://gre/modules/PlacesUIUtils.jsm");

XPCOMUtils.defineLazyServiceGetter(this, "atomService", "@mozilla.org/atom-service;1", "nsIAtomService");
XPCOMUtils.defineLazyServiceGetter(this, "SessionStore", "@mozilla.org/browser/sessionstore;1", "nsISessionStore");
XPCOMUtils.defineLazyGetter(this, "bundle", function () {
  return Services.strings.createBundle("chrome://pano/locale/pano-tree.properties");
});

var showTabNumber = Services.prefs.getBoolPref(PREF_SHOW_NUMBER);
var observer = {
  observe: function (aSubject, aTopic, aData) {
    if (aTopic === "nsPref:changed") {
      switch (aData) {
      case PREF_SHOW_NUMBER:
        showTabNumber = Services.prefs.getBoolPref(PREF_SHOW_NUMBER);
        break;
      }
    }
  },
  QueryInterface: XPCOMUtils.generateQI(["nsIObserver", "nsISupportsWeakReference"]),
}
Services.prefs.addObserver(PREF_SHOW_NUMBER, observer, true);

var atomCache = {}
    itemCache = new WeakMap;

var ItemPrototype = {
  title: "",
  url: "",
  level: 0,
  id: 0,
  getSessionData: function PanoItem_getSessionData () {
    return {
      openState: this.isOpen
    };
  },
};
function AppTabsGroup (win, session) {
  this.win = win;
  this.title = bundle.GetStringFromName("appTabGroup");
  if (session && ("openState" in session))
    this.isOpen = !!session.openState;
}
AppTabsGroup.prototype = Object.create(ItemPrototype, {
  type: { value: TAB_GROUP_TYPE | APPTAB_GROUP_TYPE },
  isOpen: {
    writable: true,
    value: true
  },
  children: {
    get: function () {
      var tabs = [];
      for (let [,tab] in Iterator(this.win.gBrowser.visibleTabs)) {
        if (!tab.pinned)
          return tabs;

        tabs.push(new TabItem(tab));
      }
      return tabs;
    }
  },
  hasChild: {
    get: function () { return this.win.gBrowser.mTabs[0].pinned; },
  },
});
function GroupItem (group, session) {
  if (itemCache.has(group))
    return itemCache.get(group);

  this.group = group;
  if (group.addSubscriber.length > 2)
    group.addSubscriber(this, "close", Pano_dispatchGroupCloseEvent);
  else
    group.addSubscriber("close", Pano_dispatchGroupCloseEvent);

  if (session && ("openState" in session))
    this.isOpen = !!session.openState;

  itemCache.set(group, this);
}
GroupItem.prototype = Object.create(ItemPrototype, {
  type: { value: TAB_GROUP_TYPE },
  title: {
    get: function() { return this.group.getTitle() || this.group.id; },
  },
  id: {
    get: function() { return this.group.id; },
  },
  isOpen: {
    writable: true,
    value: true,
  },
  children: {
    get: function () {
      var tabs = [];
      for (let [, tabItem] in Iterator(this.group._children)) {
        tabs.push(new TabItem(tabItem.tab));
      }
      return tabs;
    },
  },
  hasChild: {
    get: function () { return this.group._children.length > 0; }
  },
});
function TabItem (tab) {
  if (itemCache.has(tab))
    return itemCache.get(tab);

  this.tab = tab;
  itemCache.set(tab, this);
}
TabItem.prototype = Object.create(ItemPrototype, {
  level: { value: 1 },
  type: { value: TAB_ITEM_TYPE },
  title: {
    get: function () { return this.tab.label; },
  },
  url: {
    get: function () { return this.tab.linkedBrowser.currentURI.spec; },
  },
  id: {
    get: function () { return this.tab._tPos; },
  },
});

const HANDLE_EVENT_TYPES = [
  "TabOpen",
  "TabClose",
  "TabMove",
  "TabSelect",
  "TabPinned",
  "TabUnpinned",
  "TabAttrModified",
  "TabGroupMove",
  "TabGroupAdded",
  "TabGroupClose",
  "tabviewshown",
  "tabviewhidden",
];

function Pano_moveTabToGroupItem (tab, groupItemId) {
  this.originalMoveTabToGroupItem(tab, groupItemId);
  var event = tab.ownerDocument.createEvent("Events");
  event.initEvent("TabGroupMove", true, false);
  tab.dispatchEvent(event);
}

function Pano_registerGroup (groupItem) {
  this.originalRegister(groupItem);
  var win = Components.utils.getGlobalForObject(groupItem),
      event = win.gWindow.document.createEvent("Events");
  event.initEvent("TabGroupAdded", true, false);
  win.gBrowser.dispatchEvent(event);
}

/**
 * dipatch an Event when the group is closed
 */
function Pano_dispatchGroupCloseEvent (groupItem, eventInfo) {
  // get TabView window object
  var win = Components.utils.getGlobalForObject(groupItem._children),
      event = win.document.createEvent("UIEvents");
  // set groupItem.id to UIEvent.detail
  event.initUIEvent("TabGroupClose", true, false, win, groupItem.id);
  win.gBrowser.dispatchEvent(event);
}

/**
 * PanoramaTreeView [implemented nsITreeView]
 * @class
 * @param {Window} gWindow Firefox's window
 */
function PanoramaTreeView (gWindow) {
  this.gWindow = gWindow;
  this.tabView = gWindow.TabView;
  this.gBrowser = gWindow.gBrowser;
  this.GI = gWindow.TabView._window.GroupItems;
  this.treeBox = null;
  this.rows = [];
  this.inited = false;
}

PanoramaTreeView.prototype = {
  init: function PTV_init () {
    if (this.inited)
      return;

    for (let [, type] in Iterator(HANDLE_EVENT_TYPES)) {
      this.gWindow.addEventListener(type, this, false);
    }
    this.build();
    var originalMoveTabToGroupItem = this.GI.moveTabToGroupItem;
    if (originalMoveTabToGroupItem.name !== "Pano_moveTabToGroupItem") {
      this.GI.originalMoveTabToGroupItem = originalMoveTabToGroupItem;
      this.GI.moveTabToGroupItem = Pano_moveTabToGroupItem;
    }
    var originalRegister = this.GI.register;
    if (originalRegister.name != "Pano_registerGroup") {
      this.GI.originalRegister = originalRegister;
      this.GI.register = Pano_registerGroup;
    }
    this.inited = true;
  },
  destroy: function PTV_destroy () {
    for (let [, type] in Iterator(HANDLE_EVENT_TYPES)) {
      this.gWindow.removeEventListener(type, this, false);
    }
  },
  saveSession: function PTV_saveSession (aWindow) {
    if (!aWindow)
      aWindow = this.gWindow;

    var data = {
      apptabs: {},
      groups: {},
      groupOrder: [],
    };
    for (let [, item] in Iterator(this.rows)) {
      switch (item.type) {
      case TAB_GROUP_TYPE:
        data.groups[item.id] = item.getSessionData();
        data.groupOrder.push(item.id);
        break;
      case TAB_GROUP_TYPE | APPTAB_GROUP_TYPE:
        data.apptabs = item.getSessionData();
        break;
      }
    }
    SessionStore.setWindowValue(aWindow, PANO_SESSION_ID, JSON.stringify(data));
  },
  getSession: function PTV_getSession (aWindow) {
    if (!aWindow)
      aWindow = this.gWindow;

    var data = SessionStore.getWindowValue(aWindow, PANO_SESSION_ID);
        failedData = { apptabs: {}, groups: {}, groupOrder: [] };
    try {
      if (!data)
        return failedData;

      return JSON.parse(data);
    } catch (e) {
      return failedData;
    }
  },
  filter: null,
  setFilter: function PTV_setFilter (aValue) {
    if (!aValue) {
      this.build();
      this.filter = null;
    } else {
      var count = this.rowCount,
          rows = [],
          reg;
      if (!this.filter)
        this.saveSession();

      reg = (typeof aValue === "string") ? blob(aValue, "i") : aValue;

      if (reg instanceof RegExp) {
        let tabs = this.gBrowser.tabs;
        for (let i = 0, len = tabs.length; i < len; ++i) {
          let tab = tabs[i];
          if (reg.test(tab.label) ||
              reg.test(tab.linkedBrowser.currentURI.spec))
            rows.push(new TabItem(tab));
        }
        this.rows = rows;
        this.filter = reg;
      }
      this.treeBox.rowCountChanged(rows.length, rows.length - count);
      this.treeBox.invalidate();
    }
  },
  build: function PTV_build (aSession) {
    // when the sessionstore is busy, wait the sessionstore is ready then build
    if (this.tabView._window.TabItems.reconnectingPaused()) {
      let self = this;
      let onSSWindowStateReady = function PTV_onSSWindowStateReady(aEvent) {
        aEvent.target.removeEventListener(aEvent.type, PTV_onSSWindowStateReady, false);
        this.build(aSession);
      }.bind(this);
      this.gWindow.addEventListener("SSWindowStateReady", onSSWindowStateReady, false);
      return [];
    }
    if (!aSession)
      aSession = this.getSession();

    var rows = [];
    let item = new AppTabsGroup(this.tabView._window, aSession.apptabs);
    rows.push(item);
    if (item.isOpen)
      rows.push.apply(rows, item.children);

    if (aSession.groupOrder && aSession.groupOrder.length > 0) {
      let order = aSession.groupOrder;
      this.GI.groupItems.sort(function sortGroup(a, b) {
        var bIndex = order.indexOf(b.id);
        return (bIndex === -1) ? false : order.indexOf(a.id) > bIndex;
      });
    }
    for (let [,group] in Iterator(this.GI.groupItems)) {
      item = new GroupItem(group, aSession.groups[group.id]);
      rows.push(item);
      if (item.isOpen)
        rows.push.apply(rows, item.children);
    }

    var oldLength = this.rows.length,
        newLength = rows.length,
        count = newLength - oldLength;
    this.rows = rows;
    if (count !== 0)
      this.treeBox.rowCountChanged(Math.min(newLength, oldLength), count);

    this.ensureCurrentTabIsVisible();
    this.treeBox.invalidate();

    return rows;
  },
  getAtom: function PTV_getAtom (name) {
    if (atomCache[name])
      return atomCache[name];

    return atomCache[name] = atomService.getAtom(name);
  },
  getRowForGroup: function PTV_getRowForGroup (aGroup) {
    if (!aGroup)
      return -1;

    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_GROUP_TYPE && item.group === aGroup) {
        return i;
      }
    }
    return -1;
  },
  getRowForTab: function PTV_getRowForTab (aTab) {
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_ITEM_TYPE && item.tab === aTab) {
        return i;
      }
    }
    return -1;
  },
  getGroupRowForTab: function PTV_getGroupRowForTab (aTab) {
    if (this.filter)
      return -1;

    if (aTab.pinned) {
      return 0;
    } else if (aTab._tabViewTabItem) {
      let group = aTab._tabViewTabItem.parent;
      if (group) {
        let row = this.getRowForGroup(group);
        if (row > 0)
          return row;

        // 存在しないので作成
        row = this.rows.push(new GroupItem(group)) - 1;
        this.treeBox.rowCountChanged(row, 1);
        return row;
      }
    }
    return -1;
  },
  get lastGroupRow () {
    for (let i = this.rowCount -1; i > 0; i--) {
      if (this.rows[i].type & TAB_GROUP_TYPE)
        return i;
    }
  },
  getSourceIndexFromDrag: function PTV_getSourceIndexFromDrag (aDataTransfer, index) {
    var types = aDataTransfer.mozTypesAt(index);
    if (types.contains(TAB_DROP_TYPE))
      return this.getRowForTab(aDataTransfer.mozGetDataAt(TAB_DROP_TYPE, index));
    else if (types.contains(GROUP_DROP_TYPE))
      return this.getRowForGroup(aDataTransfer.mozGetDataAt(GROUP_DROP_TYPE, index));

    return -1;
  },
  getIndexOfGroupForTab: function PTV_getIndexOfGroupForTab (tab, group) {
    return group._children.indexOf(tab._tabViewTabItem);
  },
  getItemFromEvent: function PTV_getItemFromEvent (aEvent) {
    var row = {}, col = {}, elt = {};
    this.treeBox.getCellAt(aEvent.clientX, aEvent.clientY, row, col, elt);
    if (row.value !== -1)
      return this.rows[row.value];

    return null;
  },
  editGroupName: function PTV_editGroupName () {
    var index = this.selection.currentIndex;
    if (index > 0 && this.rows[index].type & TAB_GROUP_TYPE &&
        this.isEditable(index, this.treeBox.columns[0])) {
      this.treeBox.element.startEditing(index, this.treeBox.columns[0]);
    }
  },
  getCurrentTabAndIndex: function PTV_getCurrentTabAndIndex () {
    var groupData = [null, -1];
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_GROUP_TYPE && item.group === this.GI._activeGroupItem) {
        groupData = [item, i];
      } else if (item.type & TAB_ITEM_TYPE && item.tab.selected) {
        return [item, i];
      }
    }
    return groupData;
  },
  getSelectedItems: function PTV_getSelectedItems () {
    var sel = this.selection,
        rangeCount = sel.getRangeCount(),
        items = [];
    for (let i = 0; i < rangeCount; ++i) {
      let start = {}, end = {};
      sel.getRangeAt(i, start, end);
      for (let k = start.value; k <= end.value; ++k) {
        items.push(this.rows[k]);
      }
    }
    return items;
  },
  hibernateItems: function PTV_hibernateItems (aItems) {
    var tabs = [];
    for (let i = 0, len = aItems.length; i < len; ++i) {
      let item = aItems[i];
      if (item.type & TAB_ITEM_TYPE) {
        if (!item.tab.selected && tabs.indexOf(item.tab) === -1)
          tabs.push(item.tab);
      } else
        item.children.forEach(function(child){ if (!child.tab.selected){ tabs.push(child.tab); } });
    }
    if (tabs.lnegth === 0)
      return;

    var activeGroupItem = this.GI._activeGroupItem;
    for (let i = 0, len = tabs.length; i < len; ++i) {
      let tab = tabs[i],
          browser = tab.linkedBrowser;
      if (browser.__SS_restoreState)
        continue;

      let state = SessionStore.getTabState(tab),
          shistory = browser.sessionHistory,
          icon = tab.getAttribute("image");

      browser.addEventListener("load", function onload(){
        this.removeEventListener("load", onload, true);
        if (shistory.count > 1)
          shistory.PurgeHistory(shistory.count -1);

        tab.ownerDocument.defaultView.setTimeout(function(){
          tab.setAttribute("image", icon);
        }, 0);
        SessionStore.setTabState(tab, state);
      }, true);
      browser.loadURI("about:blank");
    }
  },
  openTabs: function PTV_openTabs (aPages, aGroupItem, aTabPos) {
    var group,
        activeGroupItem = this.GI._activeGroupItem,
        background = true;
    if (!aGroupItem)
      group = this.GI._activeGroupItem;
    else if ("group" in aGroupItem)
      group = aGroupItem.group;
    else
      group = this.GI.newGroup();

    var isActive = (activeGroupItem === group);
    if (isActive)
      background = Services.prefs.getBoolPref("browser.tabs.loadInBackground");

    function delayedSetup (tab, group, page, self) {
      var tabItem = tab._tabViewTabItem;
      if (tabItem && tabItem.parent) {
        if (tabItem.parent !== group) {
          self.GI.moveTabToGroupItem(tab, group.id);
        }

        if (aTabPos >= 0)
          self.gBrowser.moveTabTo(tab, aTabPos++);

        if (page.icon)
          self.gBrowser.setIcon(tab, page.icon);
        else {
          try {
            let iconURI = PlacesUtils.favicons.getFaviconForPage(Services.io.newURI(page.url, null, null));
            self.gBrowser.setIcon(tab, iconURI.spec);
          } catch(e) {}
        }
      } else {
        self.gWindow.setTimeout(delayedSetup, 50, tab, group, page, self);
      }
    }
    try {
      for (let i = 0; i < aPages.length; ++i) {
        let page = aPages[i];

        let tab = null;
        if (background) {
          tab = this.gBrowser.addTab(null, { skipAnimation: true });
          setTabState(tab, page.url, page.title);
        } else {
          tab = this.gBrowser.loadOneTab(page.url, {
            inBackground: false,
            skipAnimation: true
          });
          background = true;
        }
        delayedSetup(tab, group, page, this);
      }
    } finally {
      if (!isActive)
        this.tabView._window.UI.setActive(activeGroupItem);
    }
  },
  getDropPosition: function PTV_getDropPosition (aTargetIndex, aOrientation) {
    var targetItem = this.rows[aTargetIndex],
        tPos = -1,
        groupItem;

    if (targetItem.type & TAB_ITEM_TYPE) {
      if (!targetItem.tab.pinned)
        tPos = targetItem.tab._tPos + (aOrientation == -1 ? 0 : 1);

      let groupRow = this.getGroupRowForTab(targetItem.tab);
      if (groupRow !== -1)
        groupItem = this.rows[groupRow];
      else {
        Cu.reportError("Not found group row");
        return [null, null];
      }
    } else {
      groupItem = targetItem;
      if (aOrientation === Ci.nsITreeView.DROP_AFTER && "group" in groupItem) {
        let tabItem = groupItem.group._children[0];
        if (tabItem)
          tPos = tabItem.tab._tPos;
      }
    }
    return [groupItem, tPos];
  },
  dropPlaces: function PTV_dropPlaces (aTargetIndex, aOrientation, aDataTransfer) {
    var itemCount = aDataTransfer.mozItemCount,
        urls = [];

    for (let i = 0; i < itemCount; ++i) {
      let node,
          data = aDataTransfer.mozGetDataAt(PlacesUtils.TYPE_X_MOZ_PLACE, i);
      try {
        node = PlacesUtils.unwrapNodes(data, PlacesUtils.TYPE_X_MOZ_PLACE)[0]
      } catch (e) {
        Cu.reportError(e);
        return false;
      }

      if (node.type === PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER)
        addUrlsFromContainer(node.children, urls);
      else if (node.type === PlacesUtils.TYPE_X_MOZ_PLACE)
        addUrlsFromPlace(node, urls);
    }

    if (urls.length === 0 || !PlacesUIUtils._confirmOpenInTabs(urls.length, this.tabView._window.gWindow))
      return;

    var [groupItem, tPos] = this.getDropPosition(aTargetIndex, aOrientation);
    this.openTabs(urls, groupItem, tPos);

    function addUrlsFromPlace (node, urls) {
      if (/^place:/.test(node.uri))
        addUrlsFromContainer(placesUriToObject(node.uri).children, urls);
      else
        urls.push({ url: node.uri, title: (node.title || node.uri) });
    }

    function addUrlsFromContainer (children, urls) {
      for (let i = 0; i < children.length; ++i) {
        let node = children[i];
        if (node.type === PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER)
          addUrlsFromContainer(node.children, urls);
        else if (node.type === PlacesUtils.TYPE_X_MOZ_PLACE)
          addUrlsFromPlace(node, urls);
      }
    }
  },
  dropURL: function PTV_dropURL (aTargetIndex, aOrientation, aDataTransfer) {
    var itemCount = aDataTransfer.mozItemCount,
        urls = [];

    for (let i = 0; i < itemCount; ++i) {
      let data = aDataTransfer.mozGetDataAt(PlacesUtils.TYPE_X_MOZ_URL, i);
      let [url, title]  = data.split("\n");
      if (url)
        urls.push({ url: url, title: (title || url) });
    }

    if (urls.length === 0)
      return;

    var [groupItem, tPos] = this.getDropPosition(aTargetIndex, aOrientation);
    this.openTabs(urls, groupItem, tPos);
  },
  dropTabs: function PTV_dropTabs (aTargetIndex, aOrientation, aDataTransfer) {
    var targetItem = this.rows[aTargetIndex],
        activeGroupItem = this.GI._activeGroupItem;

    var itemCount = aDataTransfer.mozItemCount;
    var selectedItem = null, nextItem = null;

    function moveGroupToGroup (aItem, aSourceIndex, aTargetItem) {
      var items = [aItem];
      if (aItem.isOpen) {
        let i = aSourceIndex + 1;
        for (; i < this.rows.length; ++i) {
          if (this.rows[i].type & TAB_ITEM_TYPE) {
            items.push(this.rows[i]);
          } else {
            break;
          }
        }
      }
      this.rows.splice(aSourceIndex, items.length);
      this.rows.splice.apply(this.rows, [this.rows.indexOf(aTargetItem), 0].concat(items));

      var gi = this.GI.groupItems;
      gi.splice(gi.indexOf(aItem.group), 1);
      gi.splice(gi.indexOf(aTargetItem.group), 0, aItem.group);
      var data = {};
      for (let j = 0, len = gi.length; j < len; ++j) {
        let g = gi[j];
        data[g.id] = g.getStorageData();
      }
      this.tabView._window.Storage._sessionStore.setWindowValue(this.tabView._window.gWindow,
        "tabview-group", JSON.stringify(data));

      this.treeBox.invalidate();
    }

    function moveTabToTab (aItem, aTargetItem, aOrientation) {
      var tab = aItem.tab,
          sourceGroup = tab._tabViewTabItem ? tab._tabViewTabItem.parent : null,
          targetGroup = aTargetItem.tab._tabViewTabItem ? aTargetItem.tab._tabViewTabItem.parent : null;
      if (targetGroup) {
        if (tab.pinned)
          this.gBrowser.unpinTab(tab);

        if (sourceGroup !== targetGroup)
          this.tabView.moveTabTo(tab, targetGroup.id);
      }
      else if (aTargetItem.tab.pinned) {
        if (!tab.pinned)
          this.gBrowser.pinTab(tab);
      }
      this.gBrowser.moveTabTo(tab,
        getMoveTabPosition(aTargetItem.tab._tPos, tab._tPos, aOrientation));
    }

    function moveTabToGroup (aItem, aTargetItem, aOrientation) {
      // アプリタブ・グループへドロップ
      if (aTargetItem.type & APPTAB_GROUP_TYPE) {
        this.gBrowser.pinTab(aItem.tab);
      }
      // 移動元のタブはアプリタブ
      else if (aItem.tab.pinned) {
        this.gBrowser.unpinTab(aItem.tab);
        this.tabView.moveTabTo(aItem.tab, aTargetItem.group.id);
      }
      // 別グループへドロップ
      else if (aTargetItem.group !== aItem.tab._tabViewTabItem.parent) {
        this.tabView.moveTabTo(aItem.tab, aTargetItem.group.id);
      }

      let children = aTargetItem.children;
      if (children.length > 0) {
        let tabIndex = children.length - 1;
        if (aTargetItem.isOpen && aOrientation === Ci.nsITreeView.DROP_AFTER)
          tabIndex = 0;

        let targetTab = children[tabIndex].tab;
        this.gBrowser.moveTabTo(aItem.tab,
          getMoveTabPosition(targetTab._tPos, aItem.tab._tPos, Ci.nsITreeView.DROP_AFTER));
      }
    }

    for (let i = 0; i < itemCount; ++i) {
      let sourceIndex = this.getSourceIndexFromDrag(aDataTransfer, i);
      if (sourceIndex === -1)
        continue;

      let item = this.rows[sourceIndex];
      if (item.type === TAB_GROUP_TYPE) {
        moveGroupToGroup.call(this, item, sourceIndex, targetItem);
      }
      else if (item.type & TAB_ITEM_TYPE) {
        // アクティブなタブであり、次に移動すべきアイテムが控えているならスキップ
        // 変数に保管しておく
        if (item.tab.selected && i + 1 < itemCount) {
          selectedItem = item;
          continue;
        }
        // 保管されたアクティブなタブがあり、次のアイテムがまだ設定されていないならば
        // 変数に保管しておく
        else if (selectedItem && !nextItem) {
          nextItem = item;
        }

        if (targetItem.type & TAB_GROUP_TYPE)
          moveTabToGroup.call(this, item, targetItem, aOrientation);
        else if (targetItem.type & TAB_ITEM_TYPE)
          moveTabToTab.call(this, item, targetItem, aOrientation);

        targetItem = item;
        aOrientation = Ci.nsITreeView.DROP_AFTER;
      }
    }

    if (selectedItem && nextItem)
      moveTabToTab.call(this, selectedItem, nextItem, -1);

    this.GI.setActiveGroupItem(activeGroupItem);
    this.selection.clearSelection();
  },
  ensureCurrentTabIsVisible: function PTV_ensureCurrentTabIsVisible () {
    var [item, index] = this.getCurrentTabAndIndex();
    if (!item) return;
    if (this.treeBox) {
      this.treeBox.ensureRowIsVisible(index);
      if (Services.prefs.getBoolPref(PREF_SELECT_CURRENTTAB))
        this.selection.select(index);
    } else
      this._visibleIndex = index;
  },
  // ==========================================================================
  // Handlers
  // ==========================================================================
  handleEvent: function PTV_handEvent (aEvent) {
    switch (aEvent.type) {
    case "tabviewshown":
      if (!this.filter)
        this.saveSession();
      break;
    case "tabviewhidden":
      if (!this.filter)
        this.build();
      break;
    case "TabOpen":
      this.onTabOpen(aEvent);
      break;
    case "TabClose":
      this.onTabClose(aEvent);
      break;
    case "TabPinned":
    case "TabUnpinned":
    case "TabMove":
    case "TabGroupMove":
      this.onTabMove(aEvent);
      break;
    case "TabSelect":
      this.onTabSelect(aEvent);
      break;
    case "TabGroupAdded":
      this.onTabGroupAdded(aEvent);
      break;
    case "TabGroupClose":
      this.onTabGroupClose(aEvent);
      break;
    case "TabAttrModified":
      this.onTabAttrModified(aEvent);
    default:
      this.treeBox.invalidate();
    }
  },
  onTabAttrModified: function PTV_onTabAttrModified (aEvent) {
    if (this.filter)
      this.setFilter(this.filter);
  },
  onTabOpen: function PTV_onTabOpen (aEvent, retryCount) {
    var tab = aEvent.target;
    if (this.getRowForTab(tab) > 0)
      return;

    if (!retryCount)
      retryCount = 0;

    var groupRow = this.getGroupRowForTab(tab);
    if (groupRow === -1) {
      if (tab._tabViewTabItem && retryCount <= 2) {
        // タイミングにより親が設定されていないことがある
        // 100ms 後に2回ほど再実行
        // XXX: 泥臭いので修正したいのだが...
        this.gWindow.setTimeout(function(self){
          self.onTabOpen(aEvent, ++retryCount);
        }, 100, this);
      }
      return;
    }
    else if (!this.rows[groupRow].isOpen)
      return;

    var changeIndex = 0;
    if (tab._tabViewTabItem) {
      let tabItem = tab._tabViewTabItem;
      if (tabItem.parent) {
        // グループに属しているタブ
        let group = this.rows[groupRow].group;
        group._children.sort(function(a, b) a.tab._tPos - b.tab._tPos);
        let tabIndex = this.getIndexOfGroupForTab(tab, group);
        changeIndex = groupRow + tabIndex + 1;
        this.rows.splice(changeIndex, 0, new TabItem(tab));
      }
    } else if (tab.pinned) {
      changeIndex = i + tab._tPos;
      this.rows.splice(changeIndex, 0, new TabItem(tab));
    }
    this.treeBox.rowCountChanged(changeIndex, 1);
  },
  onTabClose: function PTV_onTabClose (aEvent) {
    var tab = aEvent.target;
    var row = this.getRowForTab(tab);
    if (row !== -1) {
      this.rows.splice(row, 1);
      this.treeBox.rowCountChanged(row, -1);

      // 削除したタブ側にアクティブグループが移ってしまうのでリセット
      // その際、アプリタブからはグループを取れないので表示しているタブから
      // 普通のタブを取り出す
      let groupedTab = this.gBrowser.selectedTab;
      if (groupedTab.pinned) {
        let visibleTabs = this.gBrowser.visibleTabs;
        for (let i = 0, len = visibleTabs.length; i < len; ++i) {
          if (!visibleTabs[i].pinned) {
            groupedTab = visibleTabs[i];
            break;
          }
        }
      }
      if (groupedTab && groupedTab._tabViewTabItem)
        this.GI.setActiveGroupItem(groupedTab._tabViewTabItem.parent);
    }

  },
  onTabMove: function PTV_onTabMove (aEvent) {
    if (this.filter)
      return;

    var tab = aEvent.target;
    var row = this.getRowForTab(tab);

    var self = this;
    function addTab (tab, item) {
      var insertedRow = 0;
      if (tab.pinned) {
        insertedRow = 1 + tab._tPos;
        self.rows.splice(insertedRow, 0, item);
      }
      else {
        let group = tab._tabViewTabItem.parent;
        if (group) {
          group._children.sort(function(a,b) a.tab._tPos - b.tab._tPos);
          let groupRow = self.getRowForGroup(group);
          let tabIndex = self.getIndexOfGroupForTab(tab, group);
          insertedRow = groupRow + tabIndex + 1;
          self.rows.splice(insertedRow, 0, item);
        }
      }
      return insertedRow;
    }

    // row が -1 でないということは、移動元のグループは開いている
    if (row !== -1) {
      let item = this.rows.splice(row, 1)[0];
      let groupRow = this.getGroupRowForTab(tab);

      // 移動先のグループが閉じているときは追加せずに、終了
      if (!this.rows[groupRow].isOpen) {
        this.treeBox.rowCountChanged(row, -1);
        return;
      }

      addTab(tab, item);
      this.treeBox.invalidate();
    }
    // 移動元のグループは閉じている
    else {
      let groupRow = this.getGroupRowForTab(tab);
      if (this.rows[groupRow].isOpen) {
        let i = addTab(tab, new TabItem(tab));
        this.treeBox.rowCountChanged(i ,1);
      }
    }
  },
  onTabSelect: function PTV_onTabSelect (aEvent) {
    this.ensureCurrentTabIsVisible();
  },
  onTabGroupAdded: function PTV_onTabGroupAdded (aEvent) {
    var group = this.GI.groupItems[this.GI.groupItems.length - 1];
    var item = new GroupItem(group);
    row = this.rows.push(item) - 1;

    this.treeBox.rowCountChanged(row, 1);
  },
  onTabGroupClose: function PTV_onTabGroupClose (aEvent) {
    // グループが削除される時、既にタブは削除されているので考慮の必要なし
    var id = aEvent.detail;
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_GROUP_TYPE && item.id == id) {
        this.rows.splice(i, 1);
        this.treeBox.rowCountChanged(i, -1);
        break;
      }
    }
  },
  // ==========================================================================
  // nsITreeView
  // ==========================================================================
  //QueryInterface: XPCOMUtils.generateQI(["nsITreeView"]),
  get rowCount () {
    return this.rows.length;
  },
  setTree: function PTV_setTree (treeBox) {
    this.treeBox = treeBox;
    this.init();
    if (this._visibleIndex) {
      treeBox.ensureRowIsVisible(this._visibleIndex);
      delete this._visibleIndex;
    }
  },
  getCellText: function PTV_getCellText (aRow, aColumn) {
    var item = this.rows[aRow];
    switch(aColumn.element.getAttribute("anonid")) {
    case "title":
      if (showTabNumber && (item.type & TAB_ITEM_TYPE)) {
        let num = 1;
        if (item.tab.pinned)
          num = item.tab._tPos + 1;
        else {
          let tabItem = item.tab._tabViewTabItem;
          num = tabItem.parent._children.indexOf(tabItem) + 1;
        }
        return num + ". " + item.title;
      } else
        return item.title;
    case "url":
      return item.url;
    }
    return "";
  },
  getCellValue: function PTV_getCellValue (aRow, aColumn) {
    var item = this.rows[aRow];
    switch (aColumn.element.getAttribute("anonid")) {
    case "title":
      return item.id;
    case "closebutton":
      return !(item.type & APPTAB_GROUP_TYPE);
    }
    return "";
  },
  getLevel: function PTV_getLevel (aRow) {
    return this.filter ? 0 : this.rows[aRow].level;
  },
  getImageSrc: function PTV_getImageSrc (aRow, aColumn) {
    var row = this.rows[aRow];
    if (aColumn.index === 0 && row.level > 0 && !row.tab.hasAttribute("busy")) {
      return this.rows[aRow].tab.image;
    }
    return "";
  },
  canDrop: function PTV_canDrop (aTargetIndex, aOrientation, aDataTransfer) {
    if (this.filter)
      return false;

    let types = aDataTransfer.mozTypesAt(0);
    if (types.contains(PlacesUtils.TYPE_X_MOZ_URL))
      return aTargetIndex + aOrientation >= 0;

    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer, 0);
    if (sourceIndex === -1 ||
        sourceIndex === aTargetIndex ||
        sourceIndex === (aTargetIndex + aOrientation) ||
        aTargetIndex + aOrientation < 0)
      return false;

    if (this.rows[sourceIndex].type === TAB_GROUP_TYPE)
      return (this.rows[aTargetIndex].type === TAB_GROUP_TYPE);

    return (this.rows[sourceIndex].type & TAB_ITEM_TYPE) > 0;
  },
  drop: function PTV_drop (aTargetIndex, aOrientation, aDataTransfer) {
    if (this.rows[aTargetIndex].type & TAB_GROUP_TYPE && aOrientation === Ci.nsITreeView.DROP_BEFORE) {
      aTargetIndex--;
      aOrientation = Ci.nsITreeView.DROP_AFTER;
    }

    var types = aDataTransfer.mozTypesAt(0);
    if (types.contains(PlacesUtils.TYPE_X_MOZ_PLACE))
      this.dropPlaces(aTargetIndex, aOrientation, aDataTransfer);
    else if (types.contains(PlacesUtils.TYPE_X_MOZ_URL))
      this.dropURL(aTargetIndex, aOrientation, aDataTransfer);
    else
      this.dropTabs(aTargetIndex, aOrientation, aDataTransfer)

  },
  selection: null,
  getRowProperties: function PTV_getRowProperties (aRow, aProperties) {
    var item = this.rows[aRow];
    if (item.level === 0) {
      aProperties.AppendElement(this.getAtom("group"));

      if (item.group && item.group === this.GI._activeGroupItem)
        aProperties.AppendElement(this.getAtom("currentGroup"));

      if (item.type & APPTAB_GROUP_TYPE)
        aProperties.AppendElement(this.getAtom("AppTabs"));

    } else {
      aProperties.AppendElement(this.getAtom("item"));

      if (item.tab.selected)
        aProperties.AppendElement(this.getAtom("currentTab"));

      if (item.tab.pinned)
        aProperties.AppendElement(this.getAtom("apptab"));

      if (item.tab.linkedBrowser.__SS_restoreState)
        aProperties.AppendElement(this.getAtom("pending"));

      if (item.tab.hasAttribute("unread"))
        aProperties.AppendElement(this.getAtom("unread"));

      if (item.tab.hasAttribute("busy"))
        aProperties.AppendElement(this.getAtom("loading"));

      if (item.tab.hasAttribute("titlechanged"))
        aProperties.AppendElement(this.getAtom("titlechanged"))
    }
  },
  getCellProperties: function PTV_getCellProperties (aRow, aColumn, aProperties) {
    var anonid = aColumn.element.getAttribute("anonid");
    if (anonid === "closebutton") {
      aProperties.AppendElement(this.getAtom("closebutton"));
    }
    this.getRowProperties(aRow, aProperties);
  },
  getColumnProperties: function PTV_getColumnProperties (aColumn, aProperties) {},
  isContainer: function PTV_isContainer (aRow) {
    return this.rows[aRow].level === 0;
  },
  isContainerOpen: function PTV_isContainerOpen (aRow) {
    return this.rows[aRow].isOpen;
  },
  isContainerEmpty: function PTV_isContainerEmpty (aRow) {
    return !this.rows[aRow].hasChild;
  },
  isSeparator: function PTV_isSeparator (aRow) {
    return false;
  },
  isSorted: function (aRow) {
    return false;
  },
  getParentIndex: function PTV_getParentIndex (aRow) {
    if (this.rows[aRow].level !== 1)
      return -1;
    for ( ; aRow > 0; aRow--) {
      if (this.rows[aRow].level === 0)
        return aRow;
    }
    return -1;
  },
  hasNextSibling: function PTV_hasNextSibling (aRow, aAfterRow) {
    return (this.rows[aAfterRow] && this.rows[aAfterRow].level === this.rows[aRow].level);
  },
  getProgressMode: function PTV_getProgressMode (aRow, aColumn) {},
  toggleOpenState: function PTV_toggleOpenState (aRow) {
    var groupItem = this.rows[aRow],
        start = aRow + 1;
    if (groupItem.isOpen) {
      groupItem.isOpen = false;
      let i = 0;
      while (this.rows[start + i] && this.rows[start + i].level === 1)
        i++;

      if (i > 0) {
        this.rows.splice(start, i);
        this.treeBox.rowCountChanged(start, -i);
      }
    } else {
      groupItem.isOpen = true;
      let tabItems = groupItem.children;
      if (tabItems.length > 0) {
        this.rows.splice.apply(this.rows, [start, 0].concat(tabItems));
        this.treeBox.rowCountChanged(start, tabItems.length);
      }
    }
    this.saveSession();
  },
  cycleHeader: function PTV_cycleHeader (aColumn) {},
  selectionChanged: function PTV_selectionChanged () {},
  cycleCell: function PTV_cycleCell (aRow, aColumn) {},
  isEditable: function PTV_isEditable (aRow, aColumn) {
    if (aColumn.element.getAttribute("anonid") === "title")
      return (this.rows[aRow] instanceof GroupItem)

    return true;
  },
  isSelectable: function PTV_isSelectable (aRow, aColumn) {
    return false;
  },
  setCellValue: function PTV_setCellValue (aRow, aColumn, aValue) {
    if (aColumn.element.getAttribute("anonid") === "closebutton" && aValue === "false") {
      var item = this.rows[aRow];
      if (item.type & TAB_ITEM_TYPE) {
        this.gBrowser.removeTab(item.tab);
      } else if (item.type & TAB_GROUP_TYPE) {
        if (item.type & APPTAB_GROUP_TYPE)
          return;

        item.children.forEach(function (tabItem) {
          this.removeTab(tabItem.tab, { animate: false });
        }, this.gBrowser)

        if (item.group)
          item.group.close({ immediately: true });
      }
    }
  },
  setCellText: function PTV_setCellText (aRow, aColumn, aValue) {
    var group = this.rows[aRow].group;
    if (group.id != aValue) {
      group.setTitle(aValue);
      let doc = this.gWindow.document;
      let event = doc.createEvent("UIEvents");
      event.initUIEvent("TabGroupTitleChanged", true, false, this.gWindow, group.id);
      this.gWindow.dispatchEvent(event);
    }
  },
  performAction: function PTV_performAction (aAction) {},
  performActionOnRow: function PTV_performActionOnRow (aAction, aRow) {},
  performActionOnCell: function PTV_performActionOnCell (aAction, aRow, aColumn) {},
};

function onDragStart (aEvent, view) {
  if (view.filter)
    return;

  var items = view.getSelectedItems();
  if (items.length === 0)
    return;

  var dt = aEvent.dataTransfer;

  if (items.length === 1 && (items[0].type === TAB_GROUP_TYPE)) {
    dt.mozSetDataAt(GROUP_DROP_TYPE, items[0].group, 0);
  }
  else {
    items = items.filter(function(item) (item.type & TAB_ITEM_TYPE) > 0);

    const aspectRatio = 0.5625; // 16:9
    var canvas = view.tabView._window.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.mozOpaque = true;
    var offset = 15 * (items.length - 1);
    var cWidth = Math.ceil(view.tabView._window.gWindow.screen.availWidth / 5.75);
    canvas.width = cWidth + offset;
    canvas.height = Math.round(cWidth * aspectRatio) + offset;
    var ctx = canvas.getContext("2d");

    for (let i = 0, len = items.length; i < len; ++i) {
      let item = items[i];
      dt.mozSetDataAt(TAB_DROP_TYPE, item.tab, i);
      dt.mozSetDataAt("text/x-moz-text-internal", item.url, i);

      let win = item.tab.linkedBrowser.contentWindow;
      let snippetWidth = win.innerWidth * 0.6;
      // browser.sessionstore.max_concurrent_tabs が 0 の場合などで
      // ドキュメントがロードされていない場合、
      // innerWidth が 0 で、scale値がInfinityとなる
      // canvas に書き込むのはスキップ
      if (snippetWidth === 0)
        continue;

      let scale = cWidth / snippetWidth;
      ctx.save();
      ctx.translate(15 * i, 15 * i);
      ctx.scale(scale, scale);
      ctx.drawWindow(win, win.scrollX, win.scrollY, snippetWidth, snippetWidth * aspectRatio, "rgb(255,255,255)");
      ctx.restore();
    }

    dt.setDragImage(canvas, 0, 0);
  }
  dt.effectAllowed = "move";
  aEvent.stopPropagation();
}
PanoramaTreeView.onDragStart = onDragStart;

function blob (aString, aOption) {
  if (typeof aString !== "string")
    throw new TypeError("arguments must be string");

  var regStr = "";
  for (let [, char] in Iterator(aString)) {
    switch (char) {
    case "*":
      regStr += ".*";
      break;
    case "\\":
    case "?":
    case "+":
    case "^":
    case "$":
    case "(":
    case ")":
    case "{":
    case "}":
    case "[":
    case "]":
    case ".":
      regStr += "\\" + char;
      break;
    case " ":
      regStr += "\\s+";
      break;
    default:
      regStr += char;
      break;
    }
  }
  return new RegExp(regStr, aOption);
}

function getMoveTabPosition (aTargetTabPosition, aSourceTabPosition, aOrientation) {
  if (aSourceTabPosition < aTargetTabPosition)
    return aTargetTabPosition + (aOrientation === Ci.nsITreeView.DROP_AFTER ? 0 : -1);
  else
    return aTargetTabPosition + (aOrientation === Ci.nsITreeView.DROP_BEFORE ? 0 : 1);
}

function placesUriToObject (uri) {
  var query = {},
      length = {},
      options = {},
      root;
  PlacesUtils.history.queryStringToQueries(uri, query, length, options);
  root = PlacesUtils.history.executeQueries(query.value, length.value, options.value).root;
  if (!root.hasChildren)
    return null;

  return wrapNode(root);
}

function wrapNode (node) {
  var res = {
    title: node.title,
    uri: node.uri
  };
  switch (node.type) {
  case node.RESULT_TYPE_URI:
    res.type = PlacesUtils.TYPE_X_MOZ_PLACE;
    break;
  case node.RESULT_TYPE_QUERY:
  case node.RESULT_TYPE_FOLDER:
    res.type = PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER;
    res.children = [];

    node.QueryInterface(Ci.nsINavHistoryContainerResultNode);
    node.containerOpen = true;
    for (let i = 0, len = node.childCount; i < len; ++i) {
      let item = wrapNode(node.getChild(i));
      if (item)
        res.children.push(item);
    }
    node.containerOpen = false;
  }
  return res;
}

function setTabState (tab, url, title) {
  var state = {
    entries: [{
      url: url,
      title: title
    }],
    hidden: true,
    index: 1
  };
  SessionStore.setTabState(tab, JSON.stringify(state));
}

