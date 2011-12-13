
const SSS = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

var toolbarXML = null;

function PanoToolbar(win) {
  this.window = win;
  this.init();
}
PanoToolbar.prototype = {
  constructor: PanoToolbar,
  init: function PT_init () {
    var doc = this.window.document;
    var gNaviToolbox = doc.getElementById("navigator-toolbox");
    var range = doc.createRange();
    range.selectNodeContents(gNaviToolbox);
    range.collapse(false);
    var toolbar = range.createContextualFragment(toolbarXML);
    range.insertNode(toolbar);
    range.detach();
  },
  uninit: function PT_uninit () {
    var doc = this.window.document;
    var toolbar = doc.getElementById("PanoTabGroupToolbar");
    if (toolbar) {
      toolbar.parentNode.removeChild(toolbar);
    }
  },
};

function initWindow (aWindow) {
  aWindow.gPanoToolbar = new PanoToolbar(aWindow);
}

var windowObserver = {
  observe: function observeWindow (aSubject, aTopic, aData) {
    var win = aSubject.QueryInterface(Ci.nsIDOMWindow);
    if (aTopic === "domwindowopened") {
      //win.addEventListener("DOMContentLoaded", function PT_onDOMContentLoaded (aEvent) {
      win.addEventListener("load", function PT_onDOMContentLoaded (aEvent) {
        win.removeEventListener(aEvent.type, PT_onDOMContentLoaded, false);
        if (win.location.href === "chrome://browser/content/browser.xul")
          initWindow(win);
      }, false);
    }
  },
  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsISupports) ||
        aIID.equals(Ci.nsIObserver))
      return this;

    throw Cr.NS_ERROR_NO_INTERFACE;
  }
};

function getWindows (type) {
  if (!type)
    type = "navigator:browser";

  var windows = Services.wm.getEnumerator(type);
  while (windows.hasMoreElements()) {
    yield windows.getNext().QueryInterface(Ci.nsIDOMWindow);
  }
}

(function init () {
  SSS.loadAndRegisterSheet(Services.io.newURI("chrome://pano-toolbar/skin/pano-toolbar.css", null, null),
                           SSS.AGENT_SHEET);

  var bundle = Services.strings.createBundle("chrome://pano-toolbar/locale/toolbar.properties")

  var xmlSettings = XML.settings();
  XML.ignoreWhitespace = true;
  XML.prettyPrinting = false;
  toolbarXML =
  <toolbar id="PanoTabGroupToolbar"
           class="toolbar-primary chromeclass-toolbar"
           toolbarname={bundle.GetStringFromName("toolbarname")}
           mode="icons"
           defaulticonsize="small"
           defaultset=""
           costomizable="true"
           context="toolbar-context-menu"
           xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">
    <tabs id="PanoTabGroupTabs" flex="1" setfocus="false">
      <tab class="pano-tabgroup-tab"/>
    </tabs>
  </toolbar>.toXMLString();
  XML.setSettings(xmlSettings);

  for (let win in Iterator(getWindows())) {
    initWindow(win);
  }
  Services.ww.registerNotification(windowObserver);

  Services.console.logStringMessage("Pano Toolbar startup");
})();


function destory () {
  SSS.unregisterSheet(Services.io.newURI("chrome://pano-toolbar/skin/pano-toolbar.css", null, null),
                      SSS.AGENT_SHEET);
  Services.ww.unregisterNotification(windowObserver);

  for (let win in Iterator(getWindows())) {
    if (win.gPanoToolbar) {
      win.gPanoToolbar.uninit();
      delete win.gPanoToolbar;
    }
  }
  Services.console.logStringMessage("Pano Toolbar shutdown");
}


