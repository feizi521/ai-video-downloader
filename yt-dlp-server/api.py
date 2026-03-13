#!/usr/bin/env python3
"""
yt-dlp API 服务
支持所有 yt-dlp 支持的平台
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import json
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'yt-dlp API is running',
        'version': '1.0.0',
        'endpoints': {
            'parse': 'POST /api/parse',
            'info': 'GET /api/info?url=VIDEO_URL'
        },
        'supported': ['YouTube', 'Bilibili', 'TikTok', '抖音', '快手', 'Twitter', 'Instagram', 'Facebook', '等 1000+ 平台']
    })

@app.route('/api/info')
def get_info():
    url = request.args.get('url')
    if not url:
        return jsonify({'success': False, 'message': '请提供视频链接'}), 400
    
    try:
        logger.info(f'Parsing URL: {url}')
        result = get_video_info(url)
        if result:
            return jsonify(result)
        else:
            return jsonify({'success': False, 'message': '解析失败'}), 500
    except Exception as e:
        logger.error(f'Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/parse', methods=['POST'])
def parse():
    data = request.get_json()
    url = data.get('url') if data else None
    
    if not url:
        return jsonify({'success': False, 'message': '请提供视频链接'}), 400
    
    try:
        logger.info(f'Parsing URL: {url}')
        result = get_video_info(url)
        if result:
            return jsonify({'success': True, 'data': result})
        else:
            return jsonify({'success': False, 'message': '解析失败'}), 500
    except Exception as e:
        logger.error(f'Error: {e}')
        return jsonify({'success': False, 'message': str(e)}), 500

def get_video_info(url):
    """
    使用 yt-dlp 获取视频信息
    """
    try:
        # 构建 yt-dlp 命令
        cmd = [
            'yt-dlp',
            '-j',  # 输出 JSON
            '--no-warnings',  # 不显示警告
            '--no-playlist',  # 不处理播放列表
            url
        ]
        
        # 执行命令，设置 5 分钟超时（支持长视频）
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            logger.error(f'yt-dlp error: {result.stderr}')
            return None
        
        # 解析 JSON 输出
        info = json.loads(result.stdout)
        
        # 提取下载链接
        download_url = None
        file_size = 0
        format_info = None
        
        # 优先选择有视频和音频的格式
        if info.get('formats'):
            # 按质量排序
            formats = sorted(
                [f for f in info['formats'] if f.get('vcodec') != 'none'],
                key=lambda x: x.get('height', 0) or 0,
                reverse=True
            )
            
            for f in formats:
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    if f.get('url'):
                        download_url = f['url']
                        file_size = f.get('filesize') or f.get('filesize_approx') or 0
                        format_info = f
                        break
            
            # 如果没有找到带音频的，选择第一个视频格式
            if not download_url and formats:
                download_url = formats[0].get('url')
                file_size = formats[0].get('filesize') or formats[0].get('filesize_approx') or 0
                format_info = formats[0]
        
        # 如果还是没有，使用默认 URL
        if not download_url:
            download_url = info.get('url')
        
        return {
            'title': info.get('title', '未知标题'),
            'description': info.get('description', '')[:200] if info.get('description') else '',
            'thumbnail': info.get('thumbnail', ''),
            'duration': info.get('duration', 0),
            'uploader': info.get('uploader', ''),
            'upload_date': info.get('upload_date', ''),
            'downloadUrl': download_url,
            'fileSize': file_size,
            'format': format_info.get('format') if format_info else '',
            'resolution': format_info.get('resolution') if format_info else ''
        }
        
    except subprocess.TimeoutExpired:
        logger.error('yt-dlp timeout')
        return None
    except json.JSONDecodeError as e:
        logger.error(f'JSON decode error: {e}')
        return None
    except Exception as e:
        logger.error(f'Error: {e}')
        return None

if __name__ == '__main__':
    print("=" * 50)
    print("  yt-dlp API 服务启动")
    print("  访问地址: http://localhost:5000")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False)
