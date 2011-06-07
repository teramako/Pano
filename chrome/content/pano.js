
/**
 * @namespace
 */
var gPano = {
  createElement: function pano_createElement (aTagName, aAttributes) {
    var element = document.createElement(aTagName);
    for (let [name, value] in Iterator(aAttributes)) {
      element.setAttribute(name, value);
    }
    return element;
  },
  tabGroups: {
    createMenu: function pano_createMenu (aGroupItem) {
      var groupId = aGroupItem.id,
          label = aGroupItem.getTitle() || groupId;
      var menu = gPano.createElement("menu", {
        label: label,
      });
      menu.appendChild(gPano.createElement("menupopup", {
        value: groupId,
        onpopupshowing: "gPano.tabGroups.onPopupshowing(event);",
      }))
      return menu;
    },
    createMenuItem: function pano_createMenuItem (aTabItem) {
      return gPano.createElement("menuitem", {
        label: aTabItem.tab.label,
        image: aTabItem.tab.image,
        crop: aTabItem.tab.getAttribute("crop"),
        class: "menuitem-iconic alltabs-item menuitem-with-favicon",
        tPos: aTabItem.tab._tPos,
      });
    },
    selectTab: function pano_selectTab (aEvent) {
      aEvent.stopPropagation();
      var menuitem = aEvent.target;
      if (menuitem.localName == "menuitem" && menuitem.hasAttribute("tPos")) {
        let tPos = parseInt(menuitem.getAttribute("tPos"), 10);
        gBrowser.mTabContainer.selectedIndex = tPos;
      }
    },
    onPopupshowing: function pano_onPopupshowing (aEvent) {
      aEvent.stopPropagation();
      var popup = aEvent.target;
      var self = this;
      if (popup.id == "pano-alltabs-group-popup") {
        TabView._initFrame(function () {
          var GI = TabView._window.GroupItems;
          var currentGroup = GI.getActiveGroupItem();
          for (let [, group] in Iterator(GI.groupItems)) {
            if (group !== currentGroup)
              popup.appendChild(self.createMenu(group));
          }
          for (let [, tabItem] in Iterator(GI.getOrphanedTabs())) {
            if (!tabItem.tab.selected)
              popup.appendChild(self.createMenuItem(tabItem));
          }
        });
      }
      else if (popup.id == "pano-toolbarbutton-popup") {
        TabView._initFrame(function () {
          var GI = TabView._window.GroupItems;
          var currentGroup = GI.getActiveGroupItem();
          for (let [, group] in Iterator(GI.groupItems)) {
            if (group !== currentGroup) {
              popup.appendChild(gPano.createElement("menuitem", {
                label: group.getTitle() || group.id,
                value: group.id,
              }));
            }
          }
        });
      }
      else {
        let groupId = popup.getAttribute("value");
        TabView._initFrame(function () {
          var group = TabView._window.GroupItems.groupItem(groupId);
          for (let [, tabItem] in Iterator(group._children)) {
            popup.appendChild(self.createMenuItem(tabItem));
          }
        });
      }
    },
    onPopuphidden: function pano_onPopuphidden (aEvent) {
      aEvent.stopPropagation();
      var popup = aEvent.target;
      while (popup.hasChildNodes()) {
        popup.removeChild(popup.firstChild);
      }
    },
  },
  buttonmenu: {
    onSelect: function pano_onGroupMenuItemSelect (aEvent) {
      aEvent.stopPropagation();
      var menuitem = aEvent.target;
      if (menuitem.localName == "menuitem" && menuitem.hasAttribute("value")) {
        let gID = parseInt(menuitem.getAttribute("value"), 10);
        let group = TabView._window.GroupItems.groupItem(gID);
        if (group) {
          let tabItem = group.getActiveTab() || group.getChild(0);
          if (tabItem) {
            gBrowser.mTabContainer.selectedIndex = tabItem.tab._tPos;
          }
        }
      }
    },
  },
};

// vim: sw=2 ts=2 et fdm=marker:
