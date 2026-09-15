# 原网页实时覆盖

休息 UI 改为透明扩展 iframe，覆盖在当前 HTTP/HTTPS 页面的 documentElement 下。原网页 DOM、滚动位置、视频和定时更新保持原状；body 在休息中暂设 inert，覆盖层移除时恢复之前的 inert 状态和焦点。

启动与练习均不再显示工作截图、示例 iframe 或花园背景。练习阶段只增加半透明暗色遮罩以保持文字可读。后台不再调用 captureVisibleTab；旧版截图缓存会在下一次启动/暂停/完成时清理。

本地预览入口：`http://localhost:4173/demo-workspace.html?rest-preview=1`。示例文档本身是实时宿主页面，休息 UI 叠在其上，并非截图。它仅演示覆盖方式；在实际浏览网页中使用须重新加载 dist 扩展，然后在网页上启动休息。

扩展用 web_accessible_resources 只公开 break.html 作为嵌入入口，其余内部资源由扩展页面加载。Chrome 说明：https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources

浏览器内部页、扩展商店等不允许内容脚本的页面不能直接覆盖；保留独立休息页作为回退。网站若通过权限策略禁止摄像头，仍可能需要在允许摄像头的普通网页上进行练习。

验证：构建与 29 项单元测试通过。scripts/extension-smoke.mjs 调用新的 overlay-smoke.mjs，覆盖原页面持续更新、不新建标签页、不保存截图、透明表面、本地摄像头推理、暂停恢复操作、再次启动、拒绝非法进度、完成次数持久化及覆盖层移除。采用有窗口 Chromium 测试，因为该环境无窗口模式无法正常向扩展 iframe 路由鼠标事件；有窗口模式使用真实点击验证。

最新行为替代 docs/garden-ui 中此前关于花园/截图背景的记录。角色与装饰素材的视觉差距仍待最终视频或透明素材补齐。
