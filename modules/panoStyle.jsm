// vim: sw=2 ts=2 et ft=javascript:

"use strict";

const EXPORTED_SYMBOLS = [
  "PanoStyle",
];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

const SSS = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const cssType = SSS.AGENT_SHEET;

function makeURI (url) {
  if (url instanceof Ci.nsIFile)
    return Services.io.newFileURI(url);
  else if (url instanceof Ci.nsIURI)
    return url;
  else if (typeof url === "string") {
    return Services.io.newURI(url, null, null);
  }
}

var PanoStyle = {
  defaultCSS: "chrome://pano/skin/pano-tree-default.css",
  getCSSFile: function PS_getCSSFile () {
    var panoCSSFile = Services.dirsvc.get("ProfD", Ci.nsILocalFile);
    panoCSSFile.append("panoStyle.css");
    return panoCSSFile;
  },
  load: function PS_load (aCSS) {
    if (!aCSS)
      aCSS = this.getCSSFile();
    if ((aCSS instanceof Ci.nsIFile) && (!aCSS.exists() || !aCSS.isReadable()))
      return;

    var uri = makeURI(aCSS);
    SSS.loadAndRegisterSheet(uri, cssType);
  },
  unload: function PS_load (aCSS) {
    if (!aCSS)
      aCSS = this.getCSSFile();

    var uri = makeURI(aCSS);
    if (SSS.sheetRegistered(uri, cssType))
      SSS.unregisterSheet(uri, cssType);
  },
  read: function PS_read (aCSS, aCallback) {
    if (!aCSS)
      aCSS = this.getCSSFile();

    var uri = makeURI(aCSS);
    NetUtil.asyncFetch(uri, function asyncFetchCallback (aInputStream, aStatusCode, aRequest) {
      if (Components.isSuccessCode(aStatusCode)) {
        var cssString = NetUtil.readInputStreamToString(aInputStream, aInputStream.available());
        aCallback(cssString);
      } else {
        throw Error("Cannot read: " + uri.spec);
      }
    });
  },
  write: function PS_read (aFile, aCSS, aCallback) {
    if (!aFile)
      aFile = this.getCSSFile();

    var fs = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    var flags = 0x02 | 0x08 | 0x20;
    fs.init(aFile, flags, 420 /* 0644 */, fs.DEFER_OPEN);
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var input = converter.convertToInputStream(aCSS);

    var self = this;
    NetUtil.asyncCopy(input, fs, function asyncCopyCallback (aStatusCode) {
      if (!Components.isSuccessCode(aStatusCode))
        throw Error("Cannot write: " + aFile.path);

      self.unload(self.defaultCSS);
      self.unload(aFile);
      self.load(aFile);
      if (aCallback)
        aCallback(aStatusCode);
    });
  },
};

// vim: sw=2 ts=2 et:
