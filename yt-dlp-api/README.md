# yt-dlp API

基于 yt-dlp 的视频解析 API，部署在 Vercel 上。

## 部署步骤

### 1. 准备工作

- 注册 Vercel 账号：https://vercel.com
- 安装 Vercel CLI（可选）：`npm i -g vercel`

### 2. 部署到 Vercel

#### 方式一：通过 Vercel 网站部署（推荐）

1. 打开 https://vercel.com/new
2. 导入你的 GitHub 仓库
3. 选择项目根目录为 `yt-dlp-api`
4. 点击 Deploy

#### 方式二：通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd yt-dlp-api
vercel --prod
```

### 3. 配置 yt-dlp

Vercel 的服务器less 环境需要特殊配置来运行 yt-dlp。你需要：

1. 在 Vercel 项目设置中添加环境变量（如果需要）
2. 确保 yt-dlp 已安装（通过 build 脚本）

修改 `package.json` 添加安装脚本：

```json
{
  "scripts": {
    "start": "node index.js",
    "build": "npm install yt-dlp"
  }
}
```

### 4. 测试 API

部署完成后，访问：

```
https://你的项目名.vercel.app/api/info?url=视频链接
```

例如：
```
https://yt-dlp-api.vercel.app/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## API 端点

### GET /api/info

获取视频信息

参数：
- `url`: 视频链接

返回：
```json
{
  "title": "视频标题",
  "description": "视频描述",
  "thumbnail": "缩略图链接",
  "duration": 120,
  "uploader": "上传者",
  "downloadUrl": "下载链接",
  "fileSize": 12345678
}
```

### POST /api/parse

解析视频（与 GET /api/info 相同，但使用 POST）

请求体：
```json
{
  "url": "视频链接"
}
```

## 支持的平台

- YouTube
- Bilibili
- TikTok
- 抖音
- 快手
- Twitter/X
- Instagram
- Facebook
- 以及 yt-dlp 支持的所有平台

## 注意事项

1. Vercel 的免费版有执行时间限制（10秒），对于长视频可能超时
2. 某些平台可能需要特殊配置（如 cookies）
3. 建议添加 rate limiting 防止滥用
