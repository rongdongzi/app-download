# App 下载中心（Gitee 存 APK + Cloudflare Pages 托管页面）

uniapp 打包出的 APK，一条命令发布，用户扫码/点击下载最新版。

## 架构

```
扫码/访问 → Cloudflare Pages 下载页（免费）
                │
                └→ 下载按钮 → Gitee raw 直链下载 APK（国内快、免登录）
```

- **APK 放 Gitee**：公开仓库 raw 链接，国内访问快，不受 Pages 下架影响
- **下载页放 Cloudflare Pages**：免费、无限流量、无需绑卡
- **固定链接**：`latest.apk` 每次覆盖上传，二维码永远不变

## 目录结构

```
apk-download/
├── index.html      # 全部 App 列表首页
├── download.html   # 单个 App 下载详情页（通过 ?id=xxx 打开）
├── apps.js         # APPS 配置（名称、版本、大小、APK 直链）
├── qrcode.min.js   # 本地二维码组件
├── _headers        # Cloudflare Pages 缓存与响应头配置
├── upload.js       # 发布脚本（核心，先改里面的 Gitee 用户名！）
├── README.md
└── apps/
    ├── app-a/
    │   ├── latest.apk        # 永远指向最新版（二维码不变）
    │   └── app-a-v1.0.0.apk  # 历史版本备份
    └── app-b/
        └── latest.apk
```

## 一、首次部署（一次性）

### 1. 配置脚本（重要！）
打开 `upload.js`，把顶部配置区改成你的信息：
```js
const GITEE_USER = "ssyzi";       // ← 改成你的 Gitee 用户名
const GITEE_REPO = "apk-download"; // ← 你的仓库名
```

### 2. Gitee 仓库（存 APK）
1. https://gitee.com → 新建**公开**仓库 `apk-download`
2. 本地推送：
```bash
cd D:\work\apk-download
git init
git add .
git commit -m "初始化"
git remote add origin https://gitee.com/你的用户名/apk-download.git
git push -u origin master
```

### 3. Cloudflare Pages（托管下载页）
1. 注册 https://dash.cloudflare.com（免费，可用邮箱注册，无需绑卡）
2. 左侧菜单 → **Workers & Pages** → **创建** → **Pages**
3. 选 **"直接上传"（Direct Upload）**
4. 项目名填 `apk-download`，把本地文件夹（含 index.html、download.html、apps.js 和 apps/）整个拖进去，部署
5. 得到地址：`https://apk-download.pages.dev`

> ⚠️ APK 文件比较大时，"直接上传"可能超限。如果超限，APK 只在 Gitee 就行（下载页上传 index.html、download.html、apps.js、qrcode.min.js、_headers 即可，不需要传 apps/ 里的 APK——页面链接指向 Gitee 直链）。

### 4. 验证
浏览器打开 `https://apk-download.pages.dev`，确认页面显示；用手机扫码测试下载是否走 Gitee 直链。

## 二、日常发布（每次打包后）

```bash
# 1. 发布（自动更新 latest.apk + 版本信息）
node upload.js app-a "D:\HBuilderX\dist\app-a.apk" 1.2.0

# 2. 推到 Gitee（APK 上传）
git add .
git commit -m "发布 app-a v1.2.0"
git push

# 3. 更新 Cloudflare 下载页（任选）
npx wrangler pages deploy . --project-name apk-download   # 自动方式
# 或 控制台手动上传 index.html、download.html、apps.js、qrcode.min.js、_headers
```

**完成。** 用户下载链接、二维码全部不变。

## 三、多 App

```bash
node upload.js app-a "...app-a.apk" 1.0.1
node upload.js app-b "...app-b.apk" 2.0.0
```
下载页自动出现切换标签。

## 四、自定义

`apps.js` 中的 `APPS` 数组：
- `name`：显示名称
- `icon`：图标背景色（如 "#FF6B6B"）
- `desc`：版本说明/简介
- `apkUrl`：由 upload.js 自动填为 Gitee 直链，一般不用手改

## 五、常见问题

| 问题 | 解决 |
|---|---|
| 下载页能开，点下载没反应 | 检查 Gitee 仓库是否**公开**；raw 链接在浏览器单独打开测试 |
| 下载超慢 | Gitee raw 国内已算快的；可考虑把 APK 也放 COS（国内更快，6 个月免费） |
| 二维码扫出来是源码 | 二维码指向了 Gitee raw 的 HTML 而非 Pages 页面——检查 download.html 的二维码生成逻辑（应指向 APK 直链） |
| Cloudflare 上传超限 | 只传 index.html、download.html、apps.js、qrcode.min.js、_headers，不传 apps/，APK 全靠 Gitee 直链 |
