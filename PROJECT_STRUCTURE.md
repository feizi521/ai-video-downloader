# 项目文件结构说明

## 完整项目结构

```
ai-video-downloader/
├── public/                          # 前端静态文件目录
│   ├── index.html                   # 主页面 HTML
│   ├── styles.css                   # 样式文件
│   └── app.js                       # 前端 JavaScript 逻辑
├── src/                             # 后端源代码目录
│   └── worker.js                    # Cloudflare Workers 主文件
├── node_modules/                    # npm 依赖包（自动生成）
├── .gitignore                       # Git 忽略文件配置
├── package.json                     # 项目配置和依赖
├── wrangler.toml                    # Cloudflare Workers 配置
├── wrangler.example.toml            # Cloudflare Workers 配置示例
├── schema.sql                       # 数据库表结构
├── README.md                        # 项目说明文档
└── DEPLOYMENT.md                    # 部署指南
```

## 文件说明

### 前端文件 (public/)

#### index.html
- 网站主页面
- 包含链接输入框、解析按钮、结果展示区
- 响应式设计，支持移动端
- 使用语义化 HTML5 标签

#### styles.css
- 网站样式文件
- 使用现代 CSS3 特性
- 渐变背景、卡片式布局
- 移动端适配

#### app.js
- 前端交互逻辑
- 处理用户输入和 API 调用
- 本地存储下载历史
- 文件下载功能

### 后端文件 (src/)

#### worker.js
- Cloudflare Workers 主文件
- 实现所有 API 接口
- 支持多平台解析
- 数据库操作
- CORS 处理

### 配置文件

#### package.json
- 项目元数据
- 依赖管理
- npm 脚本命令

#### wrangler.toml
- Cloudflare Workers 配置
- 数据库绑定
- 环境变量
- 部署设置

#### schema.sql
- D1 数据库表结构
- 包含三个主要表：
  - download_history: 下载历史
  - platform_rules: 平台规则
  - statistics: 统计数据

### 文档文件

#### README.md
- 项目介绍
- 功能特性
- 快速开始指南
- API 文档
- 注意事项

#### DEPLOYMENT.md
- 详细部署步骤
- Cloudflare 配置指南
- 本地开发说明
- 常见问题解答
- 性能优化建议

## 核心功能模块

### 1. 链接解析模块
- 识别平台类型
- 提取视频/图片信息
- 获取真实下载地址

### 2. AI 智能分析
- 内容类型识别
- 质量评估
- 格式转换建议

### 3. 下载处理模块
- 处理防盗链
- 文件流传输
- 进度跟踪

### 4. 用户界面模块
- 简洁的输入界面
- 实时结果展示
- 历史记录管理

### 5. 数据管理模块
- 下载历史存储
- 统计数据收集
- 用户行为分析

## 支持的平台

| 平台 | 类型 | 状态 |
|------|------|------|
| 抖音 | 视频 | ✅ 已实现 |
| 快手 | 视频 | ✅ 已实现 |
| B站 | 视频 | ✅ 已实现 |
| YouTube | 视频 | ✅ 已实现 |
| 小红书 | 图片 | ✅ 已实现 |
| 微博 | 混合 | ✅ 已实现 |

## API 接口列表

### POST /api/parse
解析视频/图片链接

### GET /api/download
下载文件

### GET /api/history
获取下载历史

### DELETE /api/history
清空下载历史

### GET /api/stats
获取统计数据

## 技术栈

### 前端
- HTML5
- CSS3
- JavaScript (ES6+)
- Fetch API

### 后端
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- itty-router (路由框架)

### 部署
- Cloudflare Pages
- Cloudflare Workers
- GitHub (版本控制)

## 数据库表结构

### download_history
存储用户的下载历史记录

### platform_rules
存储各平台的解析规则

### statistics
存储下载统计数据

## 环境变量

- `ENVIRONMENT`: 运行环境 (development/production)
- `API_KEY`: API 密钥（可选）
- `DATABASE_ID`: D1 数据库 ID

## 部署流程

1. 创建 Cloudflare 账号
2. 创建 D1 数据库
3. 初始化数据库表
4. 创建 Cloudflare Workers
5. 创建 Cloudflare Pages
6. 配置环境变量
7. 部署代码
8. 测试功能

## 开发工作流

1. 修改代码
2. 本地测试
3. 提交到 GitHub
4. 自动部署到 Cloudflare
5. 在线验证

## 维护建议

1. 定期更新依赖
2. 监控 API 使用情况
3. 备份数据库
4. 优化性能
5. 修复 bug
6. 添加新功能

## 扩展方向

1. 添加更多平台支持
2. 实现用户认证系统
3. 添加批量下载功能
4. 集成更多 AI 功能
5. 添加付费功能
6. 开发移动应用

## 许可证

MIT License - 可自由使用和修改