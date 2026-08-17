import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import { OriginStorage } from "../src/OriginStorage.ts";

type Schema = {
    count: number;
    name: string;
    settings: { theme: "light" | "dark" };
};

afterEach(() => {
    globalThis.indexedDB = new IDBFactory();
});

describe("OriginStorage の読み書き", () => {
    it("未保存のキーは undefined / has は false / getSize は 0", async () => {
        const storage = new OriginStorage<Schema>("app");
        expect(await storage.getItem("count")).toBeUndefined();
        expect(await storage.get("name")).toBeUndefined();
        expect(await storage.has("count")).toBe(false);
        expect(await storage.getSize()).toBe(0);
    });

    it("setItem した値を getItem できる", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.setItem("count", 1);
        await storage.setItem("name", "koto");
        expect(await storage.getItem("count")).toBe(1);
        expect(await storage.getItem("name")).toBe("koto");
        expect(await storage.has("count")).toBe(true);
        expect(await storage.getSize()).toBe(2);
    });

    it("set / get は setItem / getItem のエイリアス", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("count", 7);
        expect(await storage.get("count")).toBe(7);
        expect(await storage.getItem("count")).toBe(7);
    });

    it("同じキーへの set は上書きする", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("count", 1);
        await storage.set("count", 2);
        expect(await storage.get("count")).toBe(2);
        expect(await storage.getSize()).toBe(1);
    });

    it("0 / false / 空文字は未保存と区別する", async () => {
        const storage = new OriginStorage<{ n: number; flag: boolean; text: string }>("falsy");
        await storage.set("n", 0);
        await storage.set("flag", false);
        await storage.set("text", "");
        expect(await storage.get("n")).toBe(0);
        expect(await storage.get("flag")).toBe(false);
        expect(await storage.get("text")).toBe("");
        expect(await storage.has("n")).toBe(true);
        expect(await storage.has("flag")).toBe(true);
        expect(await storage.has("text")).toBe(true);
    });

    it("オブジェクトと配列は structured clone されて保存される", async () => {
        const storage = new OriginStorage<Schema>("app");
        const settings = { theme: "dark" as const };
        await storage.set("settings", settings);
        const loaded = await storage.get("settings");
        expect(loaded).toEqual({ theme: "dark" });
        expect(loaded).not.toBe(settings);
    });

    it("null と Date を保存できる", async () => {
        const storage = new OriginStorage<{ empty: null; at: Date }>("cloneable");
        const at = new Date("2026-08-17T00:00:00.000Z");
        await storage.set("empty", null);
        await storage.set("at", at);
        expect(await storage.get("empty")).toBeNull();
        const loaded = await storage.get("at");
        expect(loaded).toBeInstanceOf(Date);
        expect(loaded?.getTime()).toBe(at.getTime());
    });

    it("同じストレージ名の別インスタンスから読める", async () => {
        const writer = new OriginStorage<Schema>("app");
        await writer.set("name", "koto");
        const reader = new OriginStorage<Schema>("app");
        expect(await reader.get("name")).toBe("koto");
    });
});

describe("OriginStorage の削除", () => {
    it("removeItem は指定キーだけ消す", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("count", 1);
        await storage.set("name", "koto");
        await storage.removeItem("count");
        expect(await storage.get("count")).toBeUndefined();
        expect(await storage.has("count")).toBe(false);
        expect(await storage.get("name")).toBe("koto");
        expect(await storage.getSize()).toBe(1);
    });

    it("delete は removeItem のエイリアス", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("count", 1);
        await storage.delete("count");
        expect(await storage.get("count")).toBeUndefined();
        expect(await storage.has("count")).toBe(false);
    });

    it("存在しないキーの delete はエラーにならない", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.delete("count");
        expect(await storage.getSize()).toBe(0);
    });

    it("clear は全件削除する", async () => {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("count", 1);
        await storage.set("name", "koto");
        await storage.clear();
        expect(await storage.get("count")).toBeUndefined();
        expect(await storage.get("name")).toBeUndefined();
        expect(await storage.getSize()).toBe(0);
        expect(await storage.keys()).toEqual([]);
    });
});

describe("OriginStorage の列挙", () => {
    async function seed(): Promise<OriginStorage<Schema>> {
        const storage = new OriginStorage<Schema>("app");
        await storage.set("name", "koto");
        await storage.set("count", 1);
        await storage.set("settings", { theme: "light" });
        return storage;
    }

    it("keys は IDB のキー順", async () => {
        const storage = await seed();
        expect(await storage.keys()).toEqual(["count", "name", "settings"]);
    });

    it("key(n) はキー順の n 番目。範囲外は undefined", async () => {
        const storage = await seed();
        expect(await storage.key(0)).toBe("count");
        expect(await storage.key(1)).toBe("name");
        expect(await storage.key(2)).toBe("settings");
        expect(await storage.key(3)).toBeUndefined();
        expect(await storage.key(-1)).toBeUndefined();
    });

    it("values はキー順の値", async () => {
        const storage = await seed();
        expect(await storage.values()).toEqual([1, "koto", { theme: "light" }]);
    });

    it("entries は [key, value] の配列（キー順）", async () => {
        const storage = await seed();
        expect(await storage.entries()).toEqual([
            ["count", 1],
            ["name", "koto"],
            ["settings", { theme: "light" }],
        ]);
    });

    it("空ストレージの列挙は空", async () => {
        const storage = new OriginStorage<Schema>("empty");
        expect(await storage.keys()).toEqual([]);
        expect(await storage.values()).toEqual([]);
        expect(await storage.entries()).toEqual([]);
        expect(await storage.key(0)).toBeUndefined();
        expect(await storage.getSize()).toBe(0);
    });
});

describe("OriginStorage の独立性", () => {
    it("別ストレージ名の ObjectStore は混ざらない", async () => {
        const a = new OriginStorage<{ x: number }>("alpha");
        const b = new OriginStorage<{ x: number }>("beta");
        await a.set("x", 1);
        await b.set("x", 2);
        expect(await a.get("x")).toBe(1);
        expect(await b.get("x")).toBe(2);
        expect(await a.getSize()).toBe(1);
        expect(await b.getSize()).toBe(1);
        await a.clear();
        expect(await a.get("x")).toBeUndefined();
        expect(await b.get("x")).toBe(2);
    });
});

describe("OriginStorage のエラー", () => {
    it("関数は structured clone できないので保存に失敗する", async () => {
        const storage = new OriginStorage<{ fn: unknown }>("app");
        await expect(storage.set("fn", () => 1)).rejects.toSatisfy((error: unknown) => {
            return error instanceof DOMException && error.name === "DataCloneError";
        });
        expect(await storage.has("fn")).toBe(false);
    });
});
