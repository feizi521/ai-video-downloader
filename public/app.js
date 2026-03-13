// API 配置 - 纯前端方案，直接调用第三方解析API
const VIDEO_PARSER_APIS = [
    {
        name: 'API1',
        url: 'https://api.pearktrue.cn/api/video/parse/',
        method: 'GET',
        paramName: 'url'
    },
    {
        name: 'API2',
        url: 'https://api.linhun.vip/api/VideoParse',
        method: 'GET',
        paramName: 'url'
    }
];

// 支持的平台
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

// 确保使用 HTTPS
function ensureHttps(url) {
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    return url;
}

class VideoDownloader {
    constructor() {
        console.log('VideoDownloader 正在初始化...');
        
        this.urlInput = document.getElementById('urlInput');
        this.parseBtn = document.getElementById('parseBtn');
        this.resultSection = document.getElementById('resultSection');
        this.errorSection = document.getElementById('errorSection');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        console.log('DOM 元素:', {
            urlInput: this.urlInput,
            parseBtn: this.parseBtn,
            resultSection: this.resultSection,
            errorSection: this.errorSection,
            historyList: this.historyList,
            clearHistoryBtn: this.clearHistoryBtn
        });
        
        // 初始化变量
        this.currentDownloadUrl = '';
        this.currentPlatform = '';
        this.downloadId = '';
        this.isDownloading = false;
        
        this.init();
    }

