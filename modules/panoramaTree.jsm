
var EXPORTED_SYMBOLS = [
  "PanoramaTreeView",
  "APPTAB_GROUP_TYPE",
  "ORPHANED_GROUP_TYPE",
  "TAB_GROUP_TYPE",
  "TAB_ITEM_TYPE",
];

const Cc = Components.classes,
      Ci = Components.interfaces,
      Cu = Components.utils;

const APPTAB_GROUP_TYPE   = 1 << 0,
      ORPHANED_GROUP_TYPE = 1 << 1,
      TAB_GROUP_TYPE      = 1 << 2,
      TAB_ITEM_TYPE       = 1 << 3;

const TAB_DROP_TYPE = "application/x-moz-tabbrowser-tab",
      GROUP_DROP_TYPE = "application/x-moz-pano-group";

const PANO_SESSION_ID = "pano-tabview-group";

/**
 * @namespace
 * @name XPCOMUtils
 */
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
/**
 * @namespace
 * @name Services
 */
Cu.import("resource://gre/modules/Services.jsm");


XPCOMUtils.defineLazyServiceGetter(this, "atomService", "@mozilla.org/atom-service;1", "nsIAtomService");
XPCOMUtils.defineLazyServiceGetter(this, "SessionStore", "@mozilla.org/browser/sessionstore;1", "nsISessionStore");
XPCOMUtils.defineLazyGetter(this, "bundle", function () {
  return Services.strings.createBundle("chrome://pano/locale/sidebar.properties");
});

var atomCache = {};

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
AppTabsGroup.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE | APPTAB_GROUP_TYPE,
  isOpen: true,
  get children () {
    var tabs = [];
    for (let [,tab] in Iterator(this.win.gBrowser.visibleTabs)) {
      if (!tab.pinned)
        return tabs;

      tabs.push(new TabItem(tab));
    }
    return tabs;
  },
  get hasChild () {
    return this.win.gBrowser.mTabs[0].pinned;
  }
};
function OrphanedGroup (win, session) {
  this.win = win;
  this.title = bundle.GetStringFromName("orphanedGroup");
  if (session && ("openState" in session))
    this.isOpen = !!session.openState;
}
OrphanedGroup.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE | ORPHANED_GROUP_TYPE,
  isOpen: true,
  get children () {
    var tabs = [];
    for (let [, tabItem] in Iterator(this.win.GroupItems.getOrphanedTabs())) {
      tabs.push(new TabItem(tabItem.tab));
    }
    return tabs;
  },
  get hasChild () {
    return this.win.GroupItems.getOrphanedTabs().length > 0;
  },
};

function GroupItem (group, session) {
  this.group = group;
  group.addSubscriber(this, "close", Pano_dispatchGroupCloseEvent);
  if (session && ("openState" in session))
    this.isOpen = !!session.openState;
}
GroupItem.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE,
  get title () this.group.getTitle() || this.group.id,
  get id () this.group.id,
  isOpen: true,
  get children () {
    var tabs = [];
    for (let [, tabItem] in Iterator(this.group._children)) {
      tabs.push(new TabItem(tabItem.tab));
    }
    return tabs;
  },
  get hasChild () {
    return this.group._children.length > 0;
  },
};
function TabItem (tab) {
  this.tab = tab;
}
TabItem.prototype = {
  __proto__: ItemPrototype,
  level: 1,
  type: TAB_ITEM_TYPE,
  get title() this.tab.label,
  get url () this.tab.linkedBrowser.currentURI.spec,
  get id () this.tab._tPos,
};

const HANDLE_EVENT_TYPES = [
  "TabOpen",
  "TabClose",
  "TabMove",
  "TabPinned",
  "TabUnpinned",
  "TabAttrModified",
  "TabGroupMove",
  "TabGroupClose",
];

