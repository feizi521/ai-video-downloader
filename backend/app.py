from flask import Flask, request, jsonify, make_response
import subprocess
import json
import os
from urllib.parse import urlparse

app = Flask(__name__)

def add_cors_headers(response):
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

SUPPORTED_PLATFORMS = {
    'bilibili.com': 'B站',
    'b23.tv': 'B站',
    'douyin.com': '抖音',
    'iesdouyin.com': '抖音',
    'v.douyin.com': '抖音',
    'kuaishou.com': '快手',
    'chenzhongtech.com': '快手',
    'v.kuaishou.com': '快手',
    'xiaohongshu.com': '小红书',
    'xhslink.com': '小红书',
    'weibo.com': '微博',
    'weibo.cn': '微博',
    'youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'twitter.com': 'Twitter',
    'x.com': 'Twitter',
    'instagram.com': 'Instagram',
    'facebook.com': 'Facebook',
    'tiktok.com': 'TikTok'
}

def identify_platform(url):
    try:
        hostname = urlparse(url).hostname.lower()
        for domain, platform in SUPPORTED_PLATFORMS.items():
            if domain in hostname:
                return platform
        return None
    except:
        return None

def get_video_info(url):
    try:
        cmd = [
            'yt-dlp',
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            '--quiet',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
        
        print(f"yt-dlp error: {result.stderr}")
        return None
    except subprocess.TimeoutExpired:
        print("yt-dlp timeout")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def extract_best_url(info):
    if 'url' in info:
        return info['url']
    
    if 'formats' in info:
        formats = info['formats']
        
        video_formats = [f for f in formats if f.get('vcodec') != 'none' and f.get('url')]
        if video_formats:
            video_formats.sort(key=lambda x: x.get('height', 0) or 0, reverse=True)
            return video_formats[0]['url']
        
        audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('url')]
        if audio_formats:
            return audio_formats[0]['url']
    
    return None

@app.route('/api/parse', methods=['POST'])
def parse_video():
    try:
        data = request.get_json()
        url = data.get('url', '').strip()
        
        if not url:
            return jsonify({'success': False, 'message': '请提供视频链接'}), 400
        
        platform = identify_platform(url)
        if not platform:
            return jsonify({'success': False, 'message': '不支持的平台'}), 400
        
        print(f"Parsing {platform} URL: {url}")
        
        info = get_video_info(url)
        
        if not info:
            return jsonify({'success': False, 'message': '解析失败，请检查链接或稍后重试'}), 500
        
        video_url = extract_best_url(info)
        
        if not video_url:
            return jsonify({'success': False, 'message': '无法获取视频下载链接'}), 500
        
        title = info.get('title', f'{platform}视频')
        thumbnail = info.get('thumbnail', '')
        if not thumbnail and info.get('thumbnails'):
            thumbnail = info['thumbnails'][0].get('url', '')
        duration = info.get('duration', 0)
        
        return jsonify({
            'success': True,
            'data': {
                'url': url,
                'platform': platform,
                'contentType': 'video',
                'title': title,
                'thumbnail': thumbnail,
                'downloadUrl': video_url,
                'duration': duration,
                'fileSize': 0,
                'message': '解析成功'
            }
        })
    except Exception as e:
        print(f"Parse error: {e}")
        return jsonify({'success': False, 'message': f'服务器错误: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'yt-dlp service is running'})

if __name__ == '__main__':
    from waitress import serve
    serve(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
