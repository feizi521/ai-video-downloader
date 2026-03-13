#!/bin/bash

# yt-dlp API 服务一键部署脚本
# 适用于 Oracle Cloud / Ubuntu 22.04

echo "=========================================="
echo "  yt-dlp API 服务部署脚本"
echo "=========================================="

# 更新系统
echo "[1/6] 更新系统..."
sudo apt update && sudo apt upgrade -y

# 安装依赖
echo "[2/6] 安装依赖..."
sudo apt install -y python3 python3-pip ffmpeg curl

# 安装 yt-dlp
echo "[3/6] 安装 yt-dlp..."
sudo pip3 install yt-dlp

# 创建 API 服务目录
echo "[4/6] 创建服务目录..."
sudo mkdir -p /opt/ytdlp-api
cd /opt/ytdlp-api

# 创建 Python API 服务
echo "[5/6] 创建 API 服务..."
sudo tee /opt/ytdlp-api/api.py > /dev/null << 'EOF'
#!/usr/bin/env python3
from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'yt-dlp API is running',
        'endpoints': {
            'parse': 'POST /api/parse',
            'info': 'GET /api/info?url=VIDEO_URL'
        }
    })

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({'success': False, 'message': '请提供视频链接'}), 400
    
    try:
        result = get_video_info(url)
        if result:
            return jsonify(result)
        else:
            return jsonify({'success': False, 'message': '解析失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/parse', methods=['POST'])
def parse():
    data = request.get_json()
    url = data.get('url') if data else None
    
    if not url:
        return jsonify({'success': False, 'message': '请提供视频链接'}), 400
    
    try:
        result = get_video_info(url)
        if result:
            return jsonify({'success': True, 'data': result})
        else:
            return jsonify({'success': False, 'message': '解析失败'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def get_video_info(url):
    try:
        cmd = ['yt-dlp', '-j', '--no-warnings', url]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f'yt-dlp error: {result.stderr}')
            return None
        
        info = json.loads(result.stdout)
        
        download_url = None
        file_size = 0
        
        if info.get('formats'):
            for f in info['formats']:
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    if f.get('url'):
                        download_url = f['url']
                        file_size = f.get('filesize') or f.get('filesize_approx') or 0
                        break
            
            if not download_url and info['formats']:
                download_url = info['formats'][0].get('url')
        
        if not download_url:
            download_url = info.get('url')
        
        return {
            'title': info.get('title', '未知标题'),
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'uploader': info.get('uploader', ''),
            'downloadUrl': download_url,
            'fileSize': file_size
        }
    except Exception as e:
        print(f'Error: {e}')
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOF

# 安装 Python 依赖
echo "[6/6] 安装 Python 依赖..."
sudo pip3 install flask flask-cors

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
echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "API 地址: http://$(curl -s ifconfig.me):5000"
echo ""
echo "测试命令:"
echo "  curl 'http://localhost:5000/api/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
echo ""
echo "管理命令:"
echo "  查看状态: sudo systemctl status ytdlp-api"
echo "  重启服务: sudo systemctl restart ytdlp-api"
echo "  查看日志: sudo journalctl -u ytdlp-api -f"
echo ""
