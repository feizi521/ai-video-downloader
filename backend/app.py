from flask import Flask, request, jsonify, send_file, make_response
import os
import subprocess
import tempfile
import shutil
import uuid
from urllib.parse import urlparse

app = Flask(__name__)

def add_cors_headers(response):
    """手动添加 CORS 头"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.after_request
def after_request(response):
    return add_cors_headers(response)

@app.before_request
def before_request():
    if request.method == 'OPTIONS':
        return make_response('', 204)

# 临时下载目录
DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), 'video_downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# 支持的平台
SUPPORTED_PLATFORMS = {
    'bilibili.com': 'B站',
    'b23.tv': 'B站',
    'douyin.com': '抖音',
    'iesdouyin.com': '抖音',
    'kuaishou.com': '快手',
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube'
}


def identify_platform(url):
    """识别视频平台"""
    try:
        hostname = urlparse(url).hostname.lower()
        for domain, platform in SUPPORTED_PLATFORMS.items():
            if domain in hostname:
                return platform
        return None
    except:
        return None


def download_video(url, download_id):
    """使用 yt-dlp 下载视频"""
    output_dir = os.path.join(DOWNLOAD_DIR, download_id)
    os.makedirs(output_dir, exist_ok=True)
    
    # yt-dlp 命令
    cmd = [
        'yt-dlp',
        '--format', 'best',
        '--output', os.path.join(output_dir, '%(title)s.%(ext)s'),
        '--no-playlist',
        '--quiet',
        '--no-warnings',
        url
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            # 查找下载的文件
            files = os.listdir(output_dir)
            if files:
                return os.path.join(output_dir, files[0])
        
        return None
    except Exception as e:
        print(f"Download error: {e}")
        return None


@app.route('/api/parse', methods=['POST'])
def parse_video():
    """解析视频链接"""
    data = request.get_json()
    url = data.get('url', '').strip()
    
    if not url:
        return jsonify({'success': False, 'message': '请提供视频链接'}), 400
    
    platform = identify_platform(url)
    if not platform:
        return jsonify({'success': False, 'message': '不支持的平台'}), 400
    
    # 生成下载ID
    download_id = str(uuid.uuid4())
    
    return jsonify({
        'success': True,
        'data': {
            'url': url,
            'platform': platform,
            'contentType': 'video',
            'title': f'{platform}视频',
            'thumbnail': '',
            'downloadId': download_id,
            'duration': 0,
            'fileSize': 0,
            'message': f'{platform}视频准备下载'
        }
    })


@app.route('/api/download', methods=['POST'])
def download_video_api():
    """下载视频并返回文件"""
    data = request.get_json()
    url = data.get('url', '').strip()
    download_id = data.get('downloadId', '').strip()
    
    if not url or not download_id:
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400
    
    # 下载视频
    video_path = download_video(url, download_id)
    
    if not video_path:
        return jsonify({'success': False, 'message': '下载失败，请检查链接或稍后重试'}), 500
    
    # 返回文件
    try:
        return send_file(
            video_path,
            as_attachment=True,
            download_name=os.path.basename(video_path)
        )
    except Exception as e:
        return jsonify({'success': False, 'message': f'文件发送失败: {str(e)}'}), 500


@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    """清理临时文件"""
    data = request.get_json()
    download_id = data.get('downloadId', '').strip()
    
    if download_id:
        output_dir = os.path.join(DOWNLOAD_DIR, download_id)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir, ignore_errors=True)
    
    return jsonify({'success': True, 'message': '清理完成'})


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok', 'message': '服务正常运行'})


if __name__ == '__main__':
    # 生产环境使用 waitress 或 gunicorn
    app.run(host='0.0.0.0', port=5000, debug=False)