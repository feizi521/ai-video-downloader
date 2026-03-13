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
            
            // 使用测试 token
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

            // 获取响应文本
            const responseText = await response.text();
            console.log('layzz.cn raw response:', responseText.substring(0, 2000));

            // 尝试解析 JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.log('Response is not JSON, trying to extract URL from HTML...');
                // 如果返回的是 HTML，尝试提取视频 URL
                const videoMatch = responseText.match(/(https?:\/\/[^\s"<>]+\.(mp4|m3u8))/i);
                if (videoMatch) {
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: `${platformInfo.name}视频`,
                            thumbnail: '',
                            downloadUrl: videoMatch[1],
                            duration: 0,
                            fileSize: 0,
                            message: '解析成功'
                        }
                    });
                }
                return jsonResponse({ success: false, message: 'API返回格式错误' }, 500);
            }

            console.log('layzz.cn parsed response:', JSON.stringify(data).substring(0, 1000));
            
            // 根据 layzz.cn 的响应格式解析
            // 尝试多种可能的响应格式
            let videoUrl = null;
            let title = `${platformInfo.name}视频`;
            let thumbnail = '';
            
            if (data.code === 200 || data.success === true || data.status === 'ok') {
                const videoData = data.data || data.result || data;
                
                // 尝试多种可能的字段名
                videoUrl = videoData.videoUrl || 
                          videoData.url || 
                          videoData.playUrl || 
                          videoData.downloadUrl ||
                          videoData.video_url ||
                          videoData.play_url ||
                          videoData.src;
                          
                title = videoData.title || 
                       videoData.desc || 
                       videoData.description ||
                       videoData.name ||
                       title;
                       
                thumbnail = videoData.cover || 
                           videoData.thumbnail || 
                           videoData.pic ||
                           videoData.image ||
                           videoData.poster ||
                           '';
            }
            
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
            } else {
                console.log('No video URL found in response');
            }
        } catch (error) {
            console.error('layzz.cn error:', error.message);
            console.error('layzz.cn error stack:', error.stack);
        }

        return jsonResponse({ success: false, message: '解析失败，请稍后再试' }, 500);
    } catch (error) {
        console.error('Parse error:', error.message);
        console.error('Parse error stack:', error.stack);
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
