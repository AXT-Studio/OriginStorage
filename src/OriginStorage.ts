// ================================================================
// Utilities
// ================================================================

/**
 * Recordで指定されたOriginStorageの内容を実際に保存される{key, value}オブジェクトの形に変換する型
 */
type OriginStorageRecord<K extends string = string, V = unknown> = {
    key: K;
    value: V;
};
type OriginStorageRecordOf<KV> = {
    [K in keyof KV & string]: OriginStorageRecord<K, KV[K]>;
}[keyof KV & string];
type OriginStorageEntry<KV> = {
    [K in keyof KV & string]: [K, KV[K]];
}[keyof KV & string];

// ================================================================
// Exports
// ================================================================

/**
 * IndexedDBのLocalStorage風ラッパーである"OriginStorage"へのアクセスを提供します。
 * - OriginStorageは、オリジンごとに、(名前が被らない限り)自由にいくつでも作成することができます。
 * - OriginStorageは、各オリジンごとにIndexedDBのデータベース"AXT-Studio/OriginStorage"に保存されます。
 * - 型推論を効かせることができます。
 * - 一部、ECMAScript Mapでできる操作も提供されます。
 */
export class OriginStorage<KV extends Record<string, unknown> = Record<string, unknown>> {
    /** ストレージ名 (DB内のテーブル(オブジェクトストア)の名前と同じ) */
    #storageName: string;

    /**
     * 新しく、OriginStorageへアクセスするOriginStorageインスタンスを作成します。
     * @param storageName ストレージ名 (ストレージの識別のために使う)
     */
    constructor(storageName: string) {
        this.#storageName = storageName;
    }

    /**
     * @private
     * 各種リクエストのerror/successをPromiseに包むヘルパー
     */
    static #idbRequest<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        });
    }

    /**
     * @private
     * openリクエストのerror/successをPromiseに包むヘルパー
     */
    static async #openDatabase(
        name: string,
        version: number,
        onUpgrade?: (db: IDBDatabase) => void,
    ): Promise<IDBDatabase> {
        const request = globalThis.indexedDB.open(name, version);
        if (onUpgrade) {
            request.onupgradeneeded = () => {
                onUpgrade(request.result);
            };
        }
        return await this.#idbRequest(request);
    }

    /**
     * @private
     * 新しいデータベースコネクションを開いて返します。
     */
    async #open(): Promise<IDBDatabase> {
        const dbName = "AXT-Studio/OriginStorage";
        // 今IndexedDBにあるデータベースの一覧
        const IDB_DatabaseList = await globalThis.indexedDB.databases();
        // OriginStorage用DBのバージョン番号、まだデータベースがなければ1
        const currentDbVersion = IDB_DatabaseList.find((n) => n.name == dbName)?.version || 1;

        // OriginStorage用DBにあるObjectStoreの中に、指定されたstorageNameがあるかを確認するためのDB接続
        const probe = await OriginStorage.#openDatabase(dbName, currentDbVersion);
        // OriginStorage用DBにあるObjectStoreの中に、指定されたstorageNameがあるか？
        const exists = probe.objectStoreNames.contains(this.#storageName);
        if (exists) {
            return probe;
        }
        probe.close();

        // 次にDB接続を開くときに指定するバージョン
        // (ObjectStore"this.storageName"がなければ現在のバージョン+1、ObjectStore"this.storageName"があれば現在のバージョン)
        const nextVersion = exists ? currentDbVersion : currentDbVersion + 1;

        // 本操作を行うためのDB接続を開くリクエスト
        return await OriginStorage.#openDatabase(dbName, nextVersion, (db) => {
            // ObjectStore "this.storageName"がなければupgradeneededイベントの中でそのObjectStoreを作る
            if (!db.objectStoreNames.contains(this.#storageName)) {
                db.createObjectStore(this.#storageName, { keyPath: "key" });
            }
        });
    }

    /**
     * ストレージ内、IDBのキー順でn番目のキーの名称を返します。nは0-indexedです。
     * @param n - 何番目のキーの名称が欲しいか
     * @returns - IDBのキー順でn番目のキーの名称。キーがn個以下しかなければundefined。
     */
    async key(n: number): Promise<string | undefined> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).getAllKeys();
            const response = await OriginStorage.#idbRequest<IDBValidKey[]>(request);
            return response[n] as string | undefined;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージに指定したキーと値を追加/更新します。
     * @param key - キー
     * @param value - 保存する値
     */
    async setItem<K extends keyof KV & string>(key: K, value: KV[K]): Promise<void> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readwrite");
            const request = transaction.objectStore(this.#storageName).put({ key, value });
            await OriginStorage.#idbRequest(request);
            return;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージにキーに紐づけて保存した値を取得します。
     * @param key - キー
     * @returns- キーに紐づけて保存した値。未保存の場合はundefined。
     */
    async getItem<K extends keyof KV & string>(key: K): Promise<KV[K] | undefined> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).get(key);
            const response = await OriginStorage.#idbRequest<OriginStorageRecord<K, KV[K]> | undefined>(request);
            return response?.value;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージ内の指定したキーと値のペアを削除します。
     * @param key - 削除するペアのキー
     */
    async removeItem<K extends keyof KV & string>(key: K): Promise<void> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readwrite");
            const request = transaction.objectStore(this.#storageName).delete(key);
            await OriginStorage.#idbRequest(request);
            return;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージ内のすべてのキーと値のペアを削除します。
     */
    async clear(): Promise<void> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readwrite");
            const request = transaction.objectStore(this.#storageName).clear();
            await OriginStorage.#idbRequest(request);
            return;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージ内に指定されたキーで値が保存されているかを確認します。
     * @param key - キー
     * @returns- キーに紐づけて値が保存されていればtrue、そうでなければfalse
     */
    async has<K extends keyof KV & string>(key: K): Promise<boolean> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).count(key);
            const response = await OriginStorage.#idbRequest<number>(request);
            return response > 0;
        } finally {
            connection.close();
        }
    }

    /**
     * ストレージにキーに紐づけて保存した値を取得します。getItem()のエイリアスです。
     * @param key - キー
     * @returns- キーに紐づけて保存した値。未保存の場合はundefined。
     */
    async get<K extends keyof KV & string>(key: K): Promise<KV[K] | undefined> {
        return this.getItem(key);
    }

    /**
     * ストレージに指定したキーと値を追加/更新します。setItem()のエイリアスです。
     * @param key - キー
     * @param value - 保存する値
     */
    async set<K extends keyof KV & string>(key: K, value: KV[K]): Promise<void> {
        return this.setItem(key, value);
    }

    /**
     * ストレージ内の指定したキーと値のペアを削除します。removeItem()のエイリアスです。
     * @param key - 削除するペアのキー
     */
    async delete<K extends keyof KV & string>(key: K): Promise<void> {
        return this.removeItem(key);
    }

    /**
     * 現在ストレージに保存されているkey-valueのペアを取得して、配列として返します。
     */
    async entries(): Promise<OriginStorageEntry<KV>[]> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).getAll();
            const response = await OriginStorage.#idbRequest<OriginStorageRecordOf<KV>[]>(request);
            return response.map((entry) => [entry.key, entry.value] as OriginStorageEntry<KV>);
        } finally {
            connection.close();
        }
    }

    /**
     * 現在ストレージに保存されているkeyを取得して、配列として返します。
     */
    async keys(): Promise<(keyof KV)[]> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).getAllKeys();
            const response = await OriginStorage.#idbRequest<IDBValidKey[]>(request);
            return response as (keyof KV)[];
        } finally {
            connection.close();
        }
    }

    /**
     * 現在ストレージに保存されているvalueを取得して、配列として返します。
     */
    async values(): Promise<KV[keyof KV][]> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).getAll();
            const response =
                await OriginStorage.#idbRequest<OriginStorageRecord<keyof KV & string, KV[keyof KV]>[]>(request);
            return response.map((kv) => kv.value);
        } finally {
            connection.close();
        }
    }

    /**
     * 現在ストレージに保存されているkey-valueのペアの数を取得します。
     */
    async getSize(): Promise<number> {
        const connection = await this.#open();
        try {
            const transaction = connection.transaction(this.#storageName, "readonly");
            const request = transaction.objectStore(this.#storageName).count();
            const response = await OriginStorage.#idbRequest<number>(request);
            return response;
        } finally {
            connection.close();
        }
    }
}
