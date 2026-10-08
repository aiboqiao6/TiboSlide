# TiboSlide

Tibo 滑动变祖器。四档称号：

**提祖 → 提圣 → 提波 → 牢提**

- 连续滑轨、四档称号选择、键盘微调。
- 四十六张独立人像：强化更帅版 → 原笑脸 → 原严肃脸 → 强化邋遢版，每段有十四张过渡照片。
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
python3 tests/prepare-portraits.test.py
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

核心状态与旧版几何模块有单元测试；素材预处理测试依赖 Python 3 和 Pillow。浏览器测试覆盖桌面、触屏、四档选择、播放、下载、分享链接恢复、图像加载失败及重试，并逐像素验证 0–100 正反拖动的每个整数位置与单张素材一致。详见 [过渡连续性测试记录](docs/testing/portrait-continuity.tdd.md)。

## 发布

```bash
git push origin main
npm run deploy
```

`deploy` 将构建产物推送到 `gh-pages` 分支。GitHub Pages 设置为从该分支的根目录发布。推送 `main` 本身不会更新网页，需要另行运行 `npm run deploy`。

## 结构

```text
src/state.ts       四档、密集帧选择、输入校验、分享参数、往返播放
src/geometry.ts    旧版几何工具（当前渲染不调用）
src/portrait.ts    单张照片绘制、原图分屏对比
src/main.ts        界面事件、加载、分享、PNG 导出
src/style.css      响应式仪表布局
public/assets/     原始人像和 AI 编辑人像，当前使用四十六张
scripts/           仅供本地制作素材的图像 API 兼容脚本
tests/             单元和端到端测试
```

四个档位分别位于 0%、33%、67%、100%。每两个档位之间均匀分布十四张过渡照片，相邻帧最多间隔约 2.27%。第二、三档之间逐渐收起笑容，向画面左侧转头，并改变脸型和发型。素材预处理使用眼线对齐、整图平移旋转缩放及亮度校正，减少位置和曝光跳变；不改变原始第二、三档照片。

滑轨进度连续，照片仍按最近的独立帧切换，不是数学连续的人脸变形。渲染不使用双照片透明叠加，避免双脸、重影和叠加痕迹。

## 素材说明

交互形式参考网上的梁文锋滑动变祖器，页面与实现独立编写。两张原始照片来自用户提供截图，只保留人像，没有上传整张社交平台截图。其余当前使用的四十四张图片来自用户指定的图像 API，使用 `gpt-image-2` 编辑生成和本地处理，不代表人物的真实状态。旧版素材留作制作记录。照片及人物相关权利归各自权利人所有。

提示词、素材对应关系和再生成方式见 [素材记录](docs/imagegen/README.md)。API 密钥仅由本地进程的 `OPENAI_API_KEY` 提供，不嵌入网站，不提交到 Git。下载链接响应缓存在本地 `output/` 下，可恢复下载而无需再次生成；该目录不提交到 Git。

本项目纯属娱乐，四个档位不代表真实产品状态，不代表本人或任何机构观点。
