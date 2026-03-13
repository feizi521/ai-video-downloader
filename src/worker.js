// Cloudflare Worker - 视频解析服务
// 使用多个可用的解析 API

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

        // API 1: yyy001.com
        try {
            console.log('Trying yyy001.com API...');
            const apiUrl = `https://api.yyy001.com/api/videoparse?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('yyy001.com response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('yyy001.com response:', JSON.stringify(data).substring(0, 1000));
                
                const videoUrl = extractVideoUrl(data);
                if (videoUrl) {
                    console.log('Found video URL from yyy001.com:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: extractTitle(data, platformInfo.name),
                            thumbnail: extractThumbnail(data),
                            downloadUrl: videoUrl,
                            duration: extractDuration(data),
                            fileSize: extractFileSize(data),
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('yyy001.com error:', error.message);
        }

        // API 2: jkapi.com
        try {
            console.log('Trying jkapi.com API...');
            const apiUrl = `https://jkapi.com/api/jx_all?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('jkapi.com response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('jkapi.com response:', JSON.stringify(data).substring(0, 1000));
                
                const videoUrl = extractVideoUrl(data);
                if (videoUrl) {
                    console.log('Found video URL from jkapi.com:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: extractTitle(data, platformInfo.name),
                            thumbnail: extractThumbnail(data),
                            downloadUrl: videoUrl,
                            duration: extractDuration(data),
                            fileSize: extractFileSize(data),
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('jkapi.com error:', error.message);
        }

        // API 3: obtaindown.com
        try {
            console.log('Trying obtaindown.com API...');
            const apiUrl = `https://api.obtaindown.com/obApi/api/analysis?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('obtaindown.com response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('obtaindown.com response:', JSON.stringify(data).substring(0, 1000));
                
                const videoUrl = extractVideoUrl(data);
                if (videoUrl) {
                    console.log('Found video URL from obtaindown.com:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: extractTitle(data, platformInfo.name),
                            thumbnail: extractThumbnail(data),
                            downloadUrl: videoUrl,
                            duration: extractDuration(data),
                            fileSize: extractFileSize(data),
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('obtaindown.com error:', error.message);
        }

        // API 4: alapi.cn
        try {
            console.log('Trying alapi.cn API...');
            const apiUrl = `https://v1.alapi.cn/api/video/url?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            console.log('alapi.cn response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('alapi.cn response:', JSON.stringify(data).substring(0, 1000));
                
                const videoUrl = extractVideoUrl(data);
                if (videoUrl) {
                    console.log('Found video URL from alapi.cn:', videoUrl);
                    return jsonResponse({
                        success: true,
                        data: {
                            url: url,
                            platform: platformInfo.name,
                            contentType: platformInfo.contentType,
                            title: extractTitle(data, platformInfo.name),
                            thumbnail: extractThumbnail(data),
                            downloadUrl: videoUrl,
                            duration: extractDuration(data),
                            fileSize: extractFileSize(data),
                            message: '解析成功'
                        }
                    });
                }
            }
        } catch (error) {
            console.error('alapi.cn error:', error.message);
        }

        return jsonResponse({ success: false, message: '所有解析接口都失败了，请稍后再试' }, 500);

    } catch (error) {
        console.error('Parse error:', error.message);
        return jsonResponse({ success: false, message: '服务器错误: ' + error.message }, 500);
    }
}

// 提取视频 URL
function extractVideoUrl(data) {
    const d = data.data || data.result || data;
    return d.videoUrl || d.url || d.playUrl || d.downloadUrl || d.video_url || d.play_url || d.src || d.video;
}

// 提取标题
function extractTitle(data, defaultTitle) {
    const d = data.data || data.result || data;
    return d.title || d.desc || d.description || d.name || defaultTitle;
}

// 提取缩略图
function extractThumbnail(data) {
    const d = data.data || data.result || data;
    return d.cover || d.thumbnail || d.pic || d.image || d.poster || '';
}

// 提取时长
function extractDuration(data) {
    const d = data.data || data.result || data;
    return d.duration || d.time || 0;
}

// 提取文件大小
function extractFileSize(data) {
    const d = data.data || data.result || data;
    return d.size || d.fileSize || 0;
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
