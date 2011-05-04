
var EXPORTED_SYMBOLS = [
  "PanoramaSidebar",
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

const TAB_DROP_TYPE = "application/x-moz-tabbrowser-tab";

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


XPCOMUtils.defineLazyServiceGetter(this, "atomService", "@mozilla.org/atom-service;1", "nsIAtomService");
XPCOMUtils.defineLazyGetter(this, "bundle", function () {
  return Services.strings.createBundle("chrome://pano/locale/sidebar.properties");
});

var atomCache = {};

var ItemPrototype = {
  title: "",
  url: "",
  level: 0,
  id: 0,
};
function AppTabsGroup (win) {
  this.win = win;
  this.title = bundle.GetStringFromName("appTabGroup");
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
function OrphanedGroup (win) {
  this.win = win;
  this.title = bundle.GetStringFromName("orphanedGroup");
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

function GroupItem (group) {
  this.group = group;
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
];

function Pano_moveTabToGroupItem (tab, groupItemId) {
  this.originalMoveTabToGroupItem(tab, groupItemId);
  var event = tab.ownerDocument.createEvent("Events");
  event.initEvent("TabGroupMove", true, false);
  tab.dispatchEvent(event);
}

function PanoramaSidebar (tabView) {
  this.tabView = tabView;
  this.gBrowser = tabView._window.gBrowser;
  this.GI = tabView._window.GroupItems;
  this.treeBox = null;
  this.rows = [];
}

PanoramaSidebar.prototype = {
  init: function PS_init () {
    var win = this.tabView._window.gWindow;
    for (let [, type] in Iterator(HANDLE_EVENT_TYPES)) {
      win.addEventListener(type, this, false);
    }
    this.build();
    var originalMoveTabToGroupItem = this.GI.moveTabToGroupItem;
    if (originalMoveTabToGroupItem.name != "Pano_moveTabToGroupItem") {
      this.GI.originalMoveTabToGroupItem = originalMoveTabToGroupItem;
      this.GI.moveTabToGroupItem = Pano_moveTabToGroupItem;
    }
  },
  destroy: function PS_destroy () {
    var win = this.tabView._window.gWindow;
    for (let [, type] in Iterator(HANDLE_EVENT_TYPES)) {
      win.removeEventListener(type, this, false);
    }
  },
  getAppTabs: function PS_getAppTabs () {
    var tabs = [];
    for (let [,tab] in Iterator(this.gBrowser.visibleTabs)) {
      if (!tab.pinned)
        return tabs;

      tabs.push(new TabItem(tab));
    }
    return tabs;
  },
  build: function PS_build () {
    var rows = [];
    let item = new AppTabsGroup(this.tabView._window);
    rows.push(item);
    rows.push.apply(rows, item.children);
    for (let [,group] in Iterator(this.GI.groupItems)) {
      item = new GroupItem(group);
      rows.push(item);
      rows.push.apply(rows, item.children);
    }
    item = new OrphanedGroup(this.tabView._window);
    rows.push.apply(rows, item.children);
    this.rows = rows;
  },
  getAtom: function PS_getAtom (name) {
    if (atomCache[name])
      return atomCache[name];

    return atomCache[name] = atomService.getAtom(name);
  },
  getRowForGroup: function PS_getRowForGroup (aGroup) {
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_GROUP_TYPE && item.group === aGroup) {
        return i;
      }
    }
    return -1;
  },
  getRowForTab: function PS_getRowForTab (aTab) {
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_ITEM_TYPE && item.tab === aTab) {
        return i;
      }
    }
    return -1;
  },
  getGroupRowForTab: function PS_getGroupRowForTab (aTab) {
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
  getSourceIndexFromDrag: function PS_getSourceIndexFromDrag (aDataTransfer) {
    var tab = aDataTransfer.mozGetDataAt(TAB_DROP_TYPE, 0);
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_ITEM_TYPE && item.tab === tab) {
        return i;
      }
    }
    return -1;
  },
  getIndexOfGroupForTab: function PS_getIndexOfGroupForTab (tab, group) {
    return group._children.indexOf(tab._tabViewTabItem);
  },
  // ==========================================================================
  // Handlers
  // ==========================================================================
  handleEvent: function PS_handEvent (aEvent) {
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
    default:
      this.treeBox.invalidate();
    }
  },
  onTabOpen: function PS_onTabOpen (aEvent) {
    var tab = aEvent.target;
    var groupRow = this.getGroupRowForTab(tab);
    if (!this.rows[groupRow].isOpen)
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
  onTabClose: function PS_onTabClose (aEvent) {
    var tab = aEvent.target;
    var groupRow = this.getGroupRowForTab(tab);
    if (!this.rows[groupRow].isOpen)
      return;

    var row = this.getRowForTab(tab);
    if (row != -1) {
      this.rows.splice(row, 1);
      this.treeBox.rowCountChanged(row, -1);
    }
  },
  onTabMove: function PS_onTabMove (aEvent) {
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
  // ==========================================================================
  // nsITreeView
  // ==========================================================================
  //QueryInterface: XPCOMUtils.generateQI(["nsITreeView"]),
  get rowCount () {
    return this.rows.length;
  },
  setTree: function PS_setTree (treeBox) {
    this.treeBox = treeBox;
    this.init();
  },
  getCellText: function PS_getCellText (aRow, aColumn) {
    switch(aColumn.element.getAttribute("anonid")) {
    case "title":
      return this.rows[aRow].title;
    case "url":
      return this.rows[aRow].url;
    }
    return "";
  },
  getCellValue: function PS_getCellValue (aRow, aColumn) {
    if (aColumn.element.getAttribute("anonid") == "title") {
      let item = this.rows[aRow];
      return item.id;
    }
    return "";
  },
  getLevel: function PS_getLevel (aRow) {
    return this.rows[aRow].level;
  },
  getImageSrc: function PS_getImageSrc (aRow, aColumn) {
    if (aColumn.index == 0 && this.rows[aRow].level > 0) {
      return this.rows[aRow].tab.image;
    }
    return "";
  },
  canDrop: function PS_canDrop (aTargetIndex, aOrientation, aDataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer);
    return sourceIndex != -1 &&
           (this.rows[sourceIndex].type & TAB_ITEM_TYPE) > 0 &&
           sourceIndex != aTargetIndex &&
           sourceIndex != (aTargetIndex + aOrientation) &&
           aTargetIndex + aOrientation != 0;
  },
  drop: function PS_drop (aTargetIndex, aOrientation, aDataTransfer) {
    var sourceIndex = this.getSourceIndexFromDrag(aDataTransfer);
    var item = this.rows[sourceIndex];
    if (this.rows[aTargetIndex].type & TAB_GROUP_TYPE && aOrientation == Ci.nsITreeView.DROP_BEFORE) {
      aTargetIndex--;
      aOrientation = Ci.nsITreeView.DROP_AFTER;
    }
    var targetItem = this.rows[aTargetIndex];

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
        if (tabItem.parent)
          tabItem.parent.remove(tabItem);

        if (targetItem.isOpen && aOrientation == Ci.nsITreeView.DROP_AFTER && this.rows[aTargetIndex + 1])
            this.gBrowser.moveTabTo(item.tab, this.rows[aTargetIndex + 1].tab._tPos);

        this.onTabMove({type: "TabToOrphaned", target: item.tab})
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
      let sourceGroup = item.tab._tabViewTabItem ? item.tab._tabViewTabItem.parent : null;
      let targetGroup = targetItem.tab._tabViewTabItem ? targetItem.tab._tabViewTabItem.parent : null;
      if (targetGroup) {
        if (item.tab.pinned)
          this.gBrowser.unpinTab(item.tab);

        if (sourceGroup != targetGroup)
          this.tabView.moveTabTo(item.tab, targetGroup.id);
      }
      else if (targetItem.tab.pinned) {
        if (!item.tab.pinned)
          this.gBrowser.pinTab(item.tab);
      }
      else {
        // move to OrphanedGroup
        if (sourceGroup)
          sourceGroup.remove(item);
      }
      this.gBrowser.moveTabTo(item.tab, targetItem.tab._tPos + aOrientation);
    }
  },
  selection: null,
  getRowProperties: function PS_getRowProperties (aRow, aProperties) {},
  getCellProperties: function PS_getCellProperties (aRow, aColumn, aProperties) {
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
  getColumnProperties: function PS_getColumnProperties (aRow, aProperties) {},
  isContainer: function PS_isContainer (aRow) {
    return this.rows[aRow].level === 0;
  },
  isContainerOpen: function PS_isContainerOpen (aRow) {
    return this.rows[aRow].isOpen;
  },
  isContainerEmpty: function PS_isContainerEmpty (aRow) {
    return !this.rows[aRow].hasChild;
  },
  isSeparator: function PS_isSeparator (aRow) {
    return false;
  },
  isSorted: function (aRow) {
    return false;
  },
  getParentIndex: function PS_getParentIndex (aRow) {
    if (this.rows[aRow].level != 1)
      return -1;
    for ( ; aRow > 0; aRow--) {
      if (this.rows[aRow].level == 0)
        return aRow;
    }
    return -1;
  },
  hasNextSibling: function PS_hasNextSibling (aRow, aAfterRow) {
    return (this.rows[aAfterRow] && this.rows[aAfterRow].level == this.rows[aRow].level);
  },
  getProgressMode: function PS_getProgressMode (aRow, aColumn) {},
  toggleOpenState: function PS_toggleOpenState (aRow) {
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
  cycleHeader: function PS_cycleHeader (aColumn) {},
  selectionChanged: function PS_selectionChanged () {},
  cycleCell: function PS_cycleCell (aRow, aColumn) {},
  isEditable: function PS_isEditable (aRow, aColumn) {
    if (aColumn.element.getAttribute("anonid") != "title")
      return false;

    return (this.rows[aRow] instanceof GroupItem)
  },
  isSelectable: function PS_isSelectable (aRow, aColumn) {
    return false;
  },
  setCellValue: function PS_setCellValue (aRow, aColumn, aValue) {},
  setCellText: function PS_setCellText (aRow, aColumn, aValue) {
    this.rows[aRow].group.setTitle(aValue);
  },
  performAction: function PS_performAction (aAction) {},
  performActionOnRow: function PS_performActionOnRow (aAction, aRow) {},
  performActionOnCell: function PS_performActionOnCell (aAction, aRow, aColumn) {},
};

function onDragStart (aEvent, view) {
  var tree = aEvent.target.parentNode;
  var index = tree.view.selection.currentIndex;
  if (index != -1) {
    let item = view.rows[index];
    if (item.type & TAB_ITEM_TYPE) {
      let dt = aEvent.dataTransfer;
      dt.mozSetDataAt(TAB_DROP_TYPE, item.tab, 0);
      dt.mozSetDataAt("text/x-moz-text-internal", item.url, 0);
      dt.mozCursor = "default";
      let canvas = view.tabView._window.gWindow.tabPreviews.capture(item.tab, false);
      dt.setDragImage(canvas, 0, 0);
      dt.effectAllowed = "move";
    }
  }
  aEvent.stopPropagation();
}
PanoramaSidebar.onDragStart = onDragStart;

