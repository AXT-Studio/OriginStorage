# AyaExpTech OriginStorage

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

詳細は[JSRのドキュメントページ](https://jsr.io/@ayaexptech/originstorage/doc)及びJSDocコメントを参照してください。

## Contributing

- バグ報告: [GitHub Issues](https://github.com/AXT-Studio/OriginStorage/issues)
- Pull Request: Issueを立てたうえで、メンテナーの指示を待ってください。メンテナーの指示のないPRは却下されます。

### Developing

- Format: `pnpm run fmt` (`pnpm run fmt:check`)
- Lint: `pnpm run lint:fix` (`pnpm run lint`)
- Test: `pnpm run test`
    - Check slow-types: `pnpm run test:jsr`
