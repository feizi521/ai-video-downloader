// Cloudflare Worker - 视频解析服务
// 使用多个解析 API

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' },
    twitter: { name: 'Twitter', domains: ['twitter.com', 'x.com'], contentType: 'video' },
    instagram: { name: 'Instagram', domains: ['instagram.com'], contentType: 'video' },
    facebook: { name: 'Facebook', domains: ['facebook.com', 'fb.watch'], contentType: 'video' }
};

// 多个解析 API 配置
const PARSER_APIS = [
    {
        name: 'cobalt',
        url: 'https://co.wuk.sh/api/json',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        },
        body: (url) => JSON.stringify({ 
            url: url, 
            vCodec: 'h264', 
            vQuality: '720', 
            aFormat: 'best', 
            isAudioOnly: false, 
            isNoTTWatermark: true 
        }),
        parseResponse: async (response) => {
            const data = await response.json();
            console.log('Cobalt response:', data);
            if (data.status === 'success' && data.url) {
                return {
                    url: data.url,
                    title: '',
                    thumbnail: ''
                };
            }
            return null;
        }
    },
    {
        name: 'ytdown',
        url: 'https://ytdown.vercel.app/api/download',
        method: 'GET',
        paramName: 'url',
        parseResponse: async (response) => {
            const data = await response.json();
            console.log('Ytdown response:', data);
            if (data.url) {
                return {
                    url: data.url,
                    title: data.title || '',
                    thumbnail: data.thumbnail || ''
                };
            }
            return null;
        }
    },
    {
        name: 'jy-play',
        url: 'https://hd.iapijy.com/play',
        method: 'GET',
        paramName: 'url',
        parseResponse: async (response, url) => {
            return {
                url: `https://hd.iapijy.com/play?url=${encodeURIComponent(url)}`,
                title: '',
                thumbnail: ''
            };
        }
    }
];

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

        for (const api of PARSER_APIS) {
            try {
                console.log(`Trying API: ${api.name}`);
                
                let response;
                
                if (api.method === 'POST') {
                    response = await fetch(api.url, {
                        method: 'POST',
                        headers: api.headers,
                        body: api.body(url)
                    });
                } else {
                    const apiUrl = `${api.url}?${api.paramName}=${encodeURIComponent(url)}`;
                    response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: api.headers || {}
                    });
                }

                console.log(`${api.name} response status:`, response.status);

                if (response.ok) {
                    const result = await api.parseResponse(response, url);
                    
                    if (result && result.url) {
                        console.log(`Found video URL from ${api.name}:`, result.url);
                        return jsonResponse({
                            success: true,
                            data: {
                                url: url,
                                platform: platformInfo.name,
                                contentType: platformInfo.contentType,
                                title: result.title || `${platformInfo.name}视频`,
                                thumbnail: result.thumbnail || '',
                                downloadUrl: result.url,
                                duration: 0,
                                fileSize: 0,
                                message: '解析成功'
                            }
                        });
                    }
                }
            } catch (apiError) {
                console.error(`${api.name} error:`, apiError.message);
            }
        }

        return jsonResponse({ success: false, message: '所有解析接口都失败了' }, 500);
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
