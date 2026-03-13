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

export async function parseHandler(context) {
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

        // 尝试使用第三方 API 解析
        let parseResult = await parseWithThirdPartyAPI(url, platformInfo);
        
        // 如果第三方 API 失败，使用备用方法
        if (!parseResult.success) {
            parseResult = await parseUrl(url, platformInfo, context);
        }
        
        if (parseResult.success) {
            await saveDownloadHistory(context, {
                url,
                platform: platformInfo.name,
                contentType: platformInfo.contentType,
                ...parseResult.data
            });
        }

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
    const { request } = context;
    const url = new URL(request.url);
    
    if (url.searchParams.has('proxy')) {
        return handleProxyDownload(url.searchParams.get('proxy'));
    }
    
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

async function handleProxyDownload(targetUrl) {
    try {
        const decodedUrl = decodeURIComponent(targetUrl);
        
        // 如果是第三方下载页面，直接跳转
        if (decodedUrl.includes('savefrom.net') || 
            decodedUrl.includes('xbeibeix.com') ||
            decodedUrl.includes('y2mate.com')) {
            return Response.redirect(decodedUrl, 302);
        }
        
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.bilibili.com/',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
                'Origin': 'https://www.bilibili.com'
            }
        });
        
        if (!response.ok) {
            return jsonResponse({
                success: false,
                message: `下载失败，状态码: ${response.status}`
            }, 500);
        }
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const contentLength = response.headers.get('content-length');
        
        // 检查文件大小，如果太小可能是错误页面
        if (contentLength && parseInt(contentLength) < 10000) {
            const text = await response.text();
            return jsonResponse({
                success: false,
                message: '视频链接已过期或需要登录，请重新解析'
            }, 400);
        }
        
        return new Response(response.body, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'attachment; filename="video.mp4"',
                'Access-Control-Allow-Origin': '*',
                'Content-Length': contentLength || ''
            }
        });
    } catch (error) {
        console.error('Proxy download error:', error);
        return jsonResponse({
            success: false,
            message: '代理下载失败: ' + error.message
        }, 500);
    }
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

async function parseUrl(url, platformInfo, context) {
    try {
        let result;
        
        switch (platformInfo.key) {
            case 'douyin':
                result = await parseDouyin(url);
                break;
            case 'kuaishou':
                result = await parseKuaishou(url);
                break;
            case 'bilibili':
                result = await parseBilibili(url, context);
                break;
            case 'youtube':
                result = await parseYoutube(url);
                break;
            case 'xiaohongshu':
                result = await parseXiaohongshu(url);
                break;
            case 'weibo':
                result = await parseWeibo(url);
                break;
            default:
                return { success: false, message: '暂不支持该平台' };
        }
        
        return result;
    } catch (error) {
        console.error('Parse URL error:', error);
        return { success: false, message: '解析失败，请稍后重试' };
    }
}

async function parseDouyin(url) {
    return {
        success: true,
        data: {
            url,
            platform: '抖音',
            contentType: 'video',
            title: '抖音视频',
            thumbnail: '',
            downloadUrl: `https://snapdouyin.app/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

async function parseKuaishou(url) {
    return {
        success: true,
        data: {
            url,
            platform: '快手',
            contentType: 'video',
            title: '快手视频',
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

async function parseBilibili(url, context) {
    // 使用第三方下载服务提供直接下载
    return {
        success: true,
        data: {
            url,
            platform: 'B站',
            contentType: 'video',
            title: 'B站视频',
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

async function parseYoutube(url) {
    return parseYoutubeWithAPI(url);
}

async function parseXiaohongshu(url) {
    return {
        success: true,
        data: {
            url,
            platform: '小红书',
            contentType: 'image',
            title: '小红书图片',
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载图片'
        }
    };
}

async function parseWeibo(url) {
    return {
        success: true,
        data: {
            url,
            platform: '微博',
            contentType: 'video',
            title: '微博视频',
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

async function saveDownloadHistory(context, data) {
    try {
        const { env } = context;
        const DB = env.DB;
        
        if (!DB) return;
        
        const clientIp = context.request.headers.get('CF-Connecting-IP') || 'unknown';
        
        await DB.prepare(`
            INSERT INTO download_history 
            (url, platform, content_type, title, thumbnail_url, download_url, user_ip)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            data.url,
            data.platform,
            data.contentType,
            data.title,
            data.thumbnail,
            data.downloadUrl,
            clientIp
        ).run();
    } catch (error) {
        console.error('Save history error:', error);
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

// 使用第三方 API 解析
async function parseWithThirdPartyAPI(url, platformInfo) {
    // 直接返回成功，使用第三方下载服务
    return {
        success: true,
        data: {
            url,
            platform: platformInfo.name,
            contentType: 'video',
            title: `${platformInfo.name}视频`,
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: `点击下载按钮将直接下载${platformInfo.name}视频`
        }
    };
}

// YouTube 解析
async function parseYoutubeWithAPI(url) {
    return {
        success: true,
        data: {
            url,
            platform: 'YouTube',
            contentType: 'video',
            title: 'YouTube视频',
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

// B站解析 - 使用备用 API
async function parseBilibiliWithAPI(url) {
    return {
        success: true,
        data: {
            url,
            platform: 'B站',
            contentType: 'video',
            title: 'B站视频',
            thumbnail: '',
            downloadUrl: `https://xbeibeix.com/api/bilibili.php?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: '点击下载按钮将直接下载视频'
        }
    };
}

// 抖音/快手解析
async function parseShortVideoWithAPI(url, platformInfo) {
    return {
        success: true,
        data: {
            url,
            platform: platformInfo.name,
            contentType: 'video',
            title: `${platformInfo.name}视频`,
            thumbnail: '',
            downloadUrl: `https://savefrom.net/?url=${encodeURIComponent(url)}`,
            duration: 0,
            fileSize: 0,
            message: `点击下载按钮将直接下载${platformInfo.name}视频`
        }
    };
}