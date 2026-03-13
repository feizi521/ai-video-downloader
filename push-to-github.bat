@echo off
chcp 65001 >nul
echo ==========================================
echo   一键推送到 GitHub
echo ==========================================
echo.

REM 检查 git 是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Git，请先安装 Git
    pause
    exit /b 1
)

REM 设置远程仓库
echo [1/4] 配置远程仓库...
git remote remove origin 2>nul
git remote add origin https://github.com/feizi521/ai-video-downloader.git
git remote -v

REM 添加所有文件
echo.
echo [2/4] 添加文件到暂存区...
git add -A

REM 提交更改
echo.
echo [3/4] 提交更改...
git commit -m "修复网站功能：添加缺失文件，优化API配置，修复CORS问题" 2>nul || echo 更改已提交

REM 推送到 GitHub
echo.
echo [4/4] 推送到 GitHub...
git branch -M main
git push -u origin main --force

if errorlevel 1 (
    echo.
    echo ==========================================
    echo [错误] 推送失败！
    echo ==========================================
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. 需要登录 GitHub 账号
    echo 3. 没有仓库写入权限
    echo.
    echo 解决方法：
    echo - 在 VS Code 中打开命令面板 (Ctrl+Shift+P)
    echo - 输入 "Git: Push"
    echo - 按照提示登录 GitHub
    echo.
) else (
    echo.
    echo ==========================================
    echo [成功] 推送完成！
    echo ==========================================
    echo.
    echo 仓库地址：https://github.com/feizi521/ai-video-downloader
    echo.
)

pause
