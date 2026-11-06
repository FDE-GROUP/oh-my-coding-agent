/**
 * TanStack Start 服务端入口。
 *
 * @remarks
 * 在默认入口之上增加一次数据库初始化：启动时打开 SQLite、执行迁移并导入
 * 旧的 JSON 元数据。迁移失败会让服务启动失败，而不是等到首个请求。
 *
 * @internal
 */
import serverEntry from "@tanstack/react-start/server-entry";
import { getDatabase } from "../db.mjs";

try {
	getDatabase();
} catch (error) {
	console.error(`[pi-web] 数据库初始化失败：${error instanceof Error ? error.message : String(error)}`);
	throw error;
}

export default serverEntry;
