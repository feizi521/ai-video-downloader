// Cloudflare Worker - 视频解析服务
// 使用多个可靠的解析 API

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

        // 尝试 savefrom.net API (通过 savefrom.do)
        try {
            console.log('Trying savefrom API...');
            const savefromUrl = `https://savefrom.do/api/v1/info?url=${encodeURIComponent(url)}`;
            const response = await fetch(savefromUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log('savefrom response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('savefrom response:', JSON.stringify(data).substring(0, 500));
                
                if (data.url || (data.data && data.data.url)) {
                    const videoUrl = data.url || data.data.url;
                    console.log('Found video URL from savefrom:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: data.title || data.data?.title || `${platformInfo.name}视频`,
                            thumbnail: data.thumbnail || data.data?.thumbnail || '',
                            downloadUrl: videoUrl,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('savefrom error:', error.message);
        }

        // 尝试 ssyoutube API
        try {
            console.log('Trying ssyoutube API...');
            const ssyoutubeUrl = `https://ssyoutube.com/api/convert?url=${encodeURIComponent(url)}`;
            const response = await fetch(ssyoutubeUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log('ssyoutube response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('ssyoutube response:', JSON.stringify(data).substring(0, 500));
                
                if (data.url || (data.data && data.data.url)) {
                    const videoUrl = data.url || data.data.url;
                    console.log('Found video URL from ssyoutube:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: data.title || data.data?.title || `${platformInfo.name}视频`,
                            thumbnail: data.thumbnail || data.data?.thumbnail || '',
                            downloadUrl: videoUrl,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('ssyoutube error:', error.message);
        }

        // 尝试 y2mate API
        try {
            console.log('Trying y2mate API...');
            const y2mateUrl = `https://y2mate.com/api/v1/info?url=${encodeURIComponent(url)}`;
            const response = await fetch(y2mateUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log('y2mate response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('y2mate response:', JSON.stringify(data).substring(0, 500));
                
                if (data.url || (data.data && data.data.url)) {
                    const videoUrl = data.url || data.data.url;
                    console.log('Found video URL from y2mate:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: data.title || data.data?.title || `${platformInfo.name}视频`,
                            thumbnail: data.thumbnail || data.data?.thumbnail || '',
                            downloadUrl: videoUrl,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('y2mate error:', error.message);
        }

        return jsonResponse({ success: false, message: '所有解析接口都失败了，请稍后再试' }, 500);
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
