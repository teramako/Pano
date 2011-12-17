
Components.utils.import("resource://gre/modules/Services.jsm");

function openCSSEditor () {
  var win = Services.wm.getMostRecentWindow("Pano:CSSEditor");
  if (win) {
    win.focus();
  } else {
    // 設定ダイアログはモーダルウィンドウで普通にopenすると、
    // ダイアログを閉じるとスタイルエディタも閉じてしまう。
    // それを回避するために、Firefoxのウィンドウから開く
    let gWin = Services.wm.getMostRecentWindow("navigator:browser");
    gWin.open("chrome://pano/content/cssEditor.xul", "_blank", "chrome,dialog=no");
  }
}

