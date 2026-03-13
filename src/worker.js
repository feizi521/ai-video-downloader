// Cloudflare Worker - 视频解析服务

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' }
};

const VIDEO_PARSER_APIS = [
    {
        name: 'API1',
        url: 'https://api.pearktrue.cn/api/video/parse/',
        paramName: 'url',
        handler: (data) => data.video ? { title: data.title, cover: data.cover, downloadUrl: data.video } : null
    },
    {
        name: 'API2',
        url: 'https://api.linhun.vip/api/VideoParse',
        paramName: 'url',
        handler: (data) => data.data?.video ? { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video } : null
    },
    {
        name: 'API3',
        url: 'https://api.vvhan.com/api/video',
        paramName: 'url',
        handler: (data) => data.data?.url ? { title: data.data.title, cover: data.data.pic, downloadUrl: data.data.url } : null
    },
    {
        name: 'API4',
        url: 'https://api.asdj.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => data.video ? { title: data.title, cover: data.cover, downloadUrl: data.video } : null
    },
    {
        name: 'API5',
        url: 'https://api.mhimg.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => data.code === 200 && data.data?.video_url ? { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video_url } : null
    },
    {
        name: 'API6',
        url: 'https://api.52vmy.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => data.code === 200 && data.data?.video ? { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video } : null
    }
];

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

        const platformInfo = identifyPlatform(url);
        if (!platformInfo) {
            return jsonResponse({ success: false, message: '不支持的平台' }, 400);
        }

        for (const api of VIDEO_PARSER_APIS) {
            try {
                const apiUrl = new URL(api.url);
                apiUrl.searchParams.append(api.paramName, url);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(apiUrl.toString(), {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    const result = api.handler(data);
                    
                    if (result?.downloadUrl) {
                        return jsonResponse({
                            success: true,
                            data: {
                                url: url,
                                platform: platformInfo.name,
                                contentType: platformInfo.contentType,
                                title: result.title || `${platformInfo.name}视频`,
                                thumbnail: result.cover || '',
                                downloadUrl: result.downloadUrl,
                                duration: 0,
                                fileSize: 0,
                                message: '解析成功'
                            }
                        });
                    }
                }
            } catch (e) {
                console.log(`${api.name} failed:`, e.message);
            }
        }
        
        return jsonResponse({ success: false, message: '所有解析API都失败了' });
    } catch (error) {
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
