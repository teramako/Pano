function createElement (aTagName, aAttributes) {
  var element = document.createElement(aTagName);
  for (let [name, value] in Iterator(aAttributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

function createMenu (aGroupItem) {
  var groupId = aGroupItem.id,
      label = aGroupItem.getTitle() || groupId;
  var menu = createElement("menu", {
    label: label,
  });
  menu.appendChild(createElement("menupopup", {
    value: groupId,
    onpopupshowing: "gPano.tabGroups.onPopupShowing(event);",
  }))
  return menu;
};
function createMenuItem (aTabItem) {
  return createElement("menuitem", {
    label: aTabItem.tab.label,
    image: aTabItem.tab.image,
    crop: aTabItem.tab.getAttribute("crop"),
    class: "menuitem-iconic alltabs-item menuitem-with-favicon",
    tPos: aTabItem.tab._tPos,
  });
};

function selectTab (aEvent) {
  aEvent.stopPropagation();
  var menuitem = aEvent.target;
  if (menuitem.localName === "menuitem" && menuitem.hasAttribute("tPos")) {
    let tPos = parseInt(menuitem.getAttribute("tPos"), 10);
    gBrowser.mTabContainer.selectedIndex = tPos;
  }
};

function selectGroup (aEvent) {
  aEvent.stopPropagation();
  var menuitem = aEvent.target;
  if (menuitem.localName === "menuitem" && menuitem.hasAttribute("value")) {
    let gID = menuitem.getAttribute("value");
    let group = TabView._window.GroupItems.groupItem(gID);
    if (group) {
      let tabItem = group.getActiveTab() || group.getChild(0);
      if (tabItem) {
        gBrowser.mTabContainer.selectedIndex = tabItem.tab._tPos;
      }
    }
  }
}

function onPopupShowing (aEvent) {
  var popup = aEvent.target;
  if (popup.id === "alltabs-popup")
    return;

  aEvent.stopPropagation();
  if (popup.id === "pano-alltabs-group-popup") {
    TabView._initFrame(function () {
      var GI = TabView._window.GroupItems;
      var currentGroup = GI.getActiveGroupItem();
      for (let [, group] in Iterator(GI.groupItems)) {
        if (group !== currentGroup)
          popup.appendChild(createMenu(group));
      }
    });
  }
  else if (popup.id === "pano-toolbarbutton-popup") {
    TabView._initFrame(function () {
      var GI = TabView._window.GroupItems;
      var currentGroup = GI.getActiveGroupItem();
      for (let [, group] in Iterator(GI.groupItems)) {
        if (group !== currentGroup) {
          popup.appendChild(createElement("menuitem", {
            label: group.getTitle() || group.id,
            value: group.id,
          }));
        }
      }
    });
  }
  else if (popup.parentNode.parentNode.id === "pano-alltabs-group-popup") {
    let groupId = popup.getAttribute("value");
    TabView._initFrame(function () {
      var group = TabView._window.GroupItems.groupItem(groupId);
      for (let [, tabItem] in Iterator(group._children)) {
        popup.appendChild(createMenuItem(tabItem));
      }
    });
  }
};

function onPopupHidden (aEvent) {
  aEvent.stopPropagation();
  var popup = aEvent.target;
  while (popup.hasChildNodes()) {
    popup.removeChild(popup.firstChild);
  }
};

// vim: sw=2 ts=2 et:
