# AyaExpTech OriginStorage

Typed LocalStorage-like wrapper for IndexedDB (by AyaExpTech)

IndexedDBのObjectStoreをLocalStorageのように扱うための、薄いラッパーライブラリです。

## License

copyright (c) 2026- Ayasaka-Koto(AyaExpTech).  
Released under the [MIT License](LICENSE).

## Installation

このライブラリは[JSR](https://jsr.io/@ayaexptech/originstorage)パッケージとして公開されています。

- Web (esm.sh CDN)
    ```js
    import { OriginStorage } from "https://esm.sh/jsr/@ayaexptech/originstorage";
    ```
- npm
    ```bash
    npx jsr add @ayaexptech/originstorage
    ```
    ```js
    import { OriginStorage } from "@ayaexptech/originstorage";
    ```
- pnpm
    ```bash
    pnpm add jsr:@ayaexptech/originstorage
    ```
    ```js
    import { OriginStorage } from "@ayaexptech/originstorage";
    ```
- Deno (Add Package)
    ```bash
    deno add jsr:@ayaexptech/originstorage
    ```
    ```js
    import { OriginStorage } from "@ayaexptech/originstorage";
    ```
- Deno (Adhoc Import)
    ```js
    import { OriginStorage } from "jsr:@ayaexptech/originstorage";
    ```
- Bun
    ```bash
    bunx jsr add @ayaexptech/originstorage
    ```
    ```js
    import { OriginStorage } from "@ayaexptech/originstorage";
    ```

## Usage

基本的には[Web Storage API](https://developer.mozilla.org/ja/docs/Web/API/Storage)(`sessionStorage`や`localStorage`)と同じように使えます。  
ただし、IndexedDBを扱う都合上、各メソッドはPromiseを返します。適宜`await`などを使用してください。

```ts
import { OriginStorage } from "@ayaexptech/originstorage";

const exampleOriginStorage = new OriginStorage("example");
await exampleOriginStorage.setItem("hoge", "fuga");
await exampleOriginStorage.getItem("hoge"); // => "fuga"
await exampleOriginStorage.removeItem("hoge");
await exampleOriginStorage.clear();
await exampleOriginStorage.getSize(); // => 0 (lengthやsizeではないので注意)
```

- keyは`string`である必要があります。
- valueは構造化複製可能であればなんでもよいです。

`new OriginStorage()`は型引数として保存するKey-Valueペアの型をもらうことができます。

```ts
type StorageSchema = {
    count: number;
    kind: 1 | 2;
};
const storage = new OriginStorage<StorageSchema>("with_schema");
await storage.getItem("invalid");
//                    ^^^^^^^^^ ... Error
await storage.setItem("kind", 99);
//                            ^^ ... Error
await storage.getItem("count") // @type {number | undefined} (undefinedの可能性がある点に注意！)
```

また、`has()`や`entries()`など、[ECMAScript `Map`](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map)に似たメソッドもいくつか用意されています。

引数やメソッドなどの詳細は[JSRのドキュメントページ](https://jsr.io/@ayaexptech/originstorage/doc)及びJSDocコメントを参照してください。

## Contributing

- バグ報告: [GitHub Issues](https://github.com/AXT-Studio/OriginStorage/issues)
- Pull Request: Issueを立てたうえで、メンテナーの指示を待ってください。メンテナーの指示のないPRは却下されます。

### Developing

- Format: `pnpm run fmt` (`pnpm run fmt:check`)
- Lint: `pnpm run lint:fix` (`pnpm run lint`)
- Test: `pnpm run test`
    - Check slow-types: `pnpm run test:jsr`
