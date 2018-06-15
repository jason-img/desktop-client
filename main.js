/*global __dirname, Buffer, process, require */

(function () {
  'use strict'
  const electron = require('electron')
  const app = electron.app
  const path = require('path')
  const os = require('os')
  const BrowserWindow = electron.BrowserWindow
  const Tray = electron.Tray
  const appName = app.getName()
  const appVersion = app.getVersion()
  const dataDir = app.getPath('userData') + path.sep
  const cacheDir = app.getPath('userCache') + path.sep
  const tempDir = app.getPath('temp') + path.sep
  const homeDir = app.getPath('home') + path.sep
  const hostname = os.hostname()
  const username = (process.platform === 'win32') ? process.env.USERNAME : process.env.USER
  // report crashes to the Electron project
  // require('crash-reporter').start()
  // adds debug features like hotkeys for triggering dev tools and reload
  process.on('uncaughtException', onCrash)
  // add this switch for the notification window
  app.commandLine.appendSwitch('--enable-transparent-visuals')
  /**
   * createMainWindow - create main application window
   *
   * @return {type}  description
   */
  function createMainWindow () {
    var win = new BrowserWindow({
      width: 1280,
      height: 800,
      frame: false
    })
    win.loadURL('file://' + __dirname + '/src/index.html')
    win.on('closed', onClosed)
    win.webContents.on('crashed', onCrash)
    win.on('unresponsive', onCrash)
    return win
  }
  /**
   * onClosed - description
   *
   * @return {type}  description
   */
  function onClosed () {
    // deref the window
    // for multiple windows store them in an array
    mainWindow = null
  }
  /**
   * onCrash - description
   *
   * @param  {type} exc description
   * @return {type}     description
   */
  function onCrash (exc) {
    console.log(exc)
  }
  /**
   * handleStartupEvent function - description
   *
   * @return {type}  description
   */
  var handleStartupEvent = function () {
    if (process.platform !== 'win32') {
      return false
    }
    var cp = require('child_process')
    var path = require('path')
    var updateDotExe = path.resolve(path.dirname(process.execPath), '..', 'update.exe')
    var target = path.basename(process.execPath)
    var squirrelCommand = process.argv[1]
    switch (squirrelCommand) {
      case '--squirrel-install':
      case '--squirrel-updated':
      // Optionally do things such as:
      //
      // - Install desktop and start menu shortcuts
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus
      // create shortcuts
        cp.spawnSync(updateDotExe, ['--createShortcut', target], {
          detached: true
        })
        // Always quit when done
        app.quit()
        return true
      case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers
        cp.spawnSync(updateDotExe, ['--removeShortcut', target], {
          detached: true
        })
        // Always quit when done
        app.quit()
        return true
      case '--squirrel-obsolete':
        // This is called on the outgoing version of your app before
        // we update to the new version - it's the opposite of
        // --squirrel-updated
        app.quit()
        return true
    }
  }
  // check if we are being called by insaller routine
  if (handleStartupEvent()) {
    return
  }
  // prevent window being GC'd
  var mainWindow
  var trayIcon
  /**
   * activate function - description
   *
   * @return {type}  description
   */
  app.on('activate', function () {
    if (!mainWindow) {
      mainWindow = createMainWindow()
    }
  })
  /**
   * ready function - description
   *
   * @return {type}  description
   */
  app.on('ready', function () {
    mainWindow = createMainWindow();
    try {
      const isDev = require('electron-is-dev')
      if (isDev) {
        require('electron-debug')()
        const electronDevTools = require('electron-devtools-installer')
        electronDevTools.default(electronDevTools.ANGULARJS_BATARANG);
      }
    } catch(e) {
      console.log(`Skipped dev dependencies`)
    }

    electron.ipcMain.on('writeFile', (event, id, path, dataString) => {
      const fs = require('fs');
      fs.writeFile(path, dataString, (err) => {
        if(err) mainWindow.webContents.send('writeFile', id, err.toString());
        mainWindow.webContents.send('writeFile', id);
      })
    })

    electron.ipcMain.on('readFile', (event, id, path) => {
      const fs = require('fs');
      console.log(id, path)
      fs.readFile(path, 'utf-8', (err, data) => {
        if(err) mainWindow.webContents.send('readFile', id, err.toString());
        mainWindow.webContents.send('readFile', id, null, data);
      })
    })


  })
  /**
   * sysConfig function - description
   *
   * @return {type}  description
   */
  app.sysConfig = function () {
    return {
      app: {
        name: appName,
        version: appVersion,
        icon: path.join(__dirname, 'assets', 'boilerplate.png')
      },
      host: hostname,
      platform: process.platform,
      user: username,
      paths: {
        home: homeDir,
        temp: tempDir,
        data: dataDir,
        cache: cacheDir
      }
    }
  }
  /**
   * getMainWindow function - description
   *
   * @return {type}  description
   */
  app.getMainWindow = function () {
    return mainWindow
  }
  /**
   * close function - description
   *
   * @return {type}  description
   */
  app.close = function () {
    if (mainWindow) {
      mainWindow.close()
    }
    app.quit()
  }
  /**
   * toggleFullscreen function - description
   *
   * @return {type}  description
   */
  app.toggleFullscreen = function () {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  }
  /**
   * minimizeAppToSysTray function - description
   *
   * @return {type}  description
   */
  app.minimizeAppToSysTray = function () {
    trayIcon = new Tray(path.join(__dirname, 'assets', 'boilerplate_tray.png'))
    trayIcon.setToolTip('App is running in background mode.')
    trayIcon.on('click', () => {
      if (mainWindow) {
        mainWindow.show()
        trayIcon.destroy()
      }
    })
    if (mainWindow) {
      mainWindow.hide()
    }
  }

})()
