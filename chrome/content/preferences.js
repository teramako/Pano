
Components.utils.import("resource://gre/modules/Services.jsm");

function openStyleEditor () {
  var win = Services.wm.getMostRecentWindow("Pano:StyleEditor");
  if (win) {
    win.focus();
  } else {
    // 設定ダイアログはモーダルウィンドウで普通にopenすると、
    // ダイアログを閉じるとスタイルエディタも閉じてしまう。
    // それを回避するために、Firefoxのウィンドウから開く
    let gWin = Services.wm.getMostRecentWindow("navigator:browser");
    gWin.open("chrome://pano/content/styleEditor.xul", "_blank", "chrome,dialog=no");
  }
}

