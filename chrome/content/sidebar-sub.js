/**
 * load from sidebar.js
 * @namespace gSubFrame
 */

var menuPopup = document.getElementById("subFrameMenuPopup"),
    splitter = document.getElementById("subFrameSplitter"),
    sidebarMenu = gWin.document.getElementById("viewSidebarMenu");

function appendItem (item) {
  if (!item.label || !item.url)
    return;

  var menuitem = document.createElement("menuitem");
  menuitem.setAttribute("label", item.label);
  menuitem.setAttribute("value", item.url);
  this.appendChild(menuitem);
}

function clearContents (node) {
  var range = document.createRange();
  range.selectNodeContents(node);
  range.deleteContents();
  range.detach();
}

function onPopupShowing (aEvent) {
  var popup = aEvent.target;
  clearContents(popup);

  // -----------------------------
  // set Sidebar Menu Items
  // -----------------------------
  Array.forEach(sidebarMenu.children, function (item) {
    if (item.id === "menu_panoramaSidebar")
      return;

    var label = "", src = "";
    if (item.hasAttribute("sidbartitle"))
      label = item.getAttribute("sidebartitle");
    else if (item.hasAttribute("label"))
      label = item.getAttribute("label");
    else
      return;

    if (item.hasAttribute("sidebarurl")) {
      src = item.getAttribute("sidebarurl");
      appendItem.call(popup, { label: label, url: src});
    }
  });
  // -----------------------------
  // set Extra Menu Items
  // -----------------------------
  var branch = Services.prefs.getBranch("extensions.pano.subframe.");
  branch.getChildList("").reduce(function(items, branchName) {
    var m = branchName.match(/^item(\d+)\.(label|url)$/);
    if (m) {
      let num = parseInt(m[1], 10) - 1;
      if (!(num in items))
        items[num] = {};

      items[num][m[2]] = branch.getComplexValue(branchName, Ci.nsISupportsString).data;
    }
    return items;
  }, []).forEach(appendItem, popup);
}

function onMenuCommand (aEvent) {
  aEvent.stopPropagation();
  var elm = aEvent.target;
  open(elm.label, elm.value);
}

function open (label, src) {
  document.getElementById("subFrameBrowser").setAttribute("src", src);
  document.getElementById("subFrameLabel").value = label;
  splitter.setAttribute("state", "open");
}

function close () {
  splitter.setAttribute("state", "collapsed");
  document.getElementById("subFrameBrowser").setAttribute("src", "about:blank");
}


