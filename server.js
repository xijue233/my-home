// 装修看板 · 零依赖云端同步服务
// 用法： node server.js   （可选环境变量 PORT，默认 3000）
// 然后将本文件与「装修看板.html」放在同一目录，浏览器打开 http://<地址>:PORT
// 手机/电脑打开同一个地址，数据实时共享。

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 静态资源 MIME 映射（PWA 图标 / manifest / service worker 等）
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.css': 'text/css',
  '.txt': 'text/plain; charset=utf-8'
};

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const FILE = path.join(DIR, 'board.json');
const HTML = path.join(DIR, '装修看板.html');

const server = http.createServer((req, res) => {
  // 允许跨域（若把接口与页面分开部署时有用；同源时无害）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = req.url.split('?')[0];

  // 同步接口
  if (url === '/api/board') {
    if (req.method === 'GET') {
      if (fs.existsSync(FILE)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(fs.readFileSync(FILE));
      }
      res.writeHead(404); return res.end('not found');
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const d = JSON.parse(body);
          d.updatedAt = Date.now();
          fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(d));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('invalid json');
        }
      });
      return;
    }
    res.writeHead(405); return res.end('method not allowed');
  }

  // 静态资源（PWA 图标 / manifest / service worker 等）
  const ext = path.extname(url);
  if (MIME[ext]) {
    const fp = path.join(DIR, decodeURIComponent(url));
    if (fp.startsWith(DIR) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[ext] });
      return res.end(fs.readFileSync(fp));
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('not found');
  }

  // 页面
  if (url === '/' || url === '/index.html') {
    if (fs.existsSync(HTML)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(HTML));
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('装修看板.html not found');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 装修看板已启动');
  console.log('   本机访问 ： http://localhost:' + PORT);
  // 列出局域网地址，方便手机连接
  const ifs = os.networkInterfaces();
  const ips = [];
  for (const name in ifs) {
    for (const ni of ifs[name]) {
      if (ni.family === 'IPv4' && !ni.internal) ips.push(ni.address);
    }
  }
  if (ips.length) {
    console.log('   手机访问（与电脑同一 WiFi）：');
    ips.forEach(ip => console.log('     http://' + ip + ':' + PORT));
  } else {
    console.log('   ⚠️ 未检测到局域网地址，请确认已连接 WiFi');
  }
});
