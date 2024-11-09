import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import cors from 'cors';
import tls from 'tls';

const app = express();
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8080;
const HTTPS_PORT = process.env.HTTPS_PORT ? parseInt(process.env.HTTPS_PORT) : 34252;
const HOST = '0.0.0.0';

// SSL证书配置
const sslOptions: https.ServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt')),
    minVersion: 'TLSv1.2' as const,
    ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-CHACHA20-POLY1305',
        'ECDHE-RSA-CHACHA20-POLY1305',
        'DHE-RSA-AES128-GCM-SHA256',
        'DHE-RSA-AES256-GCM-SHA384',
        'AES128-GCM-SHA256',
        'AES256-GCM-SHA384',
        'AES128-SHA256',
        'AES256-SHA256',
        'AES128-SHA',
        'AES256-SHA'
    ].join(':'),
    honorCipherOrder: true,
    handshakeTimeout: 120000,
    requestCert: false,
    rejectUnauthorized: false,
    enableTrace: true,
};

// 创建日志目录
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// 启用 CORS
app.use(cors({
    origin: '*',  // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 创建日志写入流
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

// 使用 morgan 进行基础日志记录
app.use(morgan('combined', { stream: accessLogStream }));

// 自定义日志中间件
const loggerMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        cookies: req.cookies,
        body: req.body
    };

    fs.appendFileSync(
        path.join(logsDir, 'detailed.log'),
        JSON.stringify(requestLog, null, 2) + '\n'
    );

    // 捕获响应数据
    const oldWrite = res.write;
    const oldEnd = res.end;
    const chunks: Buffer[] = [];

    res.write = function (chunk: any) {
        chunks.push(Buffer.from(chunk));
        return oldWrite.apply(res, arguments as any);
    };

    res.end = function (chunk: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
        if (chunk) {
            chunks.push(Buffer.from(chunk));
        }
        
        const responseLog = {
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            headers: res.getHeaders(),
            body: Buffer.concat(chunks).toString('utf8')
        };

        fs.appendFileSync(
            path.join(logsDir, 'detailed.log'),
            JSON.stringify(responseLog, null, 2) + '\n'
        );

        return oldEnd.apply(res, arguments as any);
    };

    next();
};

app.use(loggerMiddleware);

// 添加根路径处理
app.get('/', (req, res) => {
    res.send('hello!');
});

// 配置代理
const proxy = createProxyMiddleware({
    target: 'https://chat.cloudapi.vip',
    changeOrigin: true,
    secure: false,  // 允许无效证书
    ws: true,  // 支持 websocket
    logLevel: 'debug',
    pathRewrite: {
        '^/v1': '/v1'  // 重写路径
    },
    onProxyReq: (proxyReq, req, res) => {
        // 在这里可以修改发往目标服务器的请求
        console.log('代理请求头:', proxyReq.getHeaders());
    },
    onProxyRes: (proxyRes, req, res) => {
        // 添加 CORS 头
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        
        console.log('代理响应状态:', proxyRes.statusCode);
    },
    onError: (err, req, res) => {
        console.error('代理错误:', err);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end('代理请求错误: ' + err.message);
    }
});

// 只对 /v1 路径使用代理
app.use('/v1', proxy);

// 添加健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 创建 HTTP 和 HTTPS 服务器
const httpServer = http.createServer(app);

function startHttpsServer(retries = 3) {
    const httpsServer = https.createServer(sslOptions, app);
    
    httpsServer.on('secureConnection', (tlsSocket) => {
        console.log('安全连接已建立');
        console.log('TLS 版本:', tlsSocket.getProtocol());
        console.log('加密套件:', tlsSocket.getCipher());
    });

    httpsServer.on('tlsClientError', (err, tlsSocket) => {
        console.error('TLS 客户端错误:', err);
        console.error('远程地址:', tlsSocket.remoteAddress);
        console.error('远程端口:', tlsSocket.remotePort);
    });

    httpsServer.on('clientError', (err, socket) => {
        console.error('客户端错误:', err);
    });

    httpsServer.listen(HTTPS_PORT, HOST, () => {
        console.log(`HTTPS 反向代理服务器运行在 https://${HOST}:${HTTPS_PORT}`);
        console.log('SSL 配置:');
        console.log('- TLS 最低版本:', sslOptions.minVersion);
        console.log('- 支持的加密套件:', sslOptions.ciphers?.split(':'));
    });

    return httpsServer;
}

// 启动服务器
httpServer.listen(HTTP_PORT, HOST, () => {
    console.log(`HTTP 反向代理服务器运行在 http://${HOST}:${HTTP_PORT}`);
});

const httpsServer = startHttpsServer();

// 在 HTTPS 服务器启动时添加错误处理
httpsServer.on('error', (err) => {
    console.error('HTTPS 服务器错误:', err);
});

httpsServer.on('tlsClientError', (err, tlsSocket) => {
    console.error('TLS 客户端错误:', err);
}); 