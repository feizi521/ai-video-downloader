// Cloudflare Worker - 视频解析服务
// 使用 Cobalt 和 ytdown API

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

        // 尝试 Cobalt API
        try {
            console.log('Trying Cobalt API...');
            const cobaltResponse = await fetch('https://co.wuk.sh/api/json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    url: url, 
                    vCodec: 'h264', 
                    vQuality: '720', 
                    aFormat: 'best', 
                    isAudioOnly: false, 
                    isNoTTWatermark: true 
                })
            });

            console.log('Cobalt response status:', cobaltResponse.status);

            if (cobaltResponse.ok) {
                const data = await cobaltResponse.json();
                console.log('Cobalt response:', JSON.stringify(data));
                
                if (data.status === 'success' && data.url) {
                    console.log('Found video URL from Cobalt:', data.url);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: `${platformInfo.name}视频`,
                            thumbnail: '',
                            downloadUrl: data.url,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (cobaltError) {
            console.error('Cobalt error:', cobaltError.message);
        }

        // 尝试 ytdown API
        try {
            console.log('Trying ytdown API...');
            const ytdownUrl = `https://ytdown.vercel.app/api/download?url=${encodeURIComponent(url)}`;
            const ytdownResponse = await fetch(ytdownUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            console.log('ytdown response status:', ytdownResponse.status);

            if (ytdownResponse.ok) {
                const data = await ytdownResponse.json();
                console.log('ytdown response:', JSON.stringify(data));
                
                if (data.url) {
                    console.log('Found video URL from ytdown:', data.url);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: data.title || `${platformInfo.name}视频`,
                            thumbnail: data.thumbnail || '',
                            downloadUrl: data.url,
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (ytdownError) {
            console.error('ytdown error:', ytdownError.message);
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