function Pano_moveTabToGroupItem (tab, groupItemId) {
  this.originalMoveTabToGroupItem(tab, groupItemId);
  var event = tab.ownerDocument.createEvent("Events");
  event.initEvent("TabGroupMove", true, false);
  tab.dispatchEvent(event);
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
    if (originalMoveTabToGroupItem.name != "Pano_moveTabToGroupItem") {
      this.GI.originalMoveTabToGroupItem = originalMoveTabToGroupItem;
      this.GI.moveTabToGroupItem = Pano_moveTabToGroupItem;
    }
    this.inited = true;
  },
  destroy: function PTV_destroy () {
    for (let [, type] in Iterator(HANDLE_EVENT_TYPES)) {
      this.gWindow.removeEventListener(type, this, false);
    }
    this.saveSession();
  },
  saveSession: function PTV_saveSession (aWindow) {
    if (!aWindow)
      aWindow = this.gWindow;

    var data = {
      apptabs: {},
      groups: {},
      orphans: {}
    };
    for (let [, item] in Iterator(this.rows)) {
      switch (item.type) {
      case TAB_GROUP_TYPE:
        data.groups[item.id] = item.getSessionData();
        break;
      case TAB_GROUP_TYPE | APPTAB_GROUP_TYPE:
        data.apptabs = item.getSessionData();
        break;
      case TAB_GROUP_TYPE | ORPHANED_GROUP_TYPE:
        data.orphans = item.getSessionData();
        break;
      }
    }
    SessionStore.setWindowValue(aWindow, PANO_SESSION_ID, JSON.stringify(data));
  },
  getSession: function PTV_getSession (aWindow) {
    if (!aWindow)
      aWindow = this.gWindow;

    var data = SessionStore.getWindowValue(aWindow, PANO_SESSION_ID);
        failedData = { apptabs: {}, groups: {}, orphans: {} };
    try {
      if (!data)
        return failedData;

      return JSON.parse(data);
    } catch (e) {
      return failedData;
    }
  },
  getAppTabs: function PTV_getAppTabs () {
    var tabs = [];
    for (let [,tab] in Iterator(this.gBrowser.visibleTabs)) {
      if (!tab.pinned)
        return tabs;

      tabs.push(new TabItem(tab));
    }
    return tabs;
  },
  filter: null,
  setFilter: function PTV_setFilter (aValue) {
    var count = this.rowCount,
        rows = [],
        reg;
    if (!aValue) {
      rows = this.build();
      this.filter = null;
    } else {
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
    }
    this.treeBox.rowCountChanged(rows.length, rows.length - count);
    this.treeBox.invalidate();
  },
  build: function PTV_build (aSession) {
    if (!aSession)
      aSession = this.getSession();

    var rows = [];
    let item = new AppTabsGroup(this.tabView._window, aSession.apptabs);
    rows.push(item);
    if (item.isOpen)
      rows.push.apply(rows, item.children);

    for (let [,group] in Iterator(this.GI.groupItems)) {
      item = new GroupItem(group, aSession.groups[group.id]);
      rows.push(item);
      if (item.isOpen)
        rows.push.apply(rows, item.children);
    }

    item = new OrphanedGroup(this.tabView._window, aSession.orphans);
    rows.push(item);
    if (item.isOpen)
      rows.push.apply(rows, item.children);

    return this.rows = rows;
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
    } else {
      let group = aTab._tabViewTabItem.parent;
      if (group) {
        let row = this.getRowForGroup(group);
        if (row > 0)
          return row;

        // 存在しないので作成
        row = this.orphanedGroupRow;
        this.rows.splice(row, 0, new GroupItem(group));
        this.treeBox.rowCountChanged(row, 1);
        return row;
      }
      return this.orphanedGroupRow;
    }
  },
  get orphanedGroupRow () {
    for (let i = this.rowCount -1; i > 0; i--) {
      if (this.rows[i].type & ORPHANED_GROUP_TYPE)
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
    if (row.value != -1)
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
  // ==========================================================================
  // Handlers
  // ==========================================================================
  handleEvent: function PTV_handEvent (aEvent) {
    switch (aEvent.type) {
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
  onTabOpen: function PTV_onTabOpen (aEvent) {
    var tab = aEvent.target;
    var groupRow = this.getGroupRowForTab(tab);

    if (groupRow === -1 || !this.rows[groupRow].isOpen)
      return;

    var changeIndex = 0;
    if (tab._tabViewTabItem) {
      let tabItem = tab._tabViewTabItem;
      if (tabItem.parent) {
        // グループに属しているタブ
        groupItem = this.rows[groupRow];
        let tabIndex = this.getIndexOfGroupForTab(tab, groupItem.group);
        changeIndex = groupRow + tabIndex + 1;
        this.rows.splice(changeIndex, 0, new TabItem(tab));
      } else {
        // 孤立タブ
        changeIndex = this.rows.push(new TabItem(tab)) - 1;
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
    if (row != -1) {
      this.rows.splice(row, 1);
      this.treeBox.rowCountChanged(row, -1);
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
        // 孤立タブ
        else {
          insertedRow = self.rows.push(item) - 1;
        }
      }
      return insertedRow;
    }

    // row が -1 でないということは、移動元のグループは開いている
    if (row != -1) {
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
  },
  getCellText: function PTV_getCellText (aRow, aColumn) {
    switch(aColumn.element.getAttribute("anonid")) {
    case "title":
      return this.rows[aRow].title;
    case "url":
      return this.rows[aRow].url;
    }
    return "";
  },
  getCellValue: function PTV_getCellValue (aRow, aColumn) {
    if (aColumn.element.getAttribute("anonid") == "title") {
      let item = this.rows[aRow];
      return item.id;
    }
    return "";
  },
  getLevel: function PTV_getLevel (aRow) {
    return this.filter ? 0 : this.rows[aRow].level;
  },
  getImageSrc: function PTV_getImageSrc (aRow, aColumn) {
    if (aColumn.index == 0 && this.rows[aRow].level > 0) {
      return this.rows[aRow].tab.image;
    }
    return "";
  },
  canDrop: function PTV_canDrop (aTargetIndex, aOrientation, aDataTransfer) {
    if (this.filter)
      return false;

    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer, 0);
    if (sourceIndex == -1 ||
        sourceIndex == aTargetIndex ||
        sourceIndex == (aTargetIndex + aOrientation) ||
        aTargetIndex + aOrientation == 0)
      return false;

    if (this.rows[sourceIndex].type === TAB_GROUP_TYPE)
      return (this.rows[aTargetIndex].type === TAB_GROUP_TYPE);

    return (this.rows[sourceIndex].type & TAB_ITEM_TYPE) > 0;
  },
  drop: function PTV_drop (aTargetIndex, aOrientation, aDataTransfer) {
    if (this.rows[aTargetIndex].type & TAB_GROUP_TYPE && aOrientation == Ci.nsITreeView.DROP_BEFORE) {
      aTargetIndex--;
      aOrientation = Ci.nsITreeView.DROP_AFTER;
    }
    var targetItem = this.rows[aTargetIndex];

    var itemCount = aDataTransfer.mozItemCount;
    for (let i = 0; i < itemCount; ++i) {
      let sourceIndex = this.getSourceIndexFromDrag(aDataTransfer, i);
      if (sourceIndex === -1)
        continue;

      let item = this.rows[sourceIndex];
      if (item.type === TAB_GROUP_TYPE) {
        let items = [item];
        if (item.isOpen) {
          let i = sourceIndex + 1;
          for (; i < this.rows.length; ++i) {
            if (this.rows[i].type & TAB_ITEM_TYPE) {
              items.push(this.rows[i]);
            } else {
              break;
            }
          }
        }
        this.rows.splice(sourceIndex, items.length);
        this.rows.splice.apply(this.rows, [this.rows.indexOf(targetItem), 0].concat(items));

        let gi = this.GI.groupItems;
        gi.splice(gi.indexOf(item.group), 1);
        gi.splice(gi.indexOf(targetItem.group), 0, item.group);
        let data = {};
        for (let j = 0, len = gi.length; j < len; ++j) {
          let g = gi[j];
          data[g.id] = g.getStorageData();
        }
        this.tabView._window.Storage._sessionStore.setWindowValue(this.tabView._window.gWindow,
          "tabview-group", JSON.stringify(data));

        this.treeBox.invalidate();
      }
      else if (item.type & TAB_ITEM_TYPE) {
        if (targetItem.type & TAB_GROUP_TYPE) {
          let indexOfGroup = 0;
          // アプリタブ・グループへドロップ
          if (targetItem.type & APPTAB_GROUP_TYPE) {
            this.gBrowser.pinTab(item.tab);
            if (targetGroup.isOpen && aOrientation == Ci.nsITreeView.DROP_AFTER)
              this.gBrowser.moveTabTo(item.tab, 0);
          }
          // 孤立タブ・グループへドロップ
          else if (targetItem.type & ORPHANED_GROUP_TYPE) {
            if (item.tab.pinned)
              this.gBrowser.unpinTab(item.tab);

            let tabItem = item.tab._tabViewTabItem;
            let itemGroup = tabItem.parent;
            if (itemGroup)
              itemGroup.remove(tabItem);

            if (targetItem.isOpen && aOrientation == Ci.nsITreeView.DROP_AFTER && this.rows[aTargetIndex + 1])
                this.gBrowser.moveTabTo(item.tab, this.rows[aTargetIndex + 1].tab._tPos);

            this.onTabMove({type: "TabToOrphaned", target: item.tab})

            if (itemGroup && itemGroup === this.GI._activeGroupItem)
              this.gBrowser.hideTab(tabItem.tab);
          }
          // 移動元のタブはアプリタブ
          else if (item.tab.pinned) {
            this.gBrowser.unpinTab(item.tab);
            this.tabView.moveTabTo(item.tab, targetItem.group.id);
            if (targetItem.isOpen && aOrientation == Ci.nsITreeView.DROP_AFTER && targetItem.group._columns > 0)
              this.gBrowser.moveTabTo(item.tab, targetItem.group.getChild(0).tab._tPos);
          }
          // 別グループへドロップ
          else if (targetItem.group !== item.tab._tabViewTabItem.parent) {
            this.tabView.moveTabTo(item.tab, targetItem.group.id);
            if (targetItem.isOpen && aOrientation == Ci.nsITreeView.DROP_AFTER && targetItem.group._columns > 0)
              this.gBrowser.moveTabTo(item.tab, targetItem.group.getChild(0).tab._tPos);
          }
          // 同一グループの先頭へドロップ
          else if (aOrientation == Ci.nsITreeView.DROP_AFTER) {
            this.gBrowser.moveTabTo(item.tab, targetItem.group.getChild(0).tab._tPos);
          }
        }
        else if (targetItem.type & TAB_ITEM_TYPE) {
          let tab = item.tab;
          let sourceGroup = tab._tabViewTabItem ? tab._tabViewTabItem.parent : null;
          let targetGroup = targetItem.tab._tabViewTabItem ? targetItem.tab._tabViewTabItem.parent : null;
          if (targetGroup) {
            if (tab.pinned)
              this.gBrowser.unpinTab(tab);

            if (sourceGroup != targetGroup)
              this.tabView.moveTabTo(tab, targetGroup.id);
          }
          else if (targetItem.tab.pinned) {
            if (!tab.pinned)
              this.gBrowser.pinTab(tab);
          }
          else {
            // move to OrphanedGroup
            if (sourceGroup) {
              sourceGroup.remove(tab._tabViewTabItem);
              if (sourceGroup === this.GI._activeGroupItem)
                this.gBrowser.hideTab(tab);
            }
          }
          this.gBrowser.moveTabTo(tab, targetItem.tab._tPos + aOrientation);
        }
      }
    }
  },
  selection: null,
  getRowProperties: function PTV_getRowProperties (aRow, aProperties) {},
  getCellProperties: function PTV_getCellProperties (aRow, aColumn, aProperties) {
    if (aColumn.element.getAttribute("anonid") != "title")
      return;

    var item = this.rows[aRow];
    if (item.level == 0) {
      aProperties.AppendElement(this.getAtom("group"));

      if (item.group && item.group === this.GI._activeGroupItem)
        aProperties.AppendElement(this.getAtom("currentGroup"));

      if (item.type & APPTAB_GROUP_TYPE)
        aProperties.AppendElement(this.getAtom("AppTabs"));
      else if (item.type & ORPHANED_GROUP_TYPE)
        aProperties.AppendElement(this.getAtom("Orphaned"));

    } else {
      aProperties.AppendElement(this.getAtom("item"));

      if (item.tab.selected)
        aProperties.AppendElement(this.getAtom("currentTab"));

      if (item.tab.pinned)
        aProperties.AppendElement(this.getAtom("apptab"));
      else if (!item.tab._tabViewTabItem)
        aProperties.AppendElement(this.getAtom("orphaned"));
    }
  },
  getColumnProperties: function PTV_getColumnProperties (aRow, aProperties) {},
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
    if (this.rows[aRow].level != 1)
      return -1;
    for ( ; aRow > 0; aRow--) {
      if (this.rows[aRow].level == 0)
        return aRow;
    }
    return -1;
  },
  hasNextSibling: function PTV_hasNextSibling (aRow, aAfterRow) {
    return (this.rows[aAfterRow] && this.rows[aAfterRow].level == this.rows[aRow].level);
  },
  getProgressMode: function PTV_getProgressMode (aRow, aColumn) {},
  toggleOpenState: function PTV_toggleOpenState (aRow) {
    var groupItem = this.rows[aRow],
        start = aRow + 1;
    if (groupItem.isOpen) {
      groupItem.isOpen = false;
      let i = 0;
      while (this.rows[start + i] && this.rows[start + i].level == 1)
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
  },
  cycleHeader: function PTV_cycleHeader (aColumn) {},
  selectionChanged: function PTV_selectionChanged () {},
  cycleCell: function PTV_cycleCell (aRow, aColumn) {},
  isEditable: function PTV_isEditable (aRow, aColumn) {
    if (aColumn.element.getAttribute("anonid") != "title")
      return false;

    return (this.rows[aRow] instanceof GroupItem)
  },
  isSelectable: function PTV_isSelectable (aRow, aColumn) {
    return false;
  },
  setCellValue: function PTV_setCellValue (aRow, aColumn, aValue) {},
  setCellText: function PTV_setCellText (aRow, aColumn, aValue) {
    this.rows[aRow].group.setTitle(aValue);
  },
  performAction: function PTV_performAction (aAction) {},
  performActionOnRow: function PTV_performActionOnRow (aAction, aRow) {},
  performActionOnCell: function PTV_performActionOnCell (aAction, aRow, aColumn) {},
};

function getSelectedItems (view) {
  var sel = view.selection,
      rangeCount = sel.getRangeCount(),
      items = [];
  for (let i = 0; i < rangeCount; ++i) {
    let start = {}, end = {};
    sel.getRangeAt(i, start, end);
    for (let k = start.value; k <= end.value; ++k) {
      items.push(view.rows[k]);
    }
  }
  return items;
}

function onDragStart (aEvent, view) {
  if (view.filter)
    return;

  var items = getSelectedItems(view);
  if (items.length == 0)
    return;

  var dt = aEvent.dataTransfer;

  if (items.length == 1 && (items[0].type === TAB_GROUP_TYPE)) {
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
      if (snippetWidth == 0)
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
