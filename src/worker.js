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

        // 尝试多个解析服务
        const result = await tryMultipleParsers(url);
        
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
        
        // 如果所有解析都失败，返回通用的解析方案
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: url,  // 返回原链接
                duration: 0,
                fileSize: 0,
                message: '解析服务暂时不可用，请直接访问原链接下载'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
    }
}

async function tryMultipleParsers(url) {
    // 尝试多个解析 API
    const parsers = [
        { name: 'parser1', fn: () => parseWithSaveFrom(url) },
        { name: 'parser2', fn: () => parseWithY2Mate(url) },
        { name: 'parser3', fn: () => parseWithLoader(url) }
    ];
    
    for (const parser of parsers) {
        try {
            console.log(`Trying ${parser.name}...`);
            const result = await parser.fn();
            if (result && result.downloadUrl) {
                console.log(`${parser.name} success!`);
                return result;
            }
        } catch (e) {
            console.log(`${parser.name} failed:`, e.message);
        }
    }
    
    return null;
}

async function parseWithSaveFrom(url) {
    // savefrom.net 解析
    try {
        const apiUrl = `https://savefrom.net/savefrom.php?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data && data.url) {
            return {
                title: data.title || '视频',
                thumbnail: data.thumbnail || '',
                downloadUrl: data.url,
                duration: data.duration || 0
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function parseWithY2Mate(url) {
    // y2mate 解析（主要支持 YouTube）
    try {
        if (!url.includes('youtube') && !url.includes('youtu.be')) {
            return null;  // 只支持 YouTube
        }
        
        const apiUrl = `https://y2mate.com/analyze/ajax`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: new URLSearchParams({
                url: url,
                q_auto: '0'
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data && data.result && data.result.id) {
            // 获取下载链接
            const convertUrl = 'https://y2mate.com/convert/ajax';
            const convertResponse = await fetch(convertUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    type: 'youtube',
                    id: data.result.id,
                    quality: '720'
                })
            });
            
            const convertData = await convertResponse.json();
            if (convertData && convertData.result) {
                return {
                    title: data.result.title || 'YouTube视频',
                    thumbnail: data.result.thumbnail || '',
                    downloadUrl: convertData.result,
                    duration: 0
                };
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function parseWithLoader(url) {
    // loader.to 解析
    try {
        const apiUrl = `https://loader.to/ajax/download.php`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: new URLSearchParams({
                url: url,
                format: 'mp4'
            })
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data && data.url) {
            return {
                title: data.title || '视频',
                thumbnail: data.thumbnail || '',
                downloadUrl: data.url,
                duration: data.duration || 0
            };
        }
        return null;
    } catch (e) {
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
