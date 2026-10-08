# TiboSlide

Tibo 滑动变祖器。四档称号：

**提祖 → 提圣 → 提波 → 牢提**

- 连续滑轨、四档称号选择、键盘微调。
- 七张独立人像：更帅版 → 中间态 → 原笑脸 → 中间态 → 原严肃脸 → 中间态 → 更邋遢版。
- 任意滑动位置只显示一张完整照片，不使用透明叠加或人脸几何变形。
- 自动往返播放、复位、原图分屏对比。
- 下载带档位和进度的 PNG，分享链接恢复当前进度。
- 手机适配、图片加载失败重试、减少动态效果设置。
- 所有图片和字体本地打包，无后端、无登录、无第三方运行时请求。

在线体验：https://aiboqiao6.github.io/TiboSlide/

## 开发

需要 Node.js 22.12+。

```bash
npm ci
npm run dev
```

## 验证

```bash
npm run test:coverage
node --test tests/imagegen-compat.test.mjs
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

核心状态与旧版几何模块有单元测试；浏览器测试覆盖桌面、触屏、四档选择、播放、下载、分享链接恢复、图像加载失败及重试，并逐像素验证 0–100 的每个整数位置与单张原始素材一致。详见 [新版测试记录](docs/testing/single-portrait-stages.tdd.md)。

## 发布

```bash
git push origin main
npm run deploy
```

`deploy` 将构建产物推送到 `gh-pages` 分支。GitHub Pages 设置为从该分支的根目录发布。推送 `main` 本身不会更新网页，需要另行运行 `npm run deploy`。

## 结构

```text
src/state.ts       四档、七帧选择、输入校验、分享参数、往返播放
src/geometry.ts    旧版几何工具（当前渲染不调用）
src/portrait.ts    单张照片绘制、原图分屏对比
src/main.ts        界面事件、加载、分享、PNG 导出
src/style.css      响应式仪表布局
public/assets/     两张原始人像和五张 AI 编辑人像
scripts/           仅供本地制作素材的图像 API 兼容脚本
tests/             单元和端到端测试
```

四个档位分别位于 0%、33%、67%、100%；三张中间态位于 16.5%、50%、83.5%。滑轨进度连续，但照片按最近的帧切换。这是有意采用的单图切换，避免双脸、重影和叠加痕迹。

## 素材说明

交互形式参考网上的梁文锋滑动变祖器，页面与实现独立编写。两张原始照片来自用户提供截图，只保留人像，没有上传整张社交平台截图。另有五张图片通过用户指定的图像 API 使用 `gpt-image-2` 编辑生成，不代表人物的真实状态。照片及人物相关权利归各自权利人所有。

提示词、素材对应关系和再生成方式见 [素材记录](docs/imagegen/README.md)。API 密钥仅由本地进程的 `OPENAI_API_KEY` 提供，不嵌入网站，不提交到 Git。下载链接响应缓存在本地 `output/` 下，可恢复下载而无需再次生成；该目录不提交到 Git。

本项目纯属娱乐，四个档位不代表真实产品状态，不代表本人或任何机构观点。
