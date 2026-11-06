/**
 * 视口宽度订阅。
 *
 * @remarks
 * 服务端与首次客户端渲染都从 `1280` 开始，避免水合不一致；订阅在 effect 中
 * 安装，随后立即同步真实宽度。
 *
 * @internal
 */
import { useEffect, useState } from "react";

/**
 * 视口快照。
 *
 * @internal
 */
export interface Viewport {
	width: number;
}

const DEFAULT_WIDTH = 1280;

/**
 * 订阅浏览器视口宽度。
 *
 * @returns 当前视口宽度。
 * @internal
 */
export function useViewport(): Viewport {
	const [width, setWidth] = useState(DEFAULT_WIDTH);

	useEffect(() => {
		const update = () => setWidth(window.innerWidth);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	return { width };
}
