

function onDragStart (aEvent) {
  PanoramaTreeView.onDragStart(aEvent, view);
}

function selectTab (aEvent) {
  var index = view.selection.currentIndex;
  if (index == -1)
    return;

  var item = view.rows[index];
  if (item.type & TAB_ITEM_TYPE) {
    if (aEvent) {
      aEvent.preventDefault();
      aEvent.stopPropagation();
    }
    if (!item.tab.pinned) {
      let tabItem = item.tab._tabViewTabItem;
      let UI = view.tabView._window.UI;
      if (UI.setActiveTab) {
        UI.setActiveTab(tabItem);
        view.GI.setActiveGroupItem(tabItem.parent);
      } else if (UI.setActive) {
        UI.setActive(tabItem);
      }
    }
    gBrowser.mTabContainer.selectedIndex = item.tab._tPos;
  }
}

function newGroup () {
  view.GI.newGroup().newTab();
}

function setFilter (aString) {
  view.setFilter(aString ? aString : null);
}

var tooltip = {
  get titleElm () {
    var elm = document.getElementById("panoTreeTooltipTitle");
    delete this.titleElm;
    return this.titleElm = elm;
  },
  get urlElm () {
    var elm = document.getElementById("panoTreeTooltipURL");
    delete this.urlElm;
    return this.urlElm = elm;
  },
  get imageElm () {
    var elm = document.getElementById("panoTreeTooltipImage");
    delete this.imageElm;
    return this.imageElm = elm;
  },
  build: function buildTooltip (aEvent) {
    aEvent.stopPropagation();
    var item = view.getItemFromEvent(aEvent);
    if (!item || !(item.type & TAB_ITEM_TYPE)) {
      aEvent.preventDefault();
      return;
    }

    this.titleElm.setAttribute("value", item.title);
    this.urlElm.setAttribute("value", item.url);
    this.imageElm.classList.remove("hide");
    var browser = item.tab.linkedBrowser;
    if (browser.__SS_restoreState) {
      if (item.tab._tabViewTabItem)
        document.mozSetImageElement("panoTabCapture", item.tab._tabViewTabItem.$cachedThumb[0]);
      else
        this.imageElm.classList.add("hide");
    } else {
      document.mozSetImageElement("panoTabCapture", browser);
    }
  },
};

var contextMenu = {
  get groupCloseElm () {
    var elm = document.getElementById("panoContextMenu_groupClose");
    delete this.groupCloseElm;
    return this.groupCloseElm = elm;
  },
  get tabCloseElm () {
    var elm = document.getElementById("panoContextMenu_tabClose");
    delete this.tabCloseElm;
    return this.tabCloseElm= elm;
  },
  currentItem: null,
  build: function buildContextMenu (aEvent) {
    var item = this.currentItem = view.getItemFromEvent(aEvent);
    if (item) {
      let isTabItem = (item.type & TAB_ITEM_TYPE) > 0;
      let isNormalGroup = item.type == TAB_GROUP_TYPE;
      this.showItem("groupCloseElm",isNormalGroup);
      this.showItem("tabCloseElm", isTabItem);
    } else {
      this.showItem("groupCloseElm", false);
      this.showItem("tabCloseElm", false);
    }
  },
  showItem: function showMenuItem (aID, aShow) {
    this[aID].hidden = !aShow;
  },
  onPopupHiding: function onContextMenuHidden () {
    this.currentItem = null;
  },
  closeItem: function PT_closeItemFromContextMenu () {
    var item = this.currentItem;
    if (!item)
      return;

    var isTabItem = (item.type & TAB_ITEM_TYPE) > 0;
    var selectedItems = view.getSelectedItems();
    if (isTabItem) {
      selectedItems.forEach(function (item) {
        if (item.type & TAB_ITEM_TYPE)
          gBrowser.removeTab(item.tab);
      });
    } else if (item.type == TAB_GROUP_TYPE) {
      selectedItems.forEach(function (item) {
        if (item.type == TAB_GROUP_TYPE) {
          let childTabs = item.group._children.map(function(tabItem) tabItem.tab);
          childTabs.forEach(function(tab) gBrowser.removeTab(tab));
          item.group.close({ immediately: true });
        }
      });
    }
  },
};

// vim: sw=2 ts=2 et:
