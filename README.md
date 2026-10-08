# TiboSlide

Tibo 滑动变祖器。四档从笑脸逐渐变为严肃脸：

**重置卡 → 重置 → 降智 → 封号**

- 连续滑轨、四档快捷选择、键盘微调。
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
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

核心状态与几何模块有单元测试；浏览器测试覆盖桌面、触屏、四档选择、播放、下载、分享链接恢复、图像加载失败及重试。详见 [测试记录](docs/testing/tibo-slide.tdd.md)。

## 发布

```bash
git push origin main
npm run deploy
```

`deploy` 将构建产物推送到 `gh-pages` 分支。GitHub Pages 设置为从该分支的根目录发布。推送 `main` 本身不会更新网页，需要另行运行 `npm run deploy`。

## 结构

```text
src/state.ts       四档、输入校验、分享参数、往返播放
src/geometry.ts    关键点插值与仿射变换
src/portrait.ts    Delaunator 三角网格人像变形、原图对比
src/main.ts        界面事件、加载、分享、PNG 导出
src/style.css      响应式仪表布局
public/assets/     从用户提供截图裁出的两张人像
tests/             单元和端到端测试
```

只有两张端点素材，中间人像由面部关键点几何变形与混合计算生成，不是独立的真实照片。两张照片的角度、发型和裁切不同，中间态会有一定混合痕迹。

## 素材说明

交互形式参考网上的梁文锋滑动变祖器，页面与实现独立编写。照片来自用户提供截图，只保留两张人像，没有上传整张社交平台截图。照片及人物相关权利归各自权利人所有。

本项目纯属娱乐，四个档位不代表真实产品状态，不代表本人或任何机构观点。
