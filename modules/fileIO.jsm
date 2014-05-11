// vim: sw=2 ts=2 et ft=javascript:

const EXPORTED_SYMBOLS = ["FileIO"];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

const nsFilePicker = Ci.nsIFilePicker;

var FileIO = {
  /** showPicker () {{{1
   * @param {Window} aWindow
   * @param {Number} aMode
   *                  0: modeOpen,
   *                  1: modeSave,
   *                  2: modeGetFolder,
   *                  3: modeOpenMultiple
   * @param {Object} aParams
   * @param {nsIFile} aParams.dir
   * @param {String}  aParams.title
   * @param {Array}   aParams.filters
   * @param {String}  aParams.extension
   * @param {String}  aParams.fileName
   *
   * @return {Array} [0: status, 1: file|null]
   */
  showPicker: function FileIO_showPicker (aWindow, aMode, aParams) {
    if (!aWindow)
      throw TypeError("Window must be specified");

    if (!aParams)
      aParams = {};

    var title;
    switch (aMode) {
      case nsFilePicker.modeOpen:
        title = aParams.title || "Select a file"; break;
      case nsFilePicker.modeSave:
        title = aParams.title || "Save a file"; break;
      case nsFilePicker.modeGetFolder:
        title = aParams.title || "Get a folder"; break;
      case nsFilePicker.modeOpenMultiple:
        title = aParams.title || "Select files"; break;
      default:
        throw TypeError("Wrong FilePicker mode: " + aMode);
    }
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsFilePicker);
    fp.init(aWindow, title, aMode);
    if (aParams.dir && aParams.dir instanceof Ci.nsIFile) {
      let dir = aParams.dir;
      if (dir.exists()) {
        if (!dir.isDirectory())
          dir = dir.parent;

        fp.displayDirectory = dir;
      }
    }
    if (aParams.filters && aParams.filters.length > 0) {
      aParams.filters.forEach(function (filter) {
        if (typeof filter === "number") {
          fp.appendFilters(filter);
        } else if (Array.isArray(filter)) {
          fp.appendFilter(filter[0], filter[1]);
        }
      });
    }
    fp.appendFilters(nsFilePicker.filterText | nsFilePicker.filterAll);
    if (aParams.extension)
      fp.defaultExtension = aParams.extension;

    if (aParams.fileName)
      fp.defaultString = aParams.fileName;

    var res = fp.show();
    switch (res) {
      case nsFilePicker.returnOK:
      case nsFilePicker.returnReplace:
        if (aMode === nsFilePicker.modeOpenMultiple)
          return [res, fp.files];
        else
          return [res, fp.file];
    }
    return [res, null];
  }, // 1}}}
  /** asyncWrite () {{{1
   * write {aData} to {aFile} asynchronous
   * @param {nsIFile} aFile
   * @param {String} aText
   * @param {Function} [aCallback]
   * @param {Object} [aContext]
   */
  asyncWrite: function FileIO_asyncWrite (aFile, aText, aCallback, aContext) {
    if (!aFile || !aText)
      return;
    var fs = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    var flags = 0x02 | 0x08 | 0x20;
    fs.init(aFile, flags, 420 /* 0644 */, fs.DEFER_OPEN);
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var input = converter.convertToInputStream(aText);

    NetUtil.asyncCopy(input, fs, function asyncCopyCallback (aStatusCode) {
      if (!Components.isSuccessCode(aStatusCode))
        throw Error("Cannot write: " + aFile.path);

      if (aCallback)
        aCallback.call(aContext, aFile);
    });
  }, // 1}}}
  /** asyncRead () {{{1
   * read {aFile} asynchronous
   * @param {nsIFile} aFile
   * @param {Function} aCallback
   * @param {Object} [aContext]
   */
  asyncRead: function FileIO_asycRead (aFile, aCallback, aContext) {
    if (!aFile || !aCallback)
      return;

    NetUtil.asyncFetch(aFile, function asyncFetchCallback (aInputStream, aStatusCode, aRequest) {
      if (Components.isSuccessCode(aStatusCode)) {
        var is = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
        is.init(aInputStream, "UTF-8", 4096, 0xFFFD);
        try {
          var buffer = [];
          var str = {};
          while (is.readString(4096, str) != 0)
            buffer.push(str.value);

          aCallback.call(aContext, buffer.join(""));
        } catch(e) {
          Cu.reportError(e);
        } finally {
          is.close();
          aInputStream.close();
        }

      } else {
        throw Error("Cannot read: " + uri.spec);
      }
    });
  }, // 1}}}
};

