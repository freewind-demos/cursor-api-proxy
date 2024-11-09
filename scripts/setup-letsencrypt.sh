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

# 使用 ls 命令检查证书目录
echo "检查证书目录..."
sudo ls -la "/etc/letsencrypt/live/$DOMAIN/" || {
    echo "无法访问证书目录，可能是权限问题"
    exit 1
}

# 检查证书文件是否存在并且可读
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
if sudo test -r "$CERT_PATH/privkey.pem" && sudo test -r "$CERT_PATH/fullchain.pem"; then
    echo "找到证书文件..."
else
    echo "证书文件不存在或无法读取"
    echo "请检查目录: $CERT_PATH"
    echo "并确保当前用户有权限访问"
    exit 1
fi

# 复制证书到项目目录
echo "正在复制证书..."
sudo cp "$CERT_PATH/privkey.pem" ssl/private.key || {
    echo "复制私钥失败"
    exit 1
}
sudo cp "$CERT_PATH/fullchain.pem" ssl/certificate.crt || {
    echo "复制证书失败"
    exit 1
}

# 设置适当的权限
echo "设置文件权限..."
CURRENT_USER=$(whoami)
sudo chown $CURRENT_USER:$CURRENT_USER ssl/private.key ssl/certificate.crt || {
    echo "修改所有者失败"
    echo "当前用户: $CURRENT_USER"
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

# 显示证书信息
echo ""
echo "证书信息："
openssl x509 -in ssl/certificate.crt -text -noout | grep -E "Subject:|Issuer:|Not Before:|Not After :|DNS:"