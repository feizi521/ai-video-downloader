// API 配置 - 自动检测环境
// 本地开发时使用 Python 后端 (端口 5000)，生产环境使用 Cloudflare Workers
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:5000/api`
    : 'https://jxhoutai.farholme.com/api';
const BACKEND_API = API_BASE;

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

        this.setLoading(true);
        this.hideResults();

        try {
            // 直接使用 Cloudflare API
            const apiUrl = ensureHttps(`${API_BASE}/parse`);
            console.log('API 调用地址:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showResult(data.data);
                this.addToHistory(data.data);
            } else {
                this.showError(data.message || '解析失败，请检查链接');
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

        // 如果有 downloadId，使用后端直接下载
        if (this.downloadId) {
            await this.downloadWithBackend();
        } else {
            // 否则使用原来的方式（打开第三方页面）
            this.goToDownloadPage();
        }
    }

    async downloadWithBackend() {
        this.isDownloading = true;
        const downloadBtn = document.getElementById('downloadBtn');
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<span>⏳ 下载中...</span>';
        downloadBtn.disabled = true;

        try {
            this.showMessage('正在下载视频，请稍候...', 'info');

            const response = await fetch(`${BACKEND_API}/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.currentDownloadUrl,
                    downloadId: this.downloadId
                }),
            });

            if (response.ok) {
                // 获取文件名
                const contentDisposition = response.headers.get('content-disposition');
                let filename = 'video.mp4';
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="(.+)"/);
                    if (match) filename = match[1];
                }

                // 下载文件
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);

                this.showMessage('下载完成！', 'success');

                // 清理临时文件
                await fetch(`${BACKEND_API}/cleanup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ downloadId: this.downloadId }),
                });
            } else {
                const data = await response.json();
                this.showMessage(data.message || '下载失败', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showMessage('下载失败，请检查后端服务是否运行', 'error');
        } finally {
            this.isDownloading = false;
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }
    }

    goToDownloadPage() {
        if (!this.currentDownloadUrl) return;

        // 如果是B站，提示使用本地工具
        if (this.currentPlatform === 'B站') {
            this.showMessage('B站视频请使用 you-get 或 yt-dlp 工具下载，或复制链接使用浏览器扩展', 'info');
            return;
        }

        // 打开第三方下载页面
        window.open(this.currentDownloadUrl, '_blank');
        
        // 显示提示信息
        this.showMessage('已打开下载页面，请在下载页面中下载视频', 'info');
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
        
        // 显示消息（如果有）
        if (data.message) {
            this.showMessage(data.message, 'info');
        }
        
        this.resultSection.classList.remove('hidden');
        this.errorSection.classList.add('hidden');
        
        this.currentDownloadUrl = data.downloadUrl || data.url;
        this.currentPlatform = data.platform;
        this.downloadId = data.downloadId || '';
        
        // 如果有 downloadId，修改按钮文字
        if (this.downloadId) {
            document.getElementById('downloadBtn').innerHTML = '<span>⬇️ 直接下载</span>';
        } else {
            document.getElementById('downloadBtn').innerHTML = '<span>⬇️ 去下载页面</span>';
        }
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