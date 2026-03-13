export async function downloadHandler(context) {
    const { request } = context;
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
        return jsonResponse({
            success: false,
            message: '请提供下载链接'
        }, 400);
    }
    
    try {
        const decodedUrl = decodeURIComponent(targetUrl);
        
        // 判断平台类型
        let referer = 'https://www.bilibili.com/';
        let origin = 'https://www.bilibili.com';
        
        if (decodedUrl.includes('douyin.com')) {
            referer = 'https://www.douyin.com/';
            origin = 'https://www.douyin.com';
        } else if (decodedUrl.includes('kuaishou.com')) {
            referer = 'https://www.kuaishou.com/';
            origin = 'https://www.kuaishou.com';
        }
        
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': referer,
                'Origin': origin,
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive'
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
        
        // 检查文件大小
        if (contentLength && parseInt(contentLength) < 10000) {
            return jsonResponse({
                success: false,
                message: '视频链接已过期或需要登录，请重新解析'
            }, 400);
        }
        
        // 生成文件名
        const urlObj = new URL(decodedUrl);
        const pathname = urlObj.pathname;
        const ext = pathname.split('.').pop() || 'mp4';
        const filename = `video_${Date.now()}.${ext}`;
        
        return new Response(response.body, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Length': contentLength || ''
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        return jsonResponse({
            success: false,
            message: '下载失败: ' + error.message
        }, 500);
    }
}

export async function onRequestGet(context) {
    return downloadHandler(context);
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}