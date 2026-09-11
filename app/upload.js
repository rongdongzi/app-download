#!/usr/bin/env node
/**
 * uniapp APK 发布脚本（Gitee 存 APK + Cloudflare Pages 托管下载页）
 * 用法：
 *   node upload.js <appId> <apk文件路径> [版本号]
 * 示例：
 *   node upload.js app-a "D:\HBuilderX\dist\app-a.apk" 1.2.0
 *
 * 功能：
 *   1. 把新 APK 复制到 apps/<appId>/latest.apk（覆盖，保持下载链接和二维码不变）
 *   2. 另存一份带版本号的历史包 apps/<appId>/<appId>-v<版本号>.apk
 *   3. 自动更新 apps.js 里的 APPS 配置（版本号、大小、日期、Gitee 直链）
 *   4. 提示你 push 到 Gitee + 部署到 Cloudflare Pages
 */
const fs = require("fs");
const path = require("path");

// ============ 配置区：改成你自己的 Gitee 信息 ============
const GITEE_USER = "ssyzi";            // 你的 Gitee 用户名
const GITEE_REPO = "apk-download";     // 你的 Gitee 仓库名
const GITEE_BRANCH = "master";         // 分支名（Gitee 默认 master）
// APK 下载直链前缀（Gitee raw 链接，国内访问快、免登录）
const APK_BASE_URL = `https://gitee.com/${GITEE_USER}/${GITEE_REPO}/raw/${GITEE_BRANCH}/`;
// =========================================================

// ---------- 参数解析 ----------
const [,, appId, apkPath, versionArg] = process.argv;

if (!appId || !apkPath) {
  console.log(`
用法: node upload.js <appId> <apk文件路径> [版本号]

示例:
  node upload.js app-a "D:/HBuilderX/dist/app-a.apk" 1.2.0
  node upload.js app-b "D:/build/app-b-release.apk" 2.1.3

appId 必须与 apps.js 中 APPS 配置里的 id 一致。
`);
  process.exit(1);
}

// ---------- 路径 ----------
const ROOT = __dirname;
const APP_DIR = path.join(ROOT, "apps", appId);
const LATEST_PATH = path.join(APP_DIR, "latest.apk");

// ---------- 检查 APK 是否存在 ----------
if (!fs.existsSync(apkPath)) {
  console.error(`✗ APK 文件不存在: ${apkPath}`);
  process.exit(1);
}

// ---------- 版本号 ----------
let version = versionArg;
if (!version) {
  const m = apkPath.match(/(?:-|_)(\d+\.\d+\.\d+)/);
  version = m ? m[1] : "1.0.0";
  console.log(`ℹ 未指定版本号，从文件名猜测: ${version}`);
}

// ---------- 复制 APK ----------
fs.mkdirSync(APP_DIR, { recursive: true });
fs.copyFileSync(apkPath, LATEST_PATH);
console.log(`✓ 已更新: apps/${appId}/latest.apk`);

const verPath = path.join(APP_DIR, `${appId}-v${version}.apk`);
if (fs.existsSync(verPath)) {
  console.log(`ℹ 版本 ${version} 已存在，跳过历史包保存`);
} else {
  fs.copyFileSync(apkPath, verPath);
  console.log(`✓ 历史包: apps/${appId}/${appId}-v${version}.apk`);
}

const bytes = fs.statSync(LATEST_PATH).size;
const sizeStr = (bytes / (1024 * 1024)).toFixed(1) + " MB";
const today = new Date().toISOString().slice(0, 10);

// ---------- 更新 apps.js 的 APPS 配置 ----------
const indexPath = path.join(ROOT, "apps.js");
let html = fs.readFileSync(indexPath, "utf-8");

const arrRe = /var APPS\s*=\s*\[([\s\S]*?)\];/;
const mArr = html.match(arrRe);
if (!mArr) {
  console.error("✗ apps.js 中找不到 var APPS = [...] 配置块");
  process.exit(1);
}

const existingBody = mArr[1];
const itemRe = /\{\s*id\s*:\s*"([^"]+)"[\s\S]*?\}/g;
let apps = [];
let mm;
while ((mm = itemRe.exec(existingBody)) !== null) {
  apps.push(mm[1]);
}

const apkUrl = `${APK_BASE_URL}apps/${appId}/latest.apk`;

if (apps.includes(appId)) {
  html = html.replace(
    new RegExp(`(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(version\\s*:\\s*")[^"]*(")`, "m"),
    `$1$2${version}$3`
  );
  html = html.replace(
    new RegExp(`(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(size\\s*:\\s*")[^"]*(")`, "m"),
    `$1$2${sizeStr}$3`
  );
  html = html.replace(
    new RegExp(`(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(date\\s*:\\s*")[^"]*(")`, "m"),
    `$1$2${today}$3`
  );
  console.log(`✓ 已更新 apps.js 中 ${appId} 的版本/大小/日期`);
} else {
  const entry =
    `  {\n` +
    `    id: "${appId}",\n` +
    `    name: "${appId} 名称",\n` +
    `    icon: "#4A90D9",\n` +
    `    version: "${version}",\n` +
    `    size: "${sizeStr}",\n` +
    `    date: "${today}",\n` +
    `    apkUrl: "${apkUrl}",\n` +
    `    desc: "请修改名称和简介"\n` +
    `  },`;
  html = html.replace(/var APPS\s*=\s*\[/, "var APPS = [\n" + entry);
  console.log(`✓ 已在 apps.js 新增 App 条目: ${appId}（记得改 name/icon/desc）`);
}
fs.writeFileSync(indexPath, html);

// ---------- 汇总 ----------
console.log("\n========== 发布完成 ==========");
console.log(`  App     : ${appId}`);
console.log(`  版本    : v${version}`);
console.log(`  大小    : ${sizeStr}`);
console.log(`  日期    : ${today}`);
console.log(`  下载直链: ${apkUrl}`);
console.log("===============================\n");

console.log("【第 1 步】把 APK 推到 Gitee（国内下载源）:");
console.log(`  cd ${ROOT}`);
console.log("  git add .");
console.log(`  git commit -m "发布 ${appId} v${version}"`);
console.log("  git push");
console.log("\n【第 2 步】把下载页部署到 Cloudflare Pages:");
console.log("  方式A（推荐，自动）: 已安装 wrangler 的话执行:");
console.log("    npx wrangler pages deploy . --project-name apk-download");
console.log("  方式B（手动）: Cloudflare 控制台 → Workers & Pages →");
  console.log("    创建 Pages 项目 → 上传整个文件夹（index.html、download.html、apps.js、apps/）");
console.log("\n推送+部署后，二维码自动指向最新版。");
