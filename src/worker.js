// Cloudflare Worker - 视频解析服务
// 使用外部 yt-dlp API

const SUPPORTED_PLATFORMS = {
    douyin: { name: '抖音', domains: ['douyin.com', 'iesdouyin.com'], contentType: 'video' },
    kuaishou: { name: '快手', domains: ['kuaishou.com', 'chenzhongtech.com'], contentType: 'video' },
    bilibili: { name: 'B站', domains: ['bilibili.com', 'b23.tv'], contentType: 'video' },
    youtube: { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], contentType: 'video' },
    xiaohongshu: { name: '小红书', domains: ['xiaohongshu.com', 'xhslink.com'], contentType: 'image' },
    weibo: { name: '微博', domains: ['weibo.com', 'weibo.cn'], contentType: 'mixed' }
};

// yt-dlp API 服务列表
const YTDLP_APIS = [
    {
        name: 'yt-dlp-api-1',
        url: 'https://api.yt-dlp.org/info',
        method: 'GET',
        paramName: 'url'
    },
    {
        name: 'yt-dlp-api-2',
        url: 'https://ytdl-api.herokuapp.com/info',
        method: 'GET',
        paramName: 'url'
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

        // 尝试使用 yt-dlp API 解析
        const result = await parseWithYtDlpApis(url);
        
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
                    fileSize: result.fileSize || 0,
                    message: '解析成功'
                }
            });
        }
        
        // 如果 yt-dlp API 失败，返回备用方案
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: url,
                duration: 0,
                fileSize: 0,
                message: '解析服务暂时不可用，请直接访问原链接'
            }
        });
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: error.message }, 500);
    }
}

async function parseWithYtDlpApis(url) {
    for (const api of YTDLP_APIS) {
        try {
            console.log(`Trying ${api.name}...`);
            
            const apiUrl = `${api.url}?${api.paramName}=${encodeURIComponent(url)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(apiUrl, {
                method: api.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`${api.name} response status:`, response.status);
            
            if (!response.ok) {
                console.log(`${api.name} failed:`, response.status);
                continue;
            }
            
            const data = await response.json();
            console.log(`${api.name} response:`, JSON.stringify(data).substring(0, 200));
            
            // 解析返回的数据
            const result = parseApiResponse(data, api.name);
            if (result) {
                console.log(`${api.name} success!`);
                return result;
            }
        } catch (e) {
            console.log(`${api.name} error:`, e.message);
        }
    }
    
    return null;
}

function parseApiResponse(data, apiName) {
    try {
        // 根据不同 API 的返回格式解析
        if (!data) return null;
        
        // 格式 1: { title, thumbnail, url, duration, formats: [...] }
        if (data.url || (data.formats && data.formats.length > 0)) {
            let downloadUrl = data.url;
            let fileSize = 0;
            
            if (!downloadUrl && data.formats && data.formats.length > 0) {
                // 选择最佳格式
                const bestFormat = data.formats.find(f => 
                    f.vcodec !== 'none' && f.acodec !== 'none'
                ) || data.formats[0];
                
                downloadUrl = bestFormat.url;
                fileSize = bestFormat.filesize || bestFormat.filesize_approx || 0;
            }
            
            if (downloadUrl) {
                return {
                    title: data.title || '视频',
                    thumbnail: data.thumbnail || '',
                    downloadUrl: downloadUrl,
                    duration: data.duration || 0,
                    fileSize: fileSize
                };
            }
        }
        
        // 格式 2: { success: true, data: { ... } }
        if (data.success && data.data) {
            return parseApiResponse(data.data, apiName);
        }
        
        return null;
    } catch (e) {
        console.log('Parse API response error:', e.message);
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