    init() {
        console.log('init() 方法被调用');
        
        if (this.parseBtn) {
            this.parseBtn.addEventListener('click', () => {
                console.log('解析按钮被点击');
                this.parseUrl();
            });
            console.log('解析按钮事件监听器已添加');
        } else {
            console.error('找不到解析按钮元素!');
        }
        
        if (this.urlInput) {
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('Enter 键被按下');
                    this.parseUrl();
                }
            });
            console.log('输入框事件监听器已添加');
        }
        
        if (this.clearHistoryBtn) {
            this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadVideo());
        }
        
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyLink());
        }
        
        this.loadHistory();
        console.log('init() 完成');
    }

    async parseUrl() {
        console.log('parseUrl() 被调用');
        let inputText = this.urlInput.value.trim();
        console.log('输入的文本:', inputText);
        
        if (!inputText) {
            this.showError('请输入有效的链接');
            return;
        }

        // 从输入文本中提取 URL
        const url = this.extractUrl(inputText);
        console.log('提取的URL:', url);
        
        if (!url) {
            this.showError('链接格式不正确，请检查后重试');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showError('链接格式不正确，请检查后重试');
            return;
        }

        // 识别平台
        const platformInfo = this.identifyPlatform(url);
        if (!platformInfo) {
            this.showError('不支持的平台或链接格式不正确');
            return;
        }

        this.setLoading(true);
        this.hideResults();

        try {
            // 纯前端方案：直接调用解析API
            const parseResult = await this.parseWithAPIs(url, platformInfo);
            
            if (parseResult.success) {
                this.showResult(parseResult.data);
                this.addToHistory(parseResult.data);
            } else {
                this.showError(parseResult.message || '解析失败，请检查链接');
            }
        } catch (error) {
            console.error('Parse error:', error);
            this.showError('网络错误，请检查连接后重试');
        } finally {
            this.setLoading(false);
        }
    }

    async downloadVideo() {
        if (!this.currentDownloadUrl || this.isDownloading) return;

        // 直接使用解析后的下载链接进行下载
        await this.directDownload();
    }

    async directDownload() {
        if (!this.currentDownloadUrl) return;
        
        this.isDownloading = true;
        const downloadBtn = document.getElementById('downloadBtn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span>⏳ 准备下载...</span>';
        downloadBtn.disabled = true;

        try {
            this.showMessage('正在准备下载...', 'info');
            
            // 方法1: 尝试直接下载（创建临时链接）
            const a = document.createElement('a');
            a.href = this.currentDownloadUrl;
            a.download = ''; // 让浏览器自动处理文件名
            a.target = '_blank'; // 在新标签页打开，避免当前页跳转
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.showMessage('下载已开始！如果未自动下载，请使用"复制链接"功能', 'success');

        } catch (error) {
            console.error('Download error:', error);
            // 如果直接下载失败，提示用户复制链接
            this.showMessage('自动下载失败，请使用"复制链接"按钮复制链接后下载', 'error');
        } finally {
            this.isDownloading = false;
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }
    }

    async copyLink() {
        if (!this.currentDownloadUrl) return;

        try {
            await navigator.clipboard.writeText(this.currentDownloadUrl);
            this.showMessage('链接已复制到剪贴板', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            this.showMessage('复制失败，请手动复制', 'error');
        }
    }

    showResult(data) {
        document.getElementById('platformName').textContent = data.platform;
        document.getElementById('contentType').textContent = data.contentType === 'video' ? '视频' : '图片';
        document.getElementById('title').textContent = data.title || '未知标题';
        document.getElementById('thumbnail').src = data.thumbnail || '';
        document.getElementById('duration').textContent = data.duration ? `时长: ${this.formatDuration(data.duration)}` : '';
        document.getElementById('fileSize').textContent = data.fileSize ? `大小: ${this.formatFileSize(data.fileSize)}` : '';
        
        // 显示统一的下载提示消息（覆盖API返回的特殊提示）
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = '点击"直接下载"按钮即可下载视频，或使用"复制链接"复制下载地址';
        messageBox.className = 'message-box info';
        messageBox.classList.remove('hidden');
        
        this.resultSection.classList.remove('hidden');
        this.errorSection.classList.add('hidden');
        
        this.currentDownloadUrl = data.downloadUrl || data.url;
        this.currentPlatform = data.platform;
        this.downloadId = data.downloadId || '';
        
        // 纯前端方案：直接下载
        document.getElementById('downloadBtn').innerHTML = '<span>⬇️ 直接下载</span>';
    }

    // 识别平台
    identifyPlatform(url) {
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

    // 纯前端解析：尝试多个API
    async parseWithAPIs(url, platformInfo) {
        for (const api of VIDEO_PARSER_APIS) {
            try {
                console.log(`尝试使用 ${api.name} 解析...`);
                
                const apiUrl = new URL(api.url);
                apiUrl.searchParams.append(api.paramName, url);
                
                const response = await fetch(apiUrl.toString(), {
                    method: api.method,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // 处理不同API的返回格式
                    let videoUrl = null;
                    let title = null;
                    let cover = null;
                    
                    if (data.video) {
                        // API1 格式
                        videoUrl = data.video;
                        title = data.title;
                        cover = data.cover;
                    } else if (data.data && data.data.video) {
                        // API2 格式
                        videoUrl = data.data.video;
                        title = data.data.title;
                        cover = data.data.cover;
                    }
                    
                    if (videoUrl) {
                        console.log(`${api.name} 解析成功`);
                        return {
                            success: true,
                            data: {
                                url: url,
                                platform: platformInfo.name,
                                contentType: platformInfo.contentType,
                                title: title || `${platformInfo.name}视频`,
                                thumbnail: cover || '',
                                downloadUrl: videoUrl,
                                duration: 0,
                                fileSize: 0,
                                message: '解析成功，点击下载按钮即可下载视频'
                            }
                        };
                    }
                }
            } catch (error) {
                console.error(`${api.name} 解析失败:`, error);
            }
        }
        
        return { 
            success: false, 
            message: '所有解析API都失败了，请稍后重试或使用其他工具' 
        };
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.errorSection.classList.remove('hidden');
        this.resultSection.classList.add('hidden');
    }

    hideResults() {
        this.resultSection.classList.add('hidden');
        this.errorSection.classList.add('hidden');
    }

    showMessage(message, type = 'success') {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.classList.remove('hidden');
        
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }

    extractUrl(text) {
        // 简单直接的方法：查找 http:// 或 https:// 开头的部分
        const httpIndex = text.indexOf('http://');
        const httpsIndex = text.indexOf('https://');
        
        let startIndex;
        if (httpIndex !== -1 && httpsIndex !== -1) {
            startIndex = Math.min(httpIndex, httpsIndex);
        } else if (httpIndex !== -1) {
            startIndex = httpIndex;
        } else if (httpsIndex !== -1) {
            startIndex = httpsIndex;
        } else {
            console.log('未找到 http:// 或 https:// 开头的 URL');
            return null;
        }
        
        // 从 startIndex 开始，提取到空格或字符串结束
        let endIndex = text.indexOf(' ', startIndex);
        if (endIndex === -1) {
            endIndex = text.length;
        }
        
        const url = text.substring(startIndex, endIndex).trim();
        console.log('提取的 URL:', url);
        return url;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    setLoading(loading) {
        this.parseBtn.disabled = loading;
        this.parseBtn.classList.toggle('loading', loading);
    }

    formatDuration(seconds) {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (!bytes) return '--';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }

    addToHistory(data) {
        const history = this.getHistory();
        const newItem = {
            id: Date.now(),
            url: data.url,
            platform: data.platform,
            contentType: data.contentType,
            title: data.title,
            thumbnail: data.thumbnail,
            downloadUrl: data.downloadUrl || data.url,
            createdAt: new Date().toISOString()
        };

        history.unshift(newItem);
        if (history.length > 20) {
            history.pop();
        }

        localStorage.setItem('downloadHistory', JSON.stringify(history));
        this.renderHistory();
    }

    getHistory() {
        try {
            return JSON.parse(localStorage.getItem('downloadHistory')) || [];
        } catch {
            return [];
        }
    }

    renderHistory() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="empty-history">暂无下载记录</p>';
            return;
        }

        this.historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <img src="${item.thumbnail || 'placeholder.jpg'}" alt="缩略图" class="history-thumb">
                    <div class="history-details">
                        <h4>${item.title}</h4>
                        <p>${item.platform} • ${new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                </div>
                <div class="history-actions">
                    <a href="${item.downloadUrl}" target="_blank" class="btn-small">📥 下载</a>
                    <button class="btn-small btn-delete" onclick="videoDownloader.deleteHistoryItem(${item.id})">🗑️ 删除</button>
                </div>
            </div>
        `).join('');
    }

    deleteHistoryItem(id) {
        let history = this.getHistory();
        history = history.filter(item => item.id !== id);
        localStorage.setItem('downloadHistory', JSON.stringify(history));
        this.renderHistory();
    }

    clearHistory() {
        if (confirm('确定要清空所有下载历史吗？')) {
            localStorage.removeItem('downloadHistory');
            this.renderHistory();
        }
    }

    loadHistory() {
        this.renderHistory();
    }
}

// 初始化
const videoDownloader = new VideoDownloader();