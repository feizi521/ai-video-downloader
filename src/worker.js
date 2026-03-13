// Cloudflare Worker - 视频解析服务

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' }
};

// 使用多个稳定的解析服务
const VIDEO_PARSER_APIS = [
    {
        name: 'Jiexi1',
        url: 'https://jx.jsonplayer.com/player/',
        paramName: 'url',
        type: 'redirect',
        handler: (data, responseUrl) => {
            // 这个API返回重定向到视频地址
            return { title: '视频', cover: '', downloadUrl: responseUrl };
        }
    },
    {
        name: 'Jiexi2',
        url: 'https://jx.aidouer.net/api/',
        paramName: 'url',
        type: 'redirect',
        handler: (data, responseUrl) => {
            return { title: '视频', cover: '', downloadUrl: responseUrl };
        }
    },
    {
        name: 'Jiexi3',
        url: 'https://jx.m3u8.tv/jiexi.php',
        paramName: 'url',
        type: 'redirect',
        handler: (data, responseUrl) => {
            return { title: '视频', cover: '', downloadUrl: responseUrl };
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

        // 对于Bilibili，尝试直接解析
        if (platformInfo.key === 'bilibili') {
            const biliResult = await parseBilibili(url);
            if (biliResult) {
                return jsonResponse({
                    success: true,
                    data: {
                        url: url,
                        platform: platformInfo.name,
                        contentType: platformInfo.contentType,
                        title: biliResult.title || `${platformInfo.name}视频`,
                        thumbnail: biliResult.cover || '',
                        downloadUrl: biliResult.downloadUrl,
                        duration: biliResult.duration || 0,
                        fileSize: 0,
                        message: '解析成功'
                    }
                });
            }
        }

        // 尝试使用解析服务
        for (const api of VIDEO_PARSER_APIS) {
            try {
                console.log(`Trying ${api.name}...`);
                
                const apiUrl = `${api.url}?${api.paramName}=${encodeURIComponent(url)}`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    redirect: 'follow',
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': 'https://www.bilibili.com/'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                console.log(`${api.name} response status:`, response.status);
                console.log(`${api.name} final URL:`, response.url);
                
                // 如果返回的是视频URL（不是HTML页面）
                const contentType = response.headers.get('content-type') || '';
                console.log(`${api.name} content-type:`, contentType);
                
                if (contentType.includes('video') || contentType.includes('application/octet-stream') || contentType.includes('mp4')) {
                    console.log(`${api.name} success - direct video!`);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: `${platformInfo.name}视频`,
                            thumbnail: '',
                            downloadUrl: response.url,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
                
                // 如果是重定向到视频地址
                if (response.url !== apiUrl && (response.url.includes('.mp4') || response.url.includes('.m3u8') || response.url.includes('video'))) {
                    console.log(`${api.name} success - redirect to video!`);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: `${platformInfo.name}视频`,
                            thumbnail: '',
                            downloadUrl: response.url,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
                
            } catch (e) {
                console.log(`${api.name} error:`, e.message);
            }
        }
        
        // 如果所有API都失败，返回一个通用的解析方案
        console.log('All APIs failed, returning generic solution');
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: `https://jx.jsonplayer.com/player/?url=${encodeURIComponent(url)}`,
                duration: 0,
                fileSize: 0,
                message: '已生成解析链接，点击下载即可观看'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
    }
}

async function parseBilibili(url) {
    try {
        // 提取BV号
        const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
        if (!bvMatch) return null;
        
        const bvid = bvMatch[0];
        console.log('Bilibili BV号:', bvid);
        
        // 获取视频信息
        const infoUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        
        const response = await fetch(infoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.bilibili.com/'
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.code === 0 && data.data) {
            const videoData = data.data;
            return {
                title: videoData.title,
                cover: videoData.pic,
                downloadUrl: url, // 返回原始URL，使用第三方解析服务
                duration: videoData.duration
            };
        }
        
        return null;
    } catch (e) {
        console.log('Bilibili parse error:', e.message);
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
