// Cloudflare Worker - 视频解析服务

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' }
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 处理 /api/parse 路径
        if (url.pathname === '/api/parse' || url.pathname.endsWith('/api/parse')) {
            if (request.method === 'POST') {
                return handleParse(request);
            } else if (request.method === 'GET') {
                return jsonResponse({ success: false, message: '请使用 POST 方法' }, 405);
            } else if (request.method === 'OPTIONS') {
                return handleOptions();
            }
        }
        
        return jsonResponse({ success: false, message: 'Not Found' }, 404);
    }
};

async function handleParse(request) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return jsonResponse({ success: false, message: '请提供有效的链接' }, 400);
        }

        console.log('Parsing URL:', url);

        const platformInfo = identifyPlatform(url);
        if (!platformInfo) {
            return jsonResponse({ success: false, message: '不支持的平台' }, 400);
        }

        console.log('Platform identified:', platformInfo.name);

        // 使用 yt-dlp 在线服务解析
        const result = await parseWithYtDlp(url);
        
        if (result && result.downloadUrl) {
            return jsonResponse({
                success: true,
                data: {
                    url: url,
                    platform: platformInfo.name,
                    contentType: platformInfo.contentType,
                    title: result.title || `${platformInfo.name}视频`,
                    thumbnail: result.thumbnail || '',
                    downloadUrl: result.downloadUrl,
                    duration: result.duration || 0,
                    fileSize: 0,
                    message: '解析成功'
                }
            });
        }
        
        // 如果 yt-dlp 失败，返回备用方案
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: `https://ytdown.vercel.app/api/download?url=${encodeURIComponent(url)}`,
                duration: 0,
                fileSize: 0,
                message: '已生成下载链接'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
    }
}

async function parseWithYtDlp(url) {
    try {
        // 使用 ytdown API
        const apiUrl = `https://ytdown.vercel.app/api/info?url=${encodeURIComponent(url)}`;
        
        console.log('Calling yt-dlp API:', apiUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('yt-dlp response status:', response.status);
        
        if (!response.ok) {
            console.log('yt-dlp API failed:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('yt-dlp response:', JSON.stringify(data).substring(0, 300));
        
        // 检查返回的数据格式
        if (data && data.formats && data.formats.length > 0) {
            // 获取最佳质量的视频
            const bestFormat = data.formats.find(f => f.vcodec !== 'none' && f.acodec !== 'none') || 
                              data.formats.find(f => f.vcodec !== 'none') ||
                              data.formats[0];
            
            return {
                title: data.title,
                thumbnail: data.thumbnail,
                downloadUrl: bestFormat.url,
                duration: data.duration
            };
        }
        
        // 如果直接有 url 字段
        if (data && data.url) {
            return {
                title: data.title,
                thumbnail: data.thumbnail,
                downloadUrl: data.url,
                duration: data.duration
            };
        }
        
        return null;
    } catch (e) {
        console.log('yt-dlp error:', e.message);
        return null;
    }
}

function identifyPlatform(url) {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
            if (platform.domains.some(d => hostname.includes(d))) {
                return { key, ...platform };
            }
        }
        return null;
    } catch {
        return null;
    }
}

function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
