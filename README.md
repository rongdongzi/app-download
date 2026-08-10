# App 下载中心（Gitee 免费托管）

uniapp 打包出的 APK，一条命令发布到 Gitee，用户扫码/点击下载最新版。

## 目录结构

```
apk-download/
├── index.html      # 下载页（多 App 切换 + 二维码 + 下载按钮）
├── upload.js       # 发布脚本（核心）
└── apps/
    ├── app-a/
    │   ├── latest.apk        # 永远指向最新版（二维码不变）
    │   └── app-a-v1.0.0.apk  # 历史版本备份
    └── app-b/
        └── latest.apk
```

## 一、首次部署（一次性）

### 1. 创建 Gitee 仓库
1. 打开 https://gitee.com → 登录 → 右上角 `+` → 新建仓库
2. 仓库名：`apk-download`（可改）
3. **开源**（公开仓库，别人才能免登录下载）
4. 勾选"初始化仓库"，创建

### 2. 把本地文件夹关联到 Gitee
```bash
cd D:\work\apk-download
git init
git add .
git commit -m "初始化下载中心"
git remote add origin https://gitee.com/你的用户名/apk-download.git
git push -u origin master
```

> 国内推送 Gitee 如果卡，可用 SSH 方式（Gitee 设置里生成 SSH 公钥）。

### 3. 发布下载页（Gitee Pages）
1. Gitee 仓库页面 → 服务 → Gitee Pages
2. 首次使用需**实名认证**（手机号即可，免费）
3. 部署分支 `master`，目录 `/`，点启动
4. 获得访问地址：`https://你的用户名.gitee.io/apk-download/`
   - 注意：**Gitee Pages 免费版发布 APK 二进制文件有大小限制**，所以 APK 不走 Pages，直接走仓库 raw 链接（见下）

### 4. 验证下载链接（关键）
页面里 `latest.apk` 的相对链接，在 Pages 环境下会变成：
```
https://你的用户名.gitee.io/apk-download/apps/app-a/latest.apk
```
**如果这个 raw 链接不能直接下载（Gitee Pages 限制），改用 raw 直链：**
```
https://gitee.com/你的用户名/apk-download/raw/master/apps/app-a/latest.apk
```
需要把 `index.html` 里的 `apkUrl` 改成这个完整地址（或部署后在浏览器里实测哪个能下载，用哪个）。

## 二、日常发布（每次打包后）

在 HBuilderX 里云打包 → 拿到 APK 后，执行：

```bash
node upload.js app-a "D:\HBuilderX\dist\app-a.apk" 1.2.0
```

然后：
```bash
git add .
git commit -m "发布 app-a v1.2.0"
git push
```

**完成。** 用户下载链接、二维码全部不变，自动指向 v1.2.0。

## 三、多 App

多个 uniapp 项目各自打包，分别执行：
```bash
node upload.js app-a "...app-a.apk" 1.0.1
node upload.js app-b "...app-b.apk" 2.0.0
```
下载页自动出现两个 App 标签，可切换。

## 四、配置修改

`index.html` 底部 `APPS` 数组里可手动改：
- `name`：显示名称（默认是 appId）
- `icon`：图标背景色（如 "#FF6B6B"）
- `desc`：版本说明/简介

## 五、常用命令速查

| 操作 | 命令 |
|---|---|
| 发布新版本 | `node upload.js app-a "APK路径" 1.2.0` |
| 首次推送 | `git push -u origin master` |
| 日常推送 | `git push` |
| 看历史版本 | 仓库 `apps/app-a/` 目录 |
