# 视频下载后端服务

## 功能
支持直接下载 B 站、抖音、快手、YouTube 等平台的视频。

## 安装步骤

### 1. 安装 Python
- 访问 https://www.python.org/downloads/
- 下载并安装 Python 3.8 或更高版本
- 安装时勾选 "Add Python to PATH"

### 2. 安装依赖
```bash
cd backend
pip install -r requirements.txt
```

### 3. 运行服务
```bash
python app.py
```

服务将在 http://localhost:5000 启动

## API 接口

### 解析视频
```
POST /api/parse
Content-Type: application/json

{
    "url": "https://www.bilibili.com/video/BV16dPJznEEp"
}
```

### 下载视频
```
POST /api/download
Content-Type: application/json

{
    "url": "https://www.bilibili.com/video/BV16dPJznEEp",
    "downloadId": "uuid-string"
}
```

## 生产环境部署

### 使用 Waitress（Windows）
```bash
pip install waitress
waitress-serve --host=0.0.0.0 --port=5000 app:app
```

### 使用 Gunicorn（Linux/Mac）
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 注意事项

1. 需要安装 ffmpeg 用于视频处理（可选）
2. 下载的视频会临时存储在系统临时目录
3. 建议定期清理临时文件
4. 遵守各平台的使用条款和版权规定