# AI智能视频图片下载器

基于 Cloudflare + GitHub 搭建的智能视频图片链接解析下载网站

## 功能特性

- 支持多平台视频/图片解析下载
- AI智能识别链接类型
- 美观的用户界面
- 下载历史记录
- 响应式设计，支持移动端

## 支持的平台

- 抖音
- 快手
- B站
- YouTube
- 小红书
- 微博

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1
- 部署：Cloudflare Pages + GitHub

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/ai-video-downloader.git
cd ai-video-downloader
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Cloudflare

1. 登录 Cloudflare Dashboard
2. 创建 D1 数据库
3. 创建 Cloudflare Pages 项目
4. 创建 Cloudflare Workers

### 4. 初始化数据库

```bash
wrangler d1 execute ai-downloader-db --file=schema.sql
```

### 5. 本地开发

```bash
npm run dev
```

### 6. 部署到 Cloudflare

```bash
npm run deploy
```

## 项目结构

```
ai-video-downloader/
├── public/              # 前端文件
│   ├── index.html       # 主页面
│   ├── styles.css       # 样式文件
│   └── app.js          # 前端逻辑
├── src/                # 后端文件
│   └── worker.js       # Cloudflare Workers
├── schema.sql          # 数据库结构
├── package.json        # 项目配置
├── wrangler.toml       # Cloudflare 配置
└── README.md           # 项目说明
```

## API 接口

### POST /api/parse
解析视频/图片链接

**请求体：**
```json
{
  "url": "https://www.douyin.com/video/xxx"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "url": "原始链接",
    "platform": "平台名称",
    "contentType": "video/image",
    "title": "标题",
    "thumbnail": "缩略图URL",
    "downloadUrl": "下载链接",
    "duration": 0,
    "fileSize": 0
  }
}
```

### GET /api/download
下载文件

**参数：**
- url: 下载链接

### GET /api/history
获取下载历史

### DELETE /api/history
清空下载历史

### GET /api/stats
获取统计数据

## 注意事项

1. 部署前需要修改 `wrangler.toml` 中的 `database_id`
2. 部分平台可能需要更新解析逻辑
3. 请遵守各平台的使用条款和版权法律
4. 建议添加速率限制以防止滥用

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request