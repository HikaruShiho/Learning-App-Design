# udemy-reversi-webapp

## Node.js とパッケージのインストール方法

以下のコマンドで、.tool-versions に書かれたバージョンの Node.js をインストールしてください。

```console
asdf install
```

以下のコマンドで、package.json に書かれたライブラリをインストールしてください。

```console
npm install
```

## .ts ファイルの実行方法

以下のようにして、.ts ファイルを実行することができます。

```console
npx ts-node hello.ts
```

## リバーシアプリケーションの開発環境の起動

以下のコマンドで、MySQL を起動できます。

```console
docker-compose up -d
```

以下のコマンドで、MySQL に DDL を流すことができます。

※ このコマンドは MySQL の起動直後だとエラーになる場合があります。少し待ってから実行してください。

```console
./bin/load_ddl.sh
```

以下のコマンドで、開発用にホットリロードを有効にして Express を起動できます。

```console
npm start
```

## MySQL の操作

以下のコマンドで、MySQL の起動状況を確認することができます。

```console
docker-compose ps
```

以下のコマンドで、MySQL のログを確認することができます。

```console
docker-compose logs -f
```

以下のコマンドで、MySQL に接続できます。

```console
./bin/connect_mysql.sh
```

以下のコマンドで、MySQL のコンテナを削除することができます。

```console
docker-compose down
```
