
"use strict";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/source-editor.jsm");
Cu.import("resource://pano/panoStyle.jsm");

var Pad = {
  editor: null,
  onLoad: function Pad_onLoad (aEvent) {
    if (aEvent.target != document)
      return;

    var cssFile = PanoStyle.getCSSFile();

    if (cssFile.exists() && cssFile.isReadable()) {
      PanoStyle.read(cssFile, this.loadContent.bind(this));
    } else {
      PanoStyle.read(PanoStyle.defaultCSS, this.loadContent.bind(this));
    }
  },
  loadContent: function Pad_loadContent (aContent) {
    var editorContainer = document.getElementById("css-editor");

    this.editor = new SourceEditor();
    this.editor.init(editorContainer, {
      mode: SourceEditor.MODES.CSS,
      undoLimit: SourceEditor.DEFAULTS.UNDO_LIMIT,
      expandTab: SourceEditor.DEFAULTS.EXPAND_TAB,
      tabSize: 2,
      showLineNumbers: true,
      placeholderText: aContent,
    }, this.onEditorLoad.bind(this));
  },
  onEditorLoad: function Pad_onEditorLoad() {
    this.editor.addEventListener(SourceEditor.EVENTS.CONTEXT_MENU, this.onContextMenu);
    this.editor.focus();
    this.editor.setCaretOffset(this.editor.getCharCount());
  },
  onContextMenu: function Pad_onContextMenu (aEvent) {
    let menu = document.getElementById("se-text-popup");
    if (menu.state === "closed")
      menu.openPopupAtScreen(aEvent.screenX, aEvent.screenY, true);
  },
  saveFile: function Pad_saveFile () {
    var self = this;
    PanoStyle.write(null, this.editor.getText(), function(){
      self.setStatusLabel("Saved File (" + (new Date).toLocaleTimeString() + ")");
    });
  },
  reset: function Pad_reset () {
    var self = this;
    PanoStyle.read(PanoStyle.defaultCSS, function resetContent(aContent) {
      self.editor.setText(aContent);
      PanoStyle.write(null, aContent);
      self.setStatusLabel("Restored default style.");
    });
  },
  setStatusLabel: let (timeoutId) function Pad_setStatusLabel (aMessage) {
    if (timeoutId)
      clearTimeout(timeoutId);

    var status = document.getElementById("se-status");
    status.label = aMessage;
    timeoutId = setTimeout(function statusTimeout() {
      timeoutId = null;
      status.label = "";
    }, 10 * 1000);
  },
  openTab: function Pad_openTab (url) {
    var win = Services.wm.getMostRecentWindow("navigator:browser");
    if (!win)
      return;

    win.gBrowser.loadOneTab(url, { inBackground: false });
    win.focus();
  },
  onEditPopupShowing: function Pad_onEditPopupShowing () {
    var undo = document.getElementById("se-cmd-undo");
    undo.setAttribute("disabled", !this.editor.canUndo());

    var redo = document.getElementById("se-cmd-redo");
    redo.setAttribute("disabled", !this.editor.canRedo());
  },
  onUnload: function Pad_onUnload (aEvent) {
    if (aEvent.target != document)
      return;

    this.editor.removeEventListener(SourceEditor.EVENTS.CONTEXT_MENU, this.onContextMenu);
    this.editor.destroy();
    this.editor = null;
  }
};

addEventListener("DOMContentLoaded", Pad.onLoad.bind(Pad), false);
addEventListener("unload", Pad.onUnload.bind(Pad), false);


// vim: sw=2 ts=2 et:
