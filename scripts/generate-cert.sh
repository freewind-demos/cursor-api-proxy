#!/bin/bash

# 创建 ssl 目录
mkdir -p ssl

# 生成自签名证书
openssl req -x509 \
    -newkey rsa:2048 \
    -nodes \
    -sha256 \
    -days 365 \
    -keyout ssl/private.key \
    -out ssl/certificate.crt \
    -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 