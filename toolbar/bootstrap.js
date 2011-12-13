
const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm } = Components;

Cu.import("resource://gre/modules/Services.jsm");

var PANO_TOOLBAR = null;

function install (aData, aReason) {
  Services.console.logStringMessage("PanoToolbar: installed");
}
function startup (aData, aReason) {
  if (Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0)
    Cm.addBootstrappedManifestLocation(aData.installPath);

  PANO_TOOLBAR = {};
  Services.scriptloader.loadSubScript("chrome://pano-toolbar/content/pano-toolbar.js", PANO_TOOLBAR);
}
function shutdown (aData, aReasoon) {
  if (Services.vc.compare(Services.appinfo.platformVersion, "10.0") < 0)
    Cm.removeBootstrappedManifestLocation(aData.installPath);

  if (PANO_TOOLBAR.destory) {
    PANO_TOOLBAR.destory();
  }
  PANO_TOOLBAR = null;
}
function uninstall (aData, aReason) {
  Services.console.logStringMessage("PanoToolbar: uninstalled");
}

