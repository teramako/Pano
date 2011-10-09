
var toolbox = document.getElementById("panoToolBox");

XPCOMUtils.defineLazyGetter(this, "customizeCommand", function () {
  return document.getElementById("panoCmdCustomizeToolbars");
});

toolbox.customizeDone = toolbarCustomizeDone;

function onPopupShowing (aEvent) {
  var popup = aEvent.target;
  if (popup !== aEvent.currentTarget)
    return;

  for (let i = popup.childNodes.length - 1; i >= 0; --i) {
    let deadItem = popup.childNodes[i];
    if (deadItem.hasAttribute("toolbarId"))
      popup.removeChild(deadItem);
  }

  var firstMenuItem = popup.firstChild;
  Array.slice(toolbox.childNodes).concat(toolbox.externalToolbars).forEach(function (toolbar) {
    var toolbarName = toolbar.getAttribute("toolbarname");
    if (toolbarName) {
      let menuItem = createMenuItem(toolbar, toolbarName);
      popup.insertBefore(menuItem, firstMenuItem);
    }
  }, this);
}

function createMenuItem (aToolbar, aLabel) {
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("id", "toggle_" + aToolbar.id);
  menuItem.setAttribute("toolbarId", aToolbar.id);
  menuItem.setAttribute("type", "checkbox");
  menuItem.setAttribute("label", aLabel);
  menuItem.setAttribute("checked", !aToolbar.collapsed);
  return menuItem;
}


function onCommand (aEvent) {
  var node = aEvent.target;
  if (node.hasAttribute("toolbarId")) {
    aEvent.stopPropagation();
    let toolbarId = node.getAttribute("toolbarId");
    let toolbar = document.getElementById(toolbarId);
    let isVisible = node.getAttribute("checked") === "true";
    toolbar.setAttribute("collapsed", !isVisible);
    document.persist(toolbarId, "collapsed");
  }
}

function customizeToolbar (aEvent) {
  aEvent.stopPropagation();

  customizeCommand.setAttribute("disabled", "true");

  return window.openDialog("chrome://global/content/customizeToolbar.xul",
                           "CustomizeToolbar",
                           "chrome,titlebar,location,resizable,dependent",
                           toolbox);
}

function toolbarCustomizeDone (aToolboxChanged) {
  customizeCommand.removeAttribute("disabled");
}

