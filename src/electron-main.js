const { app, BrowserWindow, session } = require('electron');

app.on('ready', () => {
  // 创建主窗口
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  // 获取默认的会话对象
  const ses = mainWindow.webContents.session;

  // 修改 User-Agent
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76';
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // 加载页面文件
  if (app.isPackaged) {
    // 如果是打包好的就加载打包的 HTML 文件
    mainWindow.loadFile('dist/index.html');
  } else {
    // 如果没有打包就直接从本地服务器加载
    mainWindow.loadURL('http://localhost:8080/');
  }

  // 关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});
