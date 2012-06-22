
var panel = document.getElementById("pano-pane"),
    button = document.getElementById("pano-pane-button"),
    tree = panel.getElementsByTagName("tree")[0],
    keyset = document.getElementById("panoKeySet"),
    view;

XPCOMUtils.defineLazyGetter(this, "toolbarContextMenu", function () {
  var container = {};
  Services.scriptloader.loadSubScript("chrome://pano/content/toolbarmenu.sub.js", container);
  return container;
});

function onPopupShowing (aEvent) {
  if (aEvent.target !== aEvent.currentTarget)
    return;

  if (view)
    return;

  TabView._initFrame(function() {
    tree.view = view = new PanoramaTreeView(window);
    onPopupShown();
  });
}
function onPopupShown (aEvent) {
  if (aEvent && aEvent.target !== aEvent.currentTarget)
    return;

  var count = tree.view.rowCount;
  if (count > 0) {
    let attrHeight = panel.hasAttribute("height") ? parseInt(panel.getAttribute("height"), 10) : 0;
    let panelHeight = (tree.treeBoxObject.rowHeight * (count + 1)) + panel.boxObject.height - tree.treeBoxObject.height;
    if (panelHeight > attrHeight) {
      panel.removeAttribute("height");
      panel.style.height = panelHeight + "px";
    }
  }
  if (keyset.hasAttribute("disabled"))
    keyset.removeAttribute("disabled");

  if (aEvent) {
    window.addEventListener("tabviewshown", onTabViewShown, false);
    window.addEventListener("click", onClick, true);
  }
}

function onPopupHiding (aEvent) {
  if (aEvent.target !== aEvent.currentTarget)
    return;

  keyset.setAttribute("disabled", "true");
  window.removeEventListener("tabviewshown", onTabViewShown, false);
  window.removeEventListener("click", onClick, true);
}

function toggleOpen () {
  switch (panel.state) {
  case "open":
    panel.hidePopup();
    break;
  case "closed":
    panel.openPopup(button, "bottomcenter topright");
    break;
  case "hiding":
  case "showing":
  default:
    break;
  }
};

function onTabViewShown () {
  if (panel.state === "open")
    panel.hidePopup();
}

function onClick (aEvent) {
  var position = panel.compareDocumentPosition(aEvent.target);
  if (position === 0 ||
      position === (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY) ||
      aEvent.target === panel.anchorNode) {
    return;
  } else if (aEvent.target instanceof XULElement) {
    switch (aEvent.target.localName) {
    case "splitmenu":
      if (aEvent.originalTarget.localName === "menu")
        return;

      break;
    case "button":
    case "toolbarbutton":
      if (aEvent.target.type !== "menu")
        break;
    case "menu":
      return;
    }
  }
  panel.hidePopup();
}

window.addEventListener("unload", function () {
  window.removeEventListener("unload", arguments.callee, false);
  if (view)
    view.destroy();
}, false);

// vim: sw=2 ts=2 et:
