// Cloudflare Worker - 视频解析服务
// 简化版本 - 返回第三方解析网站链接

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

// 第三方解析网站列表
const PARSER_SITES = [
    { name: 'SnapAny', url: 'https://snapany.com' },
    { name: 'SaveFrom', url: 'https://savefrom.net' },
    { name: 'Y2mate', url: 'https://y2mate.com' },
    { name: 'SSYouTube', url: 'https://ssyoutube.com' }
];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 添加健康检查端点
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', message: 'Worker is running' });
        }
        
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

        // 方案1: 尝试 yt-dlp 风格的 API (如果用户有自己的服务)
        // 这里可以配置用户自己的解析服务
        
        // 方案2: 返回第三方解析网站的嵌入链接
        // 生成 SnapAny 的解析链接
        const snapanyParseUrl = `https://snapany.com/#${encodeURIComponent(url)}`;
        
        // 或者使用 iframe 嵌入方案
        // 返回解析结果，前端可以用 iframe 打开
        
        return jsonResponse({
            success: true,
            data: {
                url: url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                title: `${platformInfo.name}视频`,
                thumbnail: '',
                downloadUrl: snapanyParseUrl,  // 返回第三方解析页面
                embedUrl: snapanyParseUrl,      // 可以嵌入的 URL
                parserSites: PARSER_SITES.map(site => ({
                    name: site.name,
                    url: `${site.url}/#${encodeURIComponent(url)}`
                })),
                duration: 0,
                fileSize: 0,
                message: '请使用下方链接下载',
                type: 'third_party'  // 标记为第三方解析
            }
        });
        
    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: '服务器错误: ' + error.message }, 500);
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
