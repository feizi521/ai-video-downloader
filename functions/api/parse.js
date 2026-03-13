const SUPPORTED_PLATFORMS = {
    douyin: {
        name: '抖音',
        domains: ['douyin.com', 'iesdouyin.com'],
        contentType: 'video'
    },
    kuaishou: {
        name: '快手',
        domains: ['kuaishou.com', 'chenzhongtech.com'],
        contentType: 'video'
    },
    bilibili: {
        name: 'B站',
        domains: ['bilibili.com', 'b23.tv'],
        contentType: 'video'
    },
    youtube: {
        name: 'YouTube',
        domains: ['youtube.com', 'youtu.be'],
        contentType: 'video'
    },
    xiaohongshu: {
        name: '小红书',
        domains: ['xiaohongshu.com', 'xhslink.com'],
        contentType: 'image'
    },
    weibo: {
        name: '微博',
        domains: ['weibo.com', 'weibo.cn'],
        contentType: 'mixed'
    }
};

// 视频解析 API 列表
const VIDEO_PARSER_APIS = [
    {
        name: '解析API1',
        url: 'https://api.pearktrue.cn/api/video/parse/',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.video) {
                return {
                    success: true,
                    title: data.title || '未知标题',
                    cover: data.cover || '',
                    downloadUrl: data.video,
                    platform: data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    },
    {
        name: '解析API2',
        url: 'https://api.linhun.vip/api/VideoParse',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.data && data.data.video) {
                return {
                    success: true,
                    title: data.data.title || '未知标题',
                    cover: data.data.cover || '',
                    downloadUrl: data.data.video,
                    platform: data.data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    },
    {
        name: '解析API3',
        url: 'https://api.vvhan.com/api/video',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.data && data.data.url) {
                return {
                    success: true,
                    title: data.data.title || '未知标题',
                    cover: data.data.pic || '',
                    downloadUrl: data.data.url,
                    platform: data.data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    },
    {
        name: '解析API4',
        url: 'https://api.asdj.cn/api/video/parse',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.video) {
                return {
                    success: true,
                    title: data.title || '未知标题',
                    cover: data.cover || '',
                    downloadUrl: data.video,
                    platform: data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    },
    {
        name: '解析API5',
        url: 'https://api.mhimg.cn/api/video/parse',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.code === 200 && data.data && data.data.video_url) {
                return {
                    success: true,
                    title: data.data.title || '未知标题',
                    cover: data.data.cover || '',
                    downloadUrl: data.data.video_url,
                    platform: data.data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    },
    {
        name: '解析API6',
        url: 'https://api.52vmy.cn/api/video/parse',
        method: 'GET',
        paramName: 'url',
        responseHandler: (data) => {
            if (data && data.code === 200 && data.data && data.data.video) {
                return {
                    success: true,
                    title: data.data.title || '未知标题',
                    cover: data.data.cover || '',
                    downloadUrl: data.data.video,
                    platform: data.data.platform || '未知平台'
                };
            }
            return { success: false };
        }
    }
];

export async function onRequestPost(context) {
    try {
        const { url } = await context.request.json();
        
        if (!url) {
            return jsonResponse({
                success: false,
                message: '请提供有效的链接'
            }, 400);
        }

        const platformInfo = identifyPlatform(url);
        
        if (!platformInfo) {
            return jsonResponse({
                success: false,
                message: '不支持的平台或链接格式不正确'
            }, 400);
        }

        // 尝试使用解析 API 获取真实下载地址
        const parseResult = await parseWithAPIs(url, platformInfo);
        
        return jsonResponse(parseResult);
    } catch (error) {
        console.error('Parse error:', error);
        return jsonResponse({
            success: false,
            message: '解析失败，请稍后重试: ' + error.message
        }, 500);
    }
}

export async function onRequestGet(context) {
    return jsonResponse({
        success: false,
        message: '请使用 POST 方法'
    }, 405);
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

// 尝试使用多个解析 API
async function parseWithAPIs(url, platformInfo) {
    let lastError = null;
    
    for (const api of VIDEO_PARSER_APIS) {
        try {
            console.log(`尝试使用 ${api.name} 解析...`);
            
            const apiUrl = new URL(api.url);
            apiUrl.searchParams.append(api.paramName, url);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(apiUrl.toString(), {
                method: api.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                const result = api.responseHandler(data);
                
                if (result.success && result.downloadUrl) {
                    console.log(`${api.name} 解析成功`);
                    return {
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
                            message: '解析成功，点击下载按钮即可下载视频'
                        }
                    };
                }
            }
        } catch (error) {
            console.error(`${api.name} 解析失败:`, error);
            lastError = error;
        }
    }
    
    let errorMessage = '所有解析API都失败了';
    if (lastError && lastError.name === 'AbortError') {
        errorMessage = '请求超时，请检查网络连接';
    }
    
    return { 
        success: false, 
        message: errorMessage + '，请稍后重试或使用其他工具' 
    };
}

function identifyPlatform(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
            if (platform.domains.some(domain => hostname.includes(domain))) {
                return { key, ...platform };
            }
        }
        
        return null;
    } catch {
        return null;
    }
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
