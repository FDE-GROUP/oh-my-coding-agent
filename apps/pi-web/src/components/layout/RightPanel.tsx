/**
 * 右侧可停靠面板的槽位。
 *
 * @remarks
 * S1 只保留结构，M1 后续切片在需要时挂载内容；宽度为 0，不占布局。
 */
export function RightPanel() {
	return <div data-slot="rightbar" className="hidden w-0 shrink-0 xl:block" aria-hidden />;
}
