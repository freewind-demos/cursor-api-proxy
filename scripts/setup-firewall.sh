#!/bin/bash

# 安装 ufw
sudo apt-get update
sudo apt-get install -y ufw

# 配置防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH（如果需要）
sudo ufw allow ssh

# 允许应用端口
sudo ufw allow 8080/tcp
sudo ufw allow 34252/tcp

# 启用防火墙
sudo ufw --force enable

# 显示状态
sudo ufw status verbose