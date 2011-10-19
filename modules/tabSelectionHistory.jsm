
var EXPORTED_SYMBOLS = [
  "TabSelectionHistory"
];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const cache = new WeakMap();

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Services", "resource://gre/modules/Services.jsm");

function TabSelectionHistory (aWindow) {
  if (cache.has(aWindow))
    return cache.get(aWindow);

  cache.set(aWindow, this);
  this.window = aWindow;
  this.mTabContainer = aWindow.gBrowser.mTabContainer;
  this.tabs = [this.mTabContainer.selectedItem];
  this.index = 0;
  this.mTabContainer.addEventListener("TabSelect", this, false);
  this.mTabContainer.addEventListener("TabClose", this, false);
  this.update();
}
TabSelectionHistory.prototype = {
  maxItems: -1,
  do: function TSH_do (aTab) {
    if (aTab.parentNode !== this.mTabContainer)
      throw TypeError("arguments 0 is not a child of the tabContainer");

    if (aTab === this.tabs[this.index])
      return;

    var i = this.index + 1,
        max = this.maxItems;

    this.tabs.splice(i, this.tabs.length - i, aTab);
    if (max > 0 && this.tabs.length > max)
      this.tabs.splice(max, this.tabs.length - max);

    this.index = this.tabs.length - 1;
    this.update();
  },
  goBack: function TSH_goBack () {
    if (!this.canGoBack)
      return;

    this.select(this.tabs[--this.index]);
  },
  goForward: function TSH_goForward () {
    if (!this.canGoForward)
      return;

    this.select(this.tabs[++this.index]);
  },
  clear: function TSH_clear () {
    this.tabs = [this.mTabContainer.selectedItem];
    this.index = 0;
  },
  select: function TSH_select (aTab) {
    if (aTab !== this.mTabContainer.selectedItem) {
      this.mTabContainer.__panoTransactioning__ = true;
      this.mTabContainer.selectedItem = aTab;
      this.update();
    }
  },
  get canGoBack () this.index > 0,
  get canGoForward () this.index < this.tabs.length - 1,
  handleEvent: function TSH_handleEvent (aEvent) {
    var tab = aEvent.target;
    switch (aEvent.type) {
    case "TabSelect":
      if (this.mTabContainer.__panoTransactioning__)
        delete this.mTabContainer.__panoTransactioning__;
      else
        this.do(tab);
      break;
    case "TabClose":
      let i;
      while ((i = this.tabs.indexOf(tab)) >= 0) {
        this.tabs.splice(i, 1);
        if (i <= this.index)
          --this.index;
      }
      this.update();
      break;
    }
  },
  update: function TSH_update () {
    Services.obs.notifyObservers(this.window, "pano-tab-selection-changed", JSON.stringify({
      canGoForward: this.canGoForward,
      canGoBack:    this.canGoBack
    }));
  },
};



