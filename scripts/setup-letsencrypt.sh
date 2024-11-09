#!/bin/bash

set -e  # 遇到错误立即退出

# 检查是否提供了域名参数
if [ -z "$1" ]; then
    echo "请提供域名参数"
    echo "使用方法: ./setup-letsencrypt.sh your-domain.com"
    exit 1
fi

DOMAIN=$1

# 检查操作系统并安装 certbot
install_certbot() {
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "检测到 Debian/Ubuntu 系统"
        sudo apt-get update
        sudo apt-get install -y snapd
        sudo snap install core
        sudo snap refresh core
        sudo snap install --classic certbot
        sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS
        echo "检测到 RHEL/CentOS 系统"
        sudo yum install -y epel-release
        sudo yum install -y certbot
    elif command -v brew &> /dev/null; then
        # macOS
        echo "检测到 macOS 系统"
        brew install certbot
    else
        echo "未能识别的操作系统，请手动安装 certbot"
        echo "Debian/Ubuntu: sudo apt install certbot"
        echo "RHEL/CentOS: sudo yum install certbot"
        echo "macOS: brew install certbot"
        exit 1
    fi
}

# 检查是否已安装 certbot
if ! command -v certbot &> /dev/null; then
    echo "未找到 certbot，正在安装..."
    install_certbot
fi

# 再次检查 certbot 是否安装成功
if ! command -v certbot &> /dev/null; then
    echo "certbot 安装失败，请尝试手动安装"
    exit 1
fi

# 创建 ssl 目录
mkdir -p ssl

# 获取证书
echo "正在获取证书..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    --agree-tos \
    --non-interactive \
    --preferred-challenges http \
    --email admin@$DOMAIN || {
        echo "获取证书失败！"
        echo "请检查："
        echo "1. 域名 $DOMAIN 是否正确解析到本服务器"
        echo "2. 80 端口是否被占用"
        echo "3. 防火墙是否允许 80 端口访问"
        exit 1
    }

# 检查证书文件是否存在
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ] || [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "证书文件未生成，获取证书失败"
    exit 1
fi

# 复制证书到项目目录
echo "正在复制证书..."
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ssl/private.key || {
    echo "复制私钥失败"
    exit 1
}
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ssl/certificate.crt || {
    echo "复制证书失败"
    exit 1
}

# 设置适当的权限
echo "设置文件权限..."
sudo chown $(whoami) ssl/private.key ssl/certificate.crt || {
    echo "修改所有者失败"
    exit 1
}
chmod 600 ssl/private.key ssl/certificate.crt || {
    echo "修改权限失败"
    exit 1
}

echo "证书安装成功！"
echo "证书文件位置："
echo "- 私钥：ssl/private.key"
echo "- 证书：ssl/certificate.crt"
echo ""
echo "请确保："
echo "1. 在防火墙中开放了 80 端口（用于证书验证）"
echo "2. 在防火墙中开放了 8443 端口（用于 HTTPS）"
echo "3. 域名 $DOMAIN 已正确解析到本服务器"