Changelog
=========

##version 0.9
 * LessChrome HD と「タブバーを隠す」設定の互換性を向上
 * ツリーに閉じるボタンを追加
   * about:config `extensions.pano.showCloseButton` で設定可
 * `extensions.pano.swichTabBySingleClick` のタイポ修正
   -> `extensions.pano.switchTabBySingleClick`
 * オプションダイアログの追加
 * [#26 ページ内リンク等をツリー上にD&Dして開く機能](https://github.com/teramako/Pano/issues/26)
   * ブックマークやブックマークフォルダ、ページ内のリンクをツリーにドロップできるようにした
   * アクティブなグループ内へドロップした場合、バックグランドで開かれるかどうかは`browser.tabs.loadInBackground`に依存
   * アクティブでないグループ内へのドロップではバックグラウンドで開く
   * 複数を開く場合、数が`browser.tabs.maxOpenBeforeWarn`以上である場合、プロンプトがポップアップするようにした
   * バックグラウンドで開かれるタブはロードせず、アクティブになった時にロードされるようにした
   * パネルの挙動を変更し、メニューが開かれるときは閉じないようにした
 * [#29 Panoパネルからタブを切り替えた時にパネルを自動的に閉じる機能](https://github.com/teramako/Pano/issues/29)
   * about:config の値 `extensions.pano.panel.autoCloseByTabSelect` を追加した
 * BugFix: [#27 アクティブなアブを含む複数のタブをドロップした時、コンテンツのロードが発生する](https://github.com/teramako/Pano/issues/27)
   * アクティブなタブは他を移動し終わった後に移動するように変更

##version 0.8 (2011-08-28)

 * Firefox 9.0a1 をサポート対象に追加
 * [#19: タブバーを隠す機能を追加](https://github.com/teramako/Pano/issues/19)
   * サイドバーが開いているときのみ
   * サイドバー下部のチェックボックスから設定可能
 * [#21: ダブルクリックではなく1クリックでタブにスイッチ](https://github.com/teramako/Pano/issues/21)
   * about:config の `extensions.pano.swichTabBySingleClick` を `true` に設定すると可能
 * [#22: 中ボタンクリックでタブを閉じる機能](https://github.com/teramako/Pano/issues/22)
 * BugFix: [#24: Panoパネル・ボタンによるトグル開閉](https://github.com/teramako/Pano/issues/24)
   * Panoパネルのボタンをクリックした時、既に開いている時は閉じるように修正
 * BugFix: [#25: アクティブグループの最後のタブを閉じた時の挙動](https://github.com/teramako/Pano/issues/25)
   * Panoramaのビューが開いたとき、Panoパネルが開いていたら閉じるように修正

##version 0.7 (2011-07-29)

 * バグ修正
   * [#13: Can't drop tabs to the AppTabsGroup](https://github.com/teramako/Pano/issues/13)
   * [#15: 非アクティブグループのタブを閉じた後の不整合](https://github.com/teramako/Pano/issues/15)
   * [#17: Auroraで動作しなかった不具合](https://github.com/teramako/Pano/issues/17)
   * [#18: 「他のパソコンで開いていたタブ」項目が増殖する](https://github.com/teramako/Pano/issues/18)
 * コンテキストメニュー
   * [#14: "Close all selected" in the context menu](https://github.com/teramako/Pano/issues/14)
   * [#16: 「新しいタブを開く」メニューの追加](https://github.com/teramako/Pano/issues/16)

##version 0.6 (2011-07-07)

 * 主にバグ修正 [#7](https://github.com/teramako/Pano/issues/7) [#8](https://github.com/teramako/Pano/issues/8)
   [#9](https://github.com/teramako/Pano/issues/9) etc...
 * [Firefox 8.0a1 対応](https://github.com/teramako/Pano/issues?state=closed&page=1&milestone=3)

##version 0.5

 * サイドバーとパネルタブにフィルタ機能(検索ボックス)を追加
   * `*` がワイルドカード
   * `|` が OR 検索
   * なお、フィルタリング中はドラッグ＆ドロップできません
 * ポップアップパネルでツリー表示をするボタンを追加
   * ボタンは「ツールバーのカスタマイズ」にある
   * アクセスキーは Alt + p

##version 0.4

 * グループが閉じられた時、サイドバーのツリーからグループを削除するようにした
 * サイドバーのキーボードナビゲーション
   * _ENTER_: タブの選択
   * _F2_: グループの編集
 * サイドバーにコンテキストメニューを追加
   * 新しいグループ
   * タブやタブグループを閉じる
   * サイドバーを閉じる
 * Panoボタンをメニューボタンに変更
   * メニューにタブグループを表示
 * サイドバーのDrag&Dropを改良
   * 複数のタブをDrag可能に（グループは不可）
   * 1グループをDrag可能に
 * [サイドバーのツリーの開閉状態を保存するようにした](https://github.com/teramako/Pano/issues/2)
 * Bug fix
   * https://github.com/teramako/Pano/issues/1
 
##version 0.3

 * サイドバーの開閉をするボタンを追加（ツールバーのカスタマイズから追加可能）
 * サイドバーの開閉するショートカットを追加
   * Windows, Linux: Ctrl + Alt + p
   * Mac OS X: Cmd + Option + p
 * サイドバーのツリーでグループの開閉をできるようにした

##version 0.2

 * タブ一覧メニューに他グループのタブを選択できるようなメニューを追加
 * アドオンアイコン追加

##version 0.1

 * 新規リリース（α版）

