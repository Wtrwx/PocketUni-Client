const path = require('path');
const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
  // 创建主窗口
  let mainWindow = new BrowserWindow({
    title: 'PU 口袋校园',
    icon: path.join(__dirname, '../public/favicon.ico'),
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 720
  });

  // 获取默认的会话对象
  const ses = mainWindow.webContents.session;

  // 修改 User-Agent
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76';
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  const devServerUrl =
    process.env.ELECTRON_DEV_SERVER_URL || process.env.VUE_DEV_SERVER_URL;

  if (!app.isPackaged && devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});
