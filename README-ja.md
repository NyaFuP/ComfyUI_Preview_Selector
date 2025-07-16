# NF Preview Selector

ComfyUI用のフローティングダイアログベースの画像プレビューおよび選択システムです。

## 機能

- **フローティングダイアログ**: 邪魔にならないダイアログウィンドウ
- **ラッグ＆ドロップによる位置調整**: プレビューウィンドウを画面上の任意の場所に移動
- **複数選択**: 画像をクリックして複数の画像を選択/選択解除
- **タイムアウト機能**: カウントダウン表示付きの設定可能なタイムアウト
- **複数のモード**: レビューモード、パススルー、最初の画像/最後の画像
- **Latent画像対応**: Latent画像の入出力に対応
- **メモリー機能**: ダイアログの表示位置/サイズを記憶

## 使い方

1. 「NF Preview Selector」ノードをワークフローに追加
2. 画像入力（必要な場合Latent入力）を接続
3. モードを選択：
   - **review_and_select**: フローティングダイアログを開き、手動で選択
   - **pass_through**: すべての画像をレビューせずに通過させる
   - **take_first**: 最初の画像を自動的に選択
   - **take_last**: 最後の画像を自動的に選択
4. タイムアウト時間を設定 (10-300秒)

  <img width="284" height="517" alt="Main node" src="https://github.com/user-attachments/assets/0509c1d4-bb15-4f46-b924-383fd63981cb" />

## ダイアログインターフェース

review_and_selectモードを選んだ場合、フローティングダイアログが表示され、以下の情報が表示されます：
- グリッド表示されたプレビュー画像
- 画像をクリックすることで選択／選択解除（数字の色が緑で選択中）
- 選択枚数
- タイムアウトまでのカウントダウン
- 確定(Confirm)/キャンセル(Cancel)ボタン

  <img width="316" height="528" alt="Dialog Interface" src="https://github.com/user-attachments/assets/e2bc576e-5e66-4735-beb0-2742a8a0d419" />

## 設定

ComfyUIの設定メニューからアクセス：
- **Dialog maximum width**: ダイアログの最大幅をピクセル単位で指定します。（最大 1800px）
- **Remember window position**: ONで最後のダイアログ位置とサイズを記憶します。

<img width="544" height="121" alt="Settings" src="https://github.com/user-attachments/assets/105277be-b16d-4d66-b683-9617f097a201" />

## 出力

- **selected_images**: 選択された画像を出力
- **selected_latents**: 選択された画像のLatent画像を出力 (Latent画像を入力している場合のみ)
- **selection_indices**: 選択した画像のインデックスの文字列 (e.g., "0,2,4")

## インストール

1. ComfyUI Manager からインストールできます。
   もしくは“ComfyUI/custom_nodes/”ディレクトリ内で```git clone https://github.com/NyaFuP/ComfyUI_Preview_Selector.git```を実行してください。
2. ComfyUIを再起動してください
3. "image/review" カテゴリーの中に"NF Preview Selector"が表示されます。
- ~~Installation from ComfyUI Manager is not yet available~~

## Technical Details

- JavaScript ES6モジュールを使用して構築
- CSS スタイルのフローティングウィンドウシステム
- ComfyUI バックエンドとのWebSocket通信
- 依存関係は最小限（ComfyUIの組み込みAPIを使用）

## Known Issues

- このカスタムノードがユーザー入力を待っているとき、「キャンセル」を選択したり、タイムアウトしたりすると、プレビュー画像が保存されません。現在のところ、これを修正することは私の能力を超えているので、改善のヒントが得られるまでこのままにしておきます。

## Please Note

- このカスタムノードを作ったのは、私自身が使うために必要だったからです。私はコーディングの知識が浅いため、Claude Codeの助けを借りて開発しました。そのため、このカスタムノードに問題があったとしても、詳しいサポートを提供することができません。

## Credits

このカスタムノードは [cg-image-filter](https://github.com/chrisgoringe/cg-image-filter)から着想して実装されました。
