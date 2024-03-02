## ３層アーキテクチャ
### データアクセス層（Gateway, Infrastructureなど）
- DBとやり取りを行い、DBからデータを取得・保存・更新・削除する処理を記述
- 戻り値は各テーブルのレコードのインスタンスを返却するようにする
  - ロジックを持たないデータクラスを作成（エンティティということもある）
  - Gatewayメソッド実行時はデータクラスのインスタンスを返却するように

### プレゼンテーション層（Router, Controller, Presenterなど）
- ルーティングやコントローラーに該当する
- リクエストを受けたりレスポンスを変換する責務のみ負う（システム利用者とのやりとり）
- DTOを定義したりする（データの入れ物クラスのこと）

### アプリケーション層（Service, UseCaseなど）
- 実際のアプリケーションのロジックを記述する

## ビジネスロジックとは
- データアクセス（DBとのやりとり）とプレゼンテーション（ユーザーとの）以外の部分

### 日付形式の変換はビジネスロジックか？（GMT -> 2024/01/01とか）
- 見た目を変えるだけなのでプレゼンテーション層の役割かも（日付変換のアプリだったらビジネスロジックかも）

### リクエストの形式チェックはビジネスロジックか？
- プレゼンテーション層でチェックするのがいいかも
- UIなどユーザーととインターフェースに関することに関心を持つべきだから
- 不正な値は早めにエラーを返して、先に（ロジックやサービス）進めないようにしたい

## ドメインロジックとユースケース
- **システムなしでも現実世界で同じことをやろうとした時にと出てくるルールはドメインロジック**
  - ゲームでも物理的なリバーシでも紙とペンなど何でやっても存在する概念

**【オセロの場合】**
1. 石を置けるかチェック
2. 石を置く
3. 石ひっくり返す
4. 石の配置を保存する
5. 勝敗を判定

といった1個1個のコアルールのこと（ビジネスルールともいう）

1〜5の一連の流れを**ユースケース**という


## リポジトリパターン（Repository）
- サービスクラスからドメインを個別に参照すると、サービスのコードが多くなってしまう問題がある
- **ドメインへの参照をリポジトリが行うことでコードの肥大化を防ぐ**目的がある

### メモ
- ~~mysqlからfirebaseに置き換える場合、firebase用の`xxxGateway.ts`を作成するだけで置き換えれる？~~ → ドメインがDBに依存しているのでインターフェースを挟んで抽象化し、依存の向きを一方向にする必要がある
  - 現状のGatewayはmysql専用になっている
  - ~~レコードの型は決まっているので、firebaseのアウトプットを`xxxRecord.ts`の形式に合わせると解決？~~ → 依存の向きが双方向になっているのでできない