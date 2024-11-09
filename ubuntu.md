# 在 Ubuntu 上安装和运行

## 1. 系统准备

更新系统并安装基本依赖：

    sudo apt-get update
    sudo apt-get upgrade
    sudo apt-get install -y curl git build-essential

## 2. 安装 Node.js

安装 Node.js 18.x：

    # 添加 NodeSource 仓库
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

    # 安装 Node.js
    sudo apt-get install -y nodejs

    # 验证安装
    node --version
    npm --version

## 3. 安装 pnpm

    # 安装 pnpm
    curl -fsSL https://get.pnpm.io/install.sh | sh -

    # 添加 pnpm 到 PATH（如果安装脚本没有自动添加）
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"

    # 验证安装
    pnpm --version

## 4. 克隆并设置项目

    # 克隆项目
    git clone <your-repo-url>
    cd cursor-api-proxy

    # 安装依赖
    pnpm install

## 5. 配置防火墙

    pnpm setup-firewall

## 6. 配置 SSL 证书

确保您有一个域名并已经正确解析到服务器，然后运行：

    pnpm setup-ssl your-domain.com

检查证书是否正确安装：

    sudo certbot certificates
    ls -l ssl/

## 7. 运行服务

开发模式：

    pnpm dev

生产模式：

    # 先构建
    pnpm build
    
    # 然后运行
    pnpm start

## 8. 验证服务是否正常运行

HTTP 服务验证：

    curl http://your-domain.com:8080

HTTPS 服务验证：

    curl https://your-domain.com:34252

## 9. 查看日志

实时查看日志：

    tail -f logs/access.log
    tail -f logs/detailed.log

## 10. 常见问题排查

检查证书状态：

    sudo certbot certificates

检查端口是否正确开放：

    sudo netstat -tulpn | grep -E '8080|34252'

检查防火墙状态：

    sudo ufw status

检查日志文件权限：

    ls -l logs/