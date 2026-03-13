// Cloudflare Worker - 视频解析服务
// 使用 layzz.cn API

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

        // 使用 layzz.cn API
        try {
            console.log('Trying layzz.cn API...');
            
            // 使用测试 token，生产环境应该使用自己的 token
            const token = 'uuic-qackd-fga-test';
            const apiUrl = `https://analyse.layzz.cn/lyz/getAnalyse?token=${token}&link=${encodeURIComponent(url)}`;
            
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('layzz.cn response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('layzz.cn response:', JSON.stringify(data).substring(0, 1000));
                
                // 根据 layzz.cn 的响应格式解析
                // 假设返回格式为: { code: 200, data: { videoUrl: 'xxx', title: 'xxx' }, msg: 'success' }
                if (data.code === 200 || data.success === true) {
                    const videoData = data.data || data;
                    const videoUrl = videoData.videoUrl || videoData.url || videoData.playUrl || videoData.downloadUrl;
                    const title = videoData.title || videoData.desc || `${platformInfo.name}视频`;
                    const thumbnail = videoData.cover || videoData.thumbnail || videoData.pic || '';
                    
                    if (videoUrl) {
                        console.log('Found video URL from layzz.cn:', videoUrl);
                        return jsonResponse({
                            success: true,
                            data: {
                                url: url,
                                platform: platformInfo.name,
                                contentType: platformInfo.contentType,
                                title: title,
                                thumbnail: thumbnail,
                                downloadUrl: videoUrl,
                                duration: videoData.duration || 0,
                                fileSize: videoData.size || 0,
                                message: '解析成功'
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('layzz.cn error:', error.message);
        }

        return jsonResponse({ success: false, message: '解析失败，请稍后再试' }, 500);
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
