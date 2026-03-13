const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);
const app = express();

// 启用 CORS
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'yt-dlp API is running',
        endpoints: {
            parse: 'POST /api/parse',
            info: 'GET /api/info?url=VIDEO_URL'
        }
    });
});

// 解析视频信息
app.post('/api/parse', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                message: '请提供视频链接' 
            });
        }

        console.log('Parsing URL:', url);

        // 使用 yt-dlp 获取视频信息
        const result = await getVideoInfo(url);
        
        if (result) {
            return res.json({
                success: true,
                data: result
            });
        } else {
            return res.status(500).json({
                success: false,
                message: '无法解析视频信息'
            });
        }
    } catch (error) {
        console.error('Parse error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 获取视频信息（GET 方式）
app.get('/api/info', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                message: '请提供视频链接' 
            });
        }

        console.log('Getting info for:', url);

        const result = await getVideoInfo(url);
        
        if (result) {
            return res.json(result);
        } else {
            return res.status(500).json({
                success: false,
                message: '无法解析视频信息'
            });
        }
    } catch (error) {
        console.error('Info error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 使用 yt-dlp 获取视频信息
async function getVideoInfo(url) {
    try {
        // 构建 yt-dlp 命令
        const command = `yt-dlp -j --no-warnings "${url}"`;
        
        console.log('Executing:', command);
        
        const { stdout, stderr } = await execAsync(command, {
            timeout: 60000,  // 60秒超时
            maxBuffer: 1024 * 1024 * 10  // 10MB 缓冲区
        });
        
        if (stderr) {
            console.log('yt-dlp stderr:', stderr);
        }
        
        if (!stdout) {
            console.log('No output from yt-dlp');
            return null;
        }
        
        // 解析 JSON 输出
        const info = JSON.parse(stdout);
        
        console.log('Video info retrieved:', info.title);
        
        // 提取下载链接（选择最佳质量）
        let downloadUrl = null;
        let fileSize = 0;
        
        if (info.formats && info.formats.length > 0) {
            // 优先选择有视频和音频的格式
            const bestFormat = info.formats.find(f => 
                f.vcodec !== 'none' && f.acodec !== 'none' && f.ext === 'mp4'
            ) || info.formats.find(f => 
                f.vcodec !== 'none' && f.acodec !== 'none'
            ) || info.formats[0];
            
            downloadUrl = bestFormat.url;
            fileSize = bestFormat.filesize || bestFormat.filesize_approx || 0;
        }
        
        // 如果没有找到格式，使用直接链接
        if (!downloadUrl && info.url) {
            downloadUrl = info.url;
        }
        
        return {
            title: info.title || '未知标题',
            description: info.description || '',
            thumbnail: info.thumbnail || '',
            duration: info.duration || 0,
            uploader: info.uploader || '',
            uploadDate: info.upload_date || '',
            downloadUrl: downloadUrl,
            fileSize: fileSize,
            formats: info.formats ? info.formats.map(f => ({
                formatId: f.format_id,
                ext: f.ext,
                quality: f.quality,
                resolution: f.resolution,
                filesize: f.filesize,
                url: f.url
            })) : []
        };
    } catch (error) {
        console.error('yt-dlp error:', error.message);
        return null;
    }
}

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`yt-dlp API server running on port ${PORT}`);
});

module.exports = app;
