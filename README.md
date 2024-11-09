# Reverse Proxy Server

一个使用 TypeScript 和 Node.js 实现的反向代理服务器，将 `/v1` 路径的请求转发到指定的目标服务器。

## 功能特点

- 同时支持 HTTP (8888端口) 和 HTTPS (8443端口)
- 将所有 `/v1` 路径的请求转发到 `https://chat.cloudapi.vip/v1`
- 详细的日志记录系统，包括：
  - 基本访问日志 (access.log)
  - 详细的请求和响应日志 (detailed.log)，包含 headers、cookies 等信息

## 系统要求

- Node.js 16.x 或更高版本
- pnpm 7.x 或更高版本
- SSL 证书 (用于 HTTPS)

## SSL 证书配置

有两种方式可以配置 SSL 证书：

### 1. 使用 Let's Encrypt 免费证书（推荐用于生产环境）

需要满足以下条件：
- 有一个域名指向您的服务器
- 服务器可以被公网访问
- 80 端口可用（用于证书验证）

获取证书：

    pnpm setup-ssl your-domain.com

注意事项：
- 需要 root 权限运行
- 确保域名已正确解析到服务器
- 确保 80 端口未被占用
- 证书有效期为 90 天，certbot 会自动续期

### 2. 使用自签名证书（仅用于开发测试）

    pnpm generate-cert

注意：自签名证书会导致浏览器显示安全警告。

## 安装步骤

1. 克隆项目后，进入项目目录：

    cd reverse-proxy

2. 使用 pnpm 安装依赖：

    pnpm install

3. 确保 SSL 证书已正确配置在 ssl 目录中

## 开发和运行

### 开发模式

使用 ts-node 直接运行 TypeScript 代码：

    pnpm dev

### 生产模式

1. 构建项目：

    pnpm build

2. 运行编译后的代码：

    pnpm start

## 使用方法

启动服务器后，可以通过以下地址访问代理服务：

    http://localhost:8888/v1/your-path
    https://localhost:8443/v1/your-path

所有发送到 `/v1` 路径的请求都会被转发到 `https://chat.cloudapi.vip/v1`。

## 日志

所有日志文件都保存在 `logs` 目录下：

- `access.log`: 基本的访问日志
- `detailed.log`: 详细的请求和响应日志，包含完整的 headers、cookies 和 body 信息

## 项目结构

    reverse-proxy/
    ├── src/
    │   └── server.ts
    ├── ssl/
    │   ├── private.key
    │   └── certificate.crt
    ├── logs/
    │   ├── access.log
    │   └── detailed.log
    ├── package.json
    ├── tsconfig.json
    └── README.md

## License

MIT