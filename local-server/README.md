# Utter Pulsar 本地服务

这个目录包含一个零依赖的 Node.js 静态文件服务，用来运行上一级目录中的现有网站。它不会修改项目中的 HTML、CSS、JavaScript 或资源文件。

## 启动

在项目根目录运行：

```powershell
cd local-server
npm start
```

服务默认监听 `0.0.0.0:8080`，启动日志会显示本机和局域网访问地址。

然后访问：

- 首页：<http://127.0.0.1:8080/>
- Crazy OS：<http://127.0.0.1:8080/projects/crazy-os/>
- MLP From Scratch：<http://127.0.0.1:8080/projects/mlp-from-scratch/>

按 `Ctrl+C` 停止服务。

## 可选参数

修改端口：

```powershell
npm start -- --port 3000
```

指定其他监听地址：

```powershell
npm start -- --host 127.0.0.1 --port 8080
```

默认情况下，直接运行 `npm start` 后即可在手机浏览器中访问启动日志显示的 `Network` 地址。Windows 防火墙首次询问时，需要允许 Node.js 访问当前网络。

## 说明

- 需要 Node.js 18 或更高版本。
- 不需要运行 `npm install`，也没有第三方依赖。
- 开发期间响应使用 `Cache-Control: no-store`，便于立即看到文件变化。
- 支持 HTTP Range 请求，因此 Crazy OS 页面中的 MP4 视频可以正常加载和拖动进度。
