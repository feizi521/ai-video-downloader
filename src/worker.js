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

        // 尝试使用 cobalt 解析（支持 YouTube, Bilibili, TikTok 等）
        const result = await parseWithCobalt(url);
        
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
        
        // 如果 cobalt 失败，尝试其他服务
        const result2 = await parseWithOtherServices(url);
        if (result2 && result2.downloadUrl) {
            return jsonResponse({
                success: true,
                data: {
                    url: url,
                    platform: platformInfo.name,
                    contentType: platformInfo.contentType,
                    title: result2.title || `${platformInfo.name}视频`,
                    thumbnail: result2.thumbnail || '',
                    downloadUrl: result2.downloadUrl,
                    duration: result2.duration || 0,
                    fileSize: 0,
                    message: '解析成功'
                }
            });
        }
        
        // 如果都失败，返回备用方案
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: `https://cobalt.tools/?url=${encodeURIComponent(url)}`,
                duration: 0,
                fileSize: 0,
                message: '请访问 cobalt.tools 下载视频'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
    }
}

async function parseWithCobalt(url) {
    try {
        // 使用 cobalt API
        const apiUrl = 'https://api.cobalt.tools/api/json';
        
        console.log('Calling cobalt API for:', url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                isAudio: false,
                filenamePattern: 'basic'
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('cobalt response status:', response.status);
        
        if (!response.ok) {
            console.log('cobalt API failed:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('cobalt response:', JSON.stringify(data).substring(0, 300));
        
        // cobalt 返回格式
        if (data && data.url) {
            return {
                title: data.filename || '视频',
                thumbnail: '',
                downloadUrl: data.url,
                duration: 0
            };
        }
        
        return null;
    } catch (e) {
        console.log('cobalt error:', e.message);
        return null;
    }
}

async function parseWithOtherServices(url) {
    // 尝试其他解析服务
    const services = [
        {
            name: 'savefrom',
            url: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            type: 'redirect'
        }
    ];
    
    for (const service of services) {
        try {
            console.log(`Trying ${service.name}...`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(service.url, {
                method: 'HEAD',
                redirect: 'follow',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('video') || response.url.includes('.mp4')) {
                return {
                    title: '视频',
                    thumbnail: '',
                    downloadUrl: response.url,
                    duration: 0
                };
            }
        } catch (e) {
            console.log(`${service.name} error:`, e.message);
        }
    }
    
    return null;
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
