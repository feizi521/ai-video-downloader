# yt-dlp API 服务部署指南

## 🎯 永久免费方案

### 方案一：Oracle Cloud（推荐）⭐⭐⭐⭐⭐

**永久免费配置：**
- 4核 ARM CPU + 24GB 内存
- 或 2个 AMD VM（各 1核 + 1GB 内存）
- 200GB 存储空间
- 每月 10TB 免费流量
- **无执行时间限制** - 完美支持长视频

**注册步骤：**

1. 访问 https://www.oracle.com/cloud/free/
2. 点击 "Start for free"
3. 填写信息（需要信用卡验证，不会扣费）
4. 选择地区：日本（Tokyo）或韩国（Chuncheon），延迟低

**部署步骤：**

```bash
# 1. SSH 连接到服务器

# 2. 下载部署脚本
curl -o deploy.sh https://raw.githubusercontent.com/feizi521/ai-video-downloader/main/deploy-scripts/oracle-cloud-deploy.sh

# 3. 添加执行权限
chmod +x deploy.sh

# 4. 执行部署
./deploy.sh
```

**或者手动部署：**

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装依赖
sudo apt install -y python3 python3-pip ffmpeg

# 安装 yt-dlp
sudo pip3 install yt-dlp

# 创建服务目录
sudo mkdir -p /opt/ytdlp-api
cd /opt/ytdlp-api

# 下载 API 文件
sudo curl -o api.py https://raw.githubusercontent.com/feizi521/ai-video-downloader/main/yt-dlp-server/api.py

# 安装 Python 依赖
sudo pip3 install flask flask-cors gunicorn

# 创建 systemd 服务
sudo tee /etc/systemd/system/ytdlp-api.service > /dev/null << 'EOF'
[Unit]
Description=yt-dlp API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ytdlp-api
ExecStart=/usr/bin/python3 /opt/ytdlp-api/api.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable ytdlp-api
sudo systemctl start ytdlp-api

# 检查状态
sudo systemctl status ytdlp-api
```

---

### 方案二：Google Cloud Run ⭐⭐⭐⭐

**免费额度：**
- 每月 200 万次请求
- 360,000 vCPU 秒
- 180,000 GB 秒内存
- **注意：有请求时间限制（最长 60 分钟）**

**部署步骤：**

1. 安装 Google Cloud CLI
2. 创建 Dockerfile：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install yt-dlp flask flask-cors gunicorn

COPY api.py .

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "-t", "300", "api:app"]
```

3. 部署：

```bash
gcloud run deploy ytdlp-api \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --timeout 900 \
  --memory 2Gi \
  --cpu 2
```

---

### 方案三：Fly.io ⭐⭐⭐

**免费额度：**
- 3 个共享 CPU VM
- 3GB 持久存储
- 每月 160GB 出站流量

**部署步骤：**

1. 安装 Fly CLI：`curl -L https://fly.io/install.sh | sh`
2. 登录：`fly auth login`
3. 创建 `fly.toml`：

```toml
app = "ytdlp-api"
primary_region = "nrt"

[build]

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

4. 创建 Dockerfile（同上）
5. 部署：`fly deploy`

---

## 🔧 配置 Cloudflare Worker

部署完成后，修改 Worker 代码：

```javascript
const YTDLP_APIS = [
    {
        name: 'my-ytdlp',
        url: 'https://你的服务器IP:5000/api/info',
        method: 'GET',
        paramName: 'url'
    }
];
```

---

## 🧪 测试 API

```bash
# 测试 API 是否正常
curl 'http://你的服务器IP:5000/'

# 测试解析 YouTube 视频
curl 'http://你的服务器IP:5000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ'

# 测试解析 Bilibili 视频
curl 'http://你的服务器IP:5000/api/info?url=https://www.bilibili.com/video/BV1xx411c7mD'
```

---

## 🛠️ 管理命令

```bash
# 查看服务状态
sudo systemctl status ytdlp-api

# 重启服务
sudo systemctl restart ytdlp-api

# 查看日志
sudo journalctl -u ytdlp-api -f

# 更新 yt-dlp
sudo pip3 install --upgrade yt-dlp
sudo systemctl restart ytdlp-api
```

---

## 🔒 安全配置

### 1. 配置防火墙

```bash
# 只允许 Cloudflare IP 访问
sudo ufw allow 22/tcp
sudo ufw allow from 173.245.48.0/20 to any port 5000
sudo ufw allow from 103.21.244.0/22 to any port 5000
sudo ufw allow from 103.22.200.0/22 to any port 5000
sudo ufw allow from 103.31.4.0/22 to any port 5000
sudo ufw allow from 141.101.64.0/18 to any port 5000
sudo ufw allow from 108.162.192.0/18 to any port 5000
sudo ufw allow from 190.93.240.0/20 to any port 5000
sudo ufw allow from 188.114.96.0/20 to any port 5000
sudo ufw allow from 197.234.240.0/22 to any port 5000
sudo ufw allow from 198.41.128.0/17 to any port 5000
sudo ufw allow from 162.158.0.0/15 to any port 5000
sudo ufw allow from 104.16.0.0/13 to any port 5000
sudo ufw allow from 104.24.0.0/14 to any port 5000
sudo ufw allow from 172.64.0.0/13 to any port 5000
sudo ufw allow from 131.0.72.0/22 to any port 5000
sudo ufw enable
```

### 2. 配置 Nginx 反向代理（可选）

```bash
sudo apt install nginx -y

sudo tee /etc/nginx/sites-available/ytdlp-api > /dev/null << 'EOF'
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/ytdlp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📊 性能优化

### 使用 Gunicorn（推荐）

```bash
# 修改 systemd 服务
sudo tee /etc/systemd/system/ytdlp-api.service > /dev/null << 'EOF'
[Unit]
Description=yt-dlp API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ytdlp-api
ExecStart=/usr/bin/gunicorn -b 0.0.0.0:5000 -w 4 -t 300 api:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl restart ytdlp-api
```

---

## ❓ 常见问题

### Q: Oracle Cloud 注册失败？
A: 确保使用真实信息，信用卡需要支持国际支付。如果失败，可以尝试：
- 换一个邮箱
- 换一个浏览器
- 联系客服

### Q: API 响应很慢？
A: 
1. 更新 yt-dlp：`sudo pip3 install --upgrade yt-dlp`
2. 使用 Gunicorn 增加工作进程
3. 选择离用户近的服务器地区

### Q: 某些视频无法解析？
A: 
1. 更新 yt-dlp 到最新版本
2. 某些平台需要登录，可以配置 cookies
3. 检查视频是否被删除或设为私密

---

## 📝 更新日志

- 2024-01-01: 初始版本
- 支持 YouTube, Bilibili, TikTok, 抖音, 快手等 1000+ 平台
