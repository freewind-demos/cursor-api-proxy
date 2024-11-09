import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import cors from 'cors';

const app = express();
const HTTP_PORT = 8888;
const HTTPS_PORT = 8443;

// SSL证书配置
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt'))
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

app.use('/v1', proxy);

// 添加健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 创建 HTTP 和 HTTPS 服务器
const httpServer = http.createServer(app);
const httpsServer = https.createServer(sslOptions, app);

// 启动服务器
httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP 反向代理服务器运行在 http://localhost:${HTTP_PORT}`);
});

httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS 反向代理服务器运行在 https://localhost:${HTTPS_PORT}`);
}); 