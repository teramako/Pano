
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
function AppTabsGroup () {
  this.title = bundle.GetStringFromName("appTabGroup");
}
AppTabsGroup.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE | APPTAB_GROUP_TYPE,
};
function OrphanedGroup () {
  this.title = bundle.GetStringFromName("orphanedGroup");
}
OrphanedGroup.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE | ORPHANED_GROUP_TYPE,
};

function GroupItem (group) {
  this.group = group;
}
GroupItem.prototype = {
  __proto__: ItemPrototype,
  type: TAB_GROUP_TYPE,
  get title () this.group.getTitle() || this.group.id,
  get id () this.group.id,
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

const HANDLE_EVENT_TYPES = [ "TabOpen", "TabClose", "TabMove", "TabPinned", "TabUnpinned", "TabAttrModified" ];

function PanoramaSidebar (tabView) {
  this.tabView = tabView;
  this.gBrowser = tabView._window.gBrowser;
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
    var gb = this.tabView._window.gBrowser,
        GI = this.tabView._window.GroupItems,
        rows = [];
    rows.push(new AppTabsGroup());
    rows.push.apply(rows, this.getAppTabs());
    for (let [,group] in Iterator(GI.groupItems)) {
      rows.push(new GroupItem(group));
      for (let [,tabItem] in Iterator(group.getChildren())) {
        rows.push(new TabItem(tabItem.tab));
      }
    }
    rows.push(new OrphanedGroup());
    var orphanedTabs = GI.getOrphanedTabs();
    if (orphanedTabs.length > 0) {
      for (let [,tabItem] in Iterator(orphanedTabs)) {
        rows.push(new TabItem(tabItem.tab));
      }
    }
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
  getSourceIndexFromDrag: function PS_getSourceIndexFromDrag (aDataTransfer) {
    var tab = aDataTransfer.mozGetDataAt(TAB_DROP_TYPE, 0);
    for (let [i, item] in Iterator(this.rows)) {
      if (item.type & TAB_ITEM_TYPE && item.tab === tab) {
        return i;
      }
    }
    return -1;
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
    default:
      this.treeBox.invalidate();
    }
  },
  onTabOpen: function PS_onTabOpen (aEvent) {
    var tab = aEvent.target;
    var changeIndex = 0, changeCount = 1;
    if (tab._tabViewTabItem) {
      let tabItem = tab._tabViewTabItem;
      if (tabItem.parent) {
        // グループに属しているタブ
        let groupRow = this.getRowForGroup(tabItem.parent);
        let groupItem;
        if (groupRow == -1) {
          groupItem = new GroupItem (tabItem.parent);
          groupRow  = this.rows.length - 1;
          for (; groupRow > 0; groupRow--) {
            if (this.rows[groupRow].type & ORPHANED_GROUP_TYPE)
              break;
          }
          this.rows.splice(groupRow, 0, groupItem);
          changeIndex = groupRow;
          changeCount++;
        } else {
          groupItem = this.rows[groupRow];
        }
        for (let i = 0; i < groupItem.group._children.length; i++) {
          if (groupItem.group._children[i].tab === tab) {
            if (changeIndex == 0)
              changeIndex = groupRow + i + 1;
            this.rows.splice(groupRow + i + 1, 0, new TabItem(tab));
            break;
          }
        }
      } else {
        // 孤立タブ
        changeIndex = this.rows.push(new TabItem(tab)) - 1;
      }
    } else if (tab.pinned) {
      this.rows.splice(1 + tab._tPos, 0, new TabItem(tab));
      changeIndex = i + tab._tPos;
    }
    this.treeBox.rowCountChanged(changeIndex, changeCount);
  },
  onTabClose: function PS_onTabClose (aEvent) {
    var tab = aEvent.target;
    var row = this.getRowForTab(tab);
    if (row != 1) {
      this.rows.splice(row, 1);
      this.treeBox.rowCountChanged(row, -1);
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
    }
    var targetItem = this.rows[aTargetIndex];

    if (targetItem.type & TAB_GROUP_TYPE) {
      let indexOfGroup = 0;
      if (targetItem.type & APPTAB_GROUP_TYPE) {
        this.gBrowser.pinTab(item.tab);
        indexOfGroup = Array.indexOf(this.gBrowser.mTabs, item.tab), 0, item;
      } else if (targetItem.type & ORPHANED_GROUP_TYPE) {
        if (item.tab.pinned) {
          this.gBrowser.unpinTab(item.tab);
        }
        let tabItem = item.tab._tabViewTabItem;
        if (tabItem.parent)
          tabItem.parent.remove(tabItem);

        indexOfGroup = this.tabView._window.GroupItems.getOrphanedTabs().indexOf(tabItem);
      } else if (item.tab.pinned) {
        // 移動元のタブはアプリタブ
        this.gBrowser.unpinTab(item.tab);
        this.tabView.moveTabTo(item.tab, targetItem.group.id);
        indexOfGroup = targetItem.group._children.indexOf(item.tab._tabViewTabItem);
      } else if (targetItem.group !== item.tab._tabViewTabItem.parent) {
        this.tabView.moveTabTo(item.tab, targetItem.group.id);
        indexOfGroup = targetItem.group._children.indexOf(item.tab._tabViewTabItem);
      } else {
        return;
      }

      this.rows.splice(sourceIndex, 1);
      this.rows.splice(aTargetIndex + indexOfGroup, 0, item);
    } else if (targetItem.type & TAB_ITEM_TYPE) {
      let sourceGroup = item.tab._tabViewTabItem ? item.tab._tabViewTabItem.parent : null;
      let targetGroup = targetItem.tab._tabViewTabItem ? targetItem.tab._tabViewTabItem.parent : null;
      if (targetGroup) {
        if (item.tab.pinned)
          this.gBrowser.unpinTab(item.tab);

        if (sourceGroup != targetGroup)
          this.tabView.moveTabTo(item.tab, targetGroup.id);

      } else if (targetItem.tab.pinned) {
        if (!item.tab.pinned)
          this.gBrowser.pinTab(item.tab);
      } else {
        // move to OrphanedGroup
        if (sourceGroup)
          sourceGroup.remove(item);
      }
      this.gBrowser.moveTabTo(item.tab, targetItem.tab._tPos);
      this.rows.splice(sourceIndex, 1);
      this.rows.splice(aTargetIndex, 0, item);
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

      if (item.group && item.group === this.tabView._window.GroupItems._activeGroupItem)
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
    return true;
  },
  isContainerEmpty: function PS_isContainerEmpty (aRow) {
    return !(this.rows[aRow+1] && this.rows[aRow+1].level > 0);
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

