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
        handler: (data) => {
            console.log('API1 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.video) {
                return { title: data.title, cover: data.cover, downloadUrl: data.video };
            }
            return null;
        }
    },
    {
        name: 'API2',
        url: 'https://api.linhun.vip/api/VideoParse',
        paramName: 'url',
        handler: (data) => {
            console.log('API2 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.data && data.data.video) {
                return { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video };
            }
            return null;
        }
    },
    {
        name: 'API3',
        url: 'https://api.vvhan.com/api/video',
        paramName: 'url',
        handler: (data) => {
            console.log('API3 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.data && data.data.url) {
                return { title: data.data.title, cover: data.data.pic, downloadUrl: data.data.url };
            }
            return null;
        }
    },
    {
        name: 'API4',
        url: 'https://api.asdj.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => {
            console.log('API4 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.video) {
                return { title: data.title, cover: data.cover, downloadUrl: data.video };
            }
            return null;
        }
    },
    {
        name: 'API5',
        url: 'https://api.mhimg.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => {
            console.log('API5 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.code === 200 && data.data && data.data.video_url) {
                return { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video_url };
            }
            return null;
        }
    },
    {
        name: 'API6',
        url: 'https://api.52vmy.cn/api/video/parse',
        paramName: 'url',
        handler: (data) => {
            console.log('API6 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.code === 200 && data.data && data.data.video) {
                return { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video };
            }
            return null;
        }
    },
    {
        name: 'API7',
        url: 'https://api.xiaoxiaoapi.com/api/video/parse',
        paramName: 'url',
        handler: (data) => {
            console.log('API7 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.code === 200 && data.data && data.data.video_url) {
                return { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video_url };
            }
            return null;
        }
    },
    {
        name: 'API8',
        url: 'https://api.iyk0.com/shipin/',
        paramName: 'url',
        handler: (data) => {
            console.log('API8 response:', JSON.stringify(data).substring(0, 200));
            if (data && data.code === 200 && data.data && data.data.video) {
                return { title: data.data.title, cover: data.data.cover, downloadUrl: data.data.video };
            }
            return null;
        }
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

        console.log('Parsing URL:', url);

        const platformInfo = identifyPlatform(url);
        if (!platformInfo) {
            return jsonResponse({ success: false, message: '不支持的平台' }, 400);
        }

        console.log('Platform identified:', platformInfo.name);

        for (const api of VIDEO_PARSER_APIS) {
            try {
                console.log(`Trying ${api.name}...`);
                
                const apiUrl = new URL(api.url);
                apiUrl.searchParams.append(api.paramName, url);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(apiUrl.toString(), {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                console.log(`${api.name} response status:`, response.status);
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    console.log(`${api.name} content-type:`, contentType);
                    
                    // 检查是否是 JSON 响应
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await response.text();
                        console.log(`${api.name} non-JSON response:`, text.substring(0, 100));
                        continue;
                    }
                    
                    let data;
                    try {
                        data = await response.json();
                    } catch (parseError) {
                        console.log(`${api.name} JSON parse error:`, parseError.message);
                        continue;
                    }
                    
                    const result = api.handler(data);
                    
                    if (result && result.downloadUrl) {
                        console.log(`${api.name} success!`);
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
                } else {
                    console.log(`${api.name} failed with status:`, response.status);
                }
            } catch (e) {
                console.log(`${api.name} error:`, e.message);
            }
        }
        
        console.log('All APIs failed');
        return jsonResponse({ success: false, message: '所有解析API都失败了' });
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
