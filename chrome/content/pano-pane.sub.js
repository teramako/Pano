
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
XPCOMUtils.defineLazyGetter(this, "resizerLeft", function () {
  return document.getElementById("panoPanelLeft");
});
XPCOMUtils.defineLazyGetter(this, "resizerRight", function () {
  return document.getElementById("panoPanelRight");
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
  if (window.screenX + window.outerWidth / 2 > panel.anchorNode.boxObject.screenX) {
    resizerLeft.style.visibility = "collapse";
    resizerRight.style.visibility = "";
  } else {
    resizerLeft.style.visibility= "";
    resizerRight.style.visibility = "collapse";
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

/**
 * @see "lightweight-theme-styling-update" observer in pano-tree.sub.js
 */
function updatePanelTheme (aData) {
  if (!aData)
    aData =  { headerURL: "", footerURL: "", textcolor: "", accentcolor: "" };

  var elem = document.getAnonymousElementByAttribute(panel, "class", "panel-arrowcontent");
  var active = !!aData.headerURL;
  if (active) {
    elem.style.backgroundColor = aData.accentcolor || "white";
    let bgStyle = [aData.headerURL, aData.footerURL].map(function(url) {
      return url ? 'url("' + url.replace(/"/g, '\\"') + '")' : null;
    });
    elem.style.backgroundImage = bgStyle[1] ? bgStyle.join(", ") : bgStyle[0];
  } else {
    elem.style.backgroundColor = "";
    elem.style.backgroundImage = "";
  }
}

window.addEventListener("unload", function () {
  window.removeEventListener("unload", arguments.callee, false);
  if (view)
    view.destroy();
}, false);

// vim: sw=2 ts=2 et:
