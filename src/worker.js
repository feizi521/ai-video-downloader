// Cloudflare Worker - 视频解析服务
// 使用金鹰资源解析接口

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' }
};

// 金鹰资源 JSON 采集接口
const PARSER_API = 'https://jyzyapi.com/provide/vod/from/jinyingm3u8/at/json';

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

        // 使用金鹰资源 JSON 采集接口
        const apiUrl = `${PARSER_API}?url=${encodeURIComponent(url)}`;
        console.log('Calling API:', apiUrl);
        
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
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            console.log('API failed, fallback to play page');
            const fallbackUrl = `https://hd.iapijy.com/play?url=${encodeURIComponent(url)}`;
            return jsonResponse({
                success: true,
                data: {
                    url: url,
                    platform: platformInfo.name,
                    contentType: platformInfo.contentType,
                    title: `${platformInfo.name}视频`,
                    thumbnail: '',
                    downloadUrl: fallbackUrl,
                    duration: 0,
                    fileSize: 0,
                    message: '解析成功'
                }
            });
        }
        
        const data = await response.json();
        console.log('API response:', JSON.stringify(data).substring(0, 300));
        
        // 解析 JSON 返回数据
        let downloadUrl = null;
        
        // 尝试从 JSON 中提取视频地址
        if (data && data.data) {
            if (data.data.url) {
                downloadUrl = data.data.url;
            } else if (data.data.play_url) {
                downloadUrl = data.data.play_url;
            } else if (data.data.video) {
                downloadUrl = data.data.video;
            } else if (data.data.play_urls && data.data.play_urls.length > 0) {
                downloadUrl = data.data.play_urls[0];
            }
        } else if (data && data.url) {
            downloadUrl = data.url;
        }
        
        // 如果找到视频地址，返回直接链接
        if (downloadUrl) {
            console.log('Found video URL:', downloadUrl);
            return jsonResponse({
                success: true,
                data: {
                    url: url,
                    platform: platformInfo.name,
                    contentType: platformInfo.contentType,
                    title: data?.data?.title || data?.title || `${platformInfo.name}视频`,
                    thumbnail: data?.data?.cover || data?.cover || '',
                    downloadUrl: downloadUrl,
                    duration: data?.data?.duration || data?.duration || 0,
                    fileSize: 0,
                    message: '解析成功'
                }
            });
        }
        
        // 如果没有找到，回退到播放页面
        console.log('No video URL found, fallback to play page');
        const fallbackUrl = `https://hd.iapijy.com/play?url=${encodeURIComponent(url)}`;
        
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: fallbackUrl,
                duration: 0,
                fileSize: 0,
                message: '解析成功'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
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
