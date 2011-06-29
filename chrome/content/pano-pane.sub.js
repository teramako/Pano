
var panel = document.getElementById("pano-pane"),
    button = document.getElementById("pano-pane-button"),
    tree = panel.getElementsByTagName("tree")[0],
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

window.addEventListener("unload", function () {
  window.removeEventListener("unload", arguments.callee, false);
  if (view)
    view.destroy();
}, false);

// vim: sw=2 ts=2 et:
