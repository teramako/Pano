[English](http://teramako.github.com/Pano/)

#なんぞコレ？
Firefox 4のタブグループをリストする拡張機能だよん。

#キャプチャ画像
![sidebar](http://teramako.github.com/Pano/sidebar.png "Pano sidebar")
![PanoButton](http://teramako.github.com/Pano/pano-button-menu.png "Pano Button")
![tablist](http://teramako.github.com/Pano/all-tabs-list.png "All tabs list button")
![PanoPanel](http://teramako.github.com/Pano/pano-pane.png "Pano panel")

#使い方

 * メニューバー -> 表示 -> サイドバー -> Tab Group でサイドバーを開く
 * または、Ctrl + Alt + p (Mac OS では Cmd + Option + p)

##サイドバー

 * タブのアイテムをダブルクリックでタブ選択
   * about:config から `extensions.pano.swichTabBySingleClick` を `true` にすると、シングルクリックで選択可能
 * タブのアイテムを中ボタンクリックで閉じる
 * グループのアイテムをダブルクリックするとグループ名の編集
 * 一応ドラッグ&ドロップ可
 * フィルタ機能あり

##Panoボタン

 * サイドバーの開閉
 * メニューから他のグループへスイッチ

初期状態では「ツールバーのカスタマイズ」内にボタンがあるので、ドラッグ＆ドロップして使ってください。

##タブ一覧

 * タブ一覧を表示するボタン -> 他グループ から他のグループとそのタブの一覧がでるよ

##Panoパネル

 * 基本的にサイドバーと同じで、ツリー上のリストを表示します
 * ポップアップなのでサイドバーで幅を取られたくない場合などに使い道があるかと
 * Panoボタンと同様に「ツールバーのカスタマイズ」内にボタンがあります
 * Alt + p でポップアップさせることも可能 (Macでは Ctrl + p)
 * フィルタ機能あり

##フィルタ機能

 * サイドバーやパネルで使用可能
 * `*` がワイルドカード
 * `|` が OR 検索
 * フィルタリング中はドラッグ＆ドロップできません :(

##about:config

 * `extensions.pano.autoHideTabbar`:
   タブバーを隠すかどうかの設定(サイドバーが開いているときのみ有効)
 * `extensions.pano.showCloseButton`:
   閉じるボタンを表示するかどうかの設定
 * `extensions.pano.switchTabBySingleClick`:
   タブのアイテムをシングルクリックでスイッチするかどうかの設定

#License

Thease code are licensed under a disjunctive tri-license
giving you the choice of one of the three following sets of free software/open source licensing terms.

 * [MPL 1.1](http://www.mozilla.org/MPL/MPL-1.1.html "Mozilla Public License version 1.1")
 * [GPL 2.0](http://www.gnu.org/licenses/gpl-2.0.html "GNU General Public License version 2.0")
 * [LGPL 2.1](http://www.gnu.org/licenses/lgpl-2.1.html "GNU Lesser General Public License version 2.1")

