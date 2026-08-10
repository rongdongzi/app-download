#!/usr/bin/env node
/**
 * uniapp APK 发布脚本
 * 用法：
 *   node upload.js <appId> <apk文件路径> [版本号]
 * 示例：
 *   node upload.js app-a "D:\HBuilderX\dist\app-a.apk" 1.2.0
 *
 * 功能：
 *   1. 把新 APK 复制到 apps/<appId>/latest.apk（覆盖，保持下载链接和二维码不变）
 *   2. 另存一份带版本号的历史包 apps/<appId>/<appId>-v<版本号>.apk
 *   3. 自动更新 index.html 里的 APPS 配置（版本号、大小、日期）
 *   4. 提示你执行 git push 发布到 Gitee
 */
const fs = require("fs");
const path = require("path");

// ---------- 参数解析 ----------
const [,, appId, apkPath, versionArg] = process.argv;

if (!appId || !apkPath) {
  console.log(`
用法: node upload.js <appId> <apk文件路径> [版本号]

示例:
  node upload.js app-a "D:/HBuilderX/dist/app-a.apk" 1.2.0
  node upload.js app-b "D:/build/app-b-release.apk" 2.1.3

appId 必须与 index.html 中 APPS 配置里的 id 一致。
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

// ---------- 更新 index.html 的 APPS 配置 ----------
const indexPath = path.join(ROOT, "index.html");
let html = fs.readFileSync(indexPath, "utf-8");

// 读取现有 APPS 数组（JSON 风格对象数组，宽松解析）
const arrRe = /var APPS\s*=\s*\[([\s\S]*?)\];/;
const mArr = html.match(arrRe);
if (!mArr) {
  console.error("✗ index.html 中找不到 var APPS = [...] 配置块");
  process.exit(1);
}

const existingBody = mArr[1];
const itemRe = /\{\s*id\s*:\s*"([^"]+)"[\s\S]*?\}/g;
let apps = [];
let mm;
while ((mm = itemRe.exec(existingBody)) !== null) {
  apps.push(mm[1]);
}

if (apps.includes(appId)) {
  // 更新已有条目（version / size / date）
  const findItem = new RegExp(
    `(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(version\\s*:\\s*")[^"]*(")`,
    "m"
  );
  html = html.replace(findItem, `$1$2${version}$3`);
  const findSize = new RegExp(
    `(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(size\\s*:\\s*")[^"]*(")`,
    "m"
  );
  html = html.replace(findSize, `$1$2${sizeStr}$3`);
  const findDate = new RegExp(
    `(\\{\\s*id\\s*:\\s*"${appId}"[\\s\\S]*?)(date\\s*:\\s*")[^"]*(")`,
    "m"
  );
  html = html.replace(findDate, `$1$2${today}$3`);
  console.log(`✓ 已更新 index.html 中 ${appId} 的版本/大小/日期`);
} else {
  // 新增条目
  const entry =
    `  {\n` +
    `    id: "${appId}",\n` +
    `    name: "${appId} 名称",\n` +
    `    icon: "#4A90D9",\n` +
    `    version: "${version}",\n` +
    `    size: "${sizeStr}",\n` +
    `    date: "${today}",\n` +
    `    apkUrl: "apps/${appId}/latest.apk",\n` +
    `    desc: "请修改名称和简介"\n` +
    `  },`;
  // 插到数组第一个元素前
  html = html.replace(/var APPS\s*=\s*\[/, "var APPS = [\n" + entry);
  console.log(`✓ 已在 index.html 新增 App 条目: ${appId}（记得改 name/icon/desc）`);
}
fs.writeFileSync(indexPath, html);

// ---------- 汇总 ----------
console.log("\n========== 发布完成 ==========");
console.log(`  App     : ${appId}`);
console.log(`  版本    : v${version}`);
console.log(`  大小    : ${sizeStr}`);
console.log(`  日期    : ${today}`);
console.log(`  latest  : apps/${appId}/latest.apk`);
console.log("===============================\n");
console.log("下一步：提交并推送到 Gitee 仓库");
console.log("  cd " + ROOT);
console.log("  git add .");
console.log('  git commit -m "发布 ' + appId + ' v' + version + '"');
console.log("  git push");
console.log("\n推送后，下载页和二维码自动指向最新版。");
