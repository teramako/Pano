
var panel = document.getElementById("pano-pane"),
    button = document.getElementById("pano-pane-button"),
    tree = panel.getElementsByTagName("tree")[0],
    keyset = document.getElementById("panoKeySet"),
    view;

function onPopupShowing (aEvent) {
  if (view)
    return;

  TabView._initFrame(function() {
    tree.view = view = new PanoramaTreeView(window);
    onPopupShown();
  });
}
function onPopupShown () {
  var count = tree.view.rowCount;
  if (count > 0) {
    let y = {}, h = {};
    tree.treeBoxObject.getCoordsForCellItem(count - 1, tree.columns[0], "cell", {}, y, {}, h);
    tree.style.height = (y.value + h.value + 20) + "px";
  }
  if (keyset.hasAttribute("disabled"))
    keyset.removeAttribute("disabled");

  window.addEventListener("tabviewshown", onTabViewShown, false);
}

function onPopupHiding () {
  keyset.setAttribute("disabled", "true");
  window.removeEventListener("tabviewshown", onTabViewShown, false);
}

function toggleOpen () {
  panel.popupBoxObject.setConsumeRollupEvent(Ci.nsIPopupBoxObject.ROLLUP_CONSUME);
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

window.addEventListener("unload", function () {
  window.removeEventListener("unload", arguments.callee, false);
  if (view)
    view.destroy();
}, false);

// vim: sw=2 ts=2 et:
