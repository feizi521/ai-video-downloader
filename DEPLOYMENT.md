# 部署指南

本指南将帮助您将 AI 智能视频图片下载器部署到 Cloudflare。

## 前置要求

1. Cloudflare 账号（免费版即可）
2. GitHub 账号
3. Node.js 和 npm 已安装

## 部署步骤

### 第一步：准备 Cloudflare 资源

#### 1. 创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **D1**
3. 点击 **Create database**
4. 数据库名称填写：`ai-downloader-db`
5. 点击 **Create**
6. 记下 **Database ID**（后面会用到）

#### 2. 初始化数据库

在项目根目录执行：

```bash
# 替换 YOUR_DATABASE_ID 为实际的数据库 ID
wrangler d1 execute ai-downloader-db --remote --file=schema.sql
```

#### 3. 创建 Cloudflare Workers

1. 在 Cloudflare Dashboard 中，进入 **Workers & Pages** → **Create Application**
2. 选择 **Create Worker**
3. Worker 名称填写：`ai-video-downloader-api`
4. 点击 **Deploy**
5. 点击 **Edit code**，将 `src/worker.js` 的内容复制进去
6. 点击 **Save and Deploy**

#### 4. 创建 Cloudflare Pages

1. 在 Cloudflare Dashboard 中，进入 **Workers & Pages** → **Create Application**
2. 选择 **Pages** → **Connect to Git**
3. 选择您的 GitHub 仓库
4. 配置构建设置：
   - 构建命令：留空
   - 输出目录：`public`
5. 点击 **Save and Deploy**

### 第二步：配置项目

#### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

#### 2. 登录 Cloudflare

```bash
wrangler login
```

#### 3. 配置 wrangler.toml

复制 `wrangler.example.toml` 为 `wrangler.toml`：

```bash
cp wrangler.example.toml wrangler.toml
```

编辑 `wrangler.toml`，填入您的数据库 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-downloader-db"
database_id = "your-actual-database-id-here"  # 替换为实际的数据库 ID
```

### 第三步：部署 Workers

```bash
# 开发环境测试
npm run dev

# 部署到生产环境
npm run deploy
```

### 第四步：配置环境变量（可选）

如果需要添加 API 密钥或其他配置：

1. 在 Cloudflare Dashboard 中进入您的 Worker
2. 点击 **Settings** → **Variables**
3. 添加环境变量：
   - `API_KEY`: 您的 API 密钥
   - `ENVIRONMENT`: `production`

### 第五步：配置自定义域名（可选）

#### 为 Pages 配置自定义域名

1. 在 Cloudflare Dashboard 中进入您的 Pages 项目
2. 点击 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入您的域名（如：`downloader.yourdomain.com`）
5. 按照提示完成 DNS 配置

#### 为 Workers 配置自定义域名

1. 在 Cloudflare Dashboard 中进入您的 Worker
2. 点击 **Triggers** → **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入您的域名（如：`api.yourdomain.com`）
5. 按照提示完成 DNS 配置

### 第六步：更新前端 API 地址

编辑 `public/app.js`，修改 API_BASE：

```javascript
// 如果使用自定义域名
const API_BASE = 'https://api.yourdomain.com';

// 或者使用 Workers 默认域名
const API_BASE = 'https://ai-video-downloader-api.your-subdomain.workers.dev';
```

重新部署 Pages 项目使更改生效。

## 本地开发

### 启动开发服务器

```bash
# 启动 Workers 开发服务器
npm run dev

# 启动 Pages 开发服务器
npm run pages:dev
```

### 测试 API

```bash
# 测试解析接口
curl -X POST https://your-worker.workers.dev/api/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.douyin.com/video/xxx"}'

# 测试下载接口
curl "https://your-worker.workers.dev/api/download?url=xxx"
```

## 监控和日志

### 查看 Workers 日志

1. 在 Cloudflare Dashboard 中进入您的 Worker
2. 点击 **Logs** → **Real-time logs**
3. 查看实时日志输出

### 查看 D1 数据库

```bash
# 查询下载历史
wrangler d1 execute ai-downloader-db --remote --command="SELECT * FROM download_history ORDER BY created_at DESC LIMIT 10"

# 查看统计数据
wrangler d1 execute ai-downloader-db --remote --command="SELECT * FROM statistics"
```

## 常见问题

### 1. 部署失败

- 检查 `wrangler.toml` 配置是否正确
- 确保已登录 Cloudflare：`wrangler login`
- 检查数据库 ID 是否正确

### 2. API 请求失败

- 检查 Worker 是否正确部署
- 查看 Workers 日志排查错误
- 确保前端 API_BASE 配置正确

### 3. 数据库连接失败

- 确认 D1 数据库已创建
- 检查 `wrangler.toml` 中的数据库 ID
- 确保数据库表已正确初始化

### 4. 跨域问题

在 Workers 中添加 CORS 头：

```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

## 性能优化

### 1. 启用缓存

在 Cloudflare Dashboard 中为您的 Worker 和 Pages 启用缓存。

### 2. 配置速率限制

防止 API 被滥用：

```javascript
// 在 worker.js 中添加速率限制逻辑
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 10) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

### 3. 使用 Cloudflare R2 存储文件

对于大文件下载，可以使用 Cloudflare R2 存储：

```javascript
// 上传文件到 R2
await env.BUCKET.put(key, file);

// 从 R2 下载文件
const object = await env.BUCKET.get(key);
```

## 安全建议

1. **添加 API 密钥验证**
2. **实施速率限制**
3. **使用 HTTPS**
4. **定期更新依赖**
5. **监控异常请求**
6. **添加用户认证**（可选）

## 更新和维护

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 重新部署
npm run deploy
```

### 备份数据库

```bash
# 导出数据库
wrangler d1 export ai-downloader-db --remote --output=backup.sql

# 导入数据库
wrangler d1 execute ai-downloader-db --remote --file=backup.sql
```

## 获取帮助

- 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- 查看 [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- 提交 Issue 到 GitHub 仓库

## 许可证

MIT License