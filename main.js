const { app, Tray, Menu, nativeImage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const regedit = require('regedit').promisified;

app.commandLine.appendSwitch('high-dpi-support', 'true');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
const path = require('path');
const simpleGit = require('simple-git');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

let tray = null;
let nodeProcess = null;
let appDataPath = path.join(process.env.APPDATA, 'dsmodinstaller');
let repoPath = path.join(appDataPath, 'sheltupdate6686');
let installerPath = path.join(appDataPath, 'install-shelter.exe');
let buttonName = 'Enable startup';

async function toggleStartup() {
  const keyPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  const valueName = 'DS Mod Installer';
  const listResult = await regedit.list(keyPath);
  if (listResult.includes(valueName)) {
    buttonName = 'Disable startup';
    await regedit.deleteKey(keyPath, valueName);
    console.log('Startup disabled');
  } else {
    buttonName = 'Enable startup';
    await regedit.putValue({
      [keyPath]: {
        [valueName]: {
          value: `"${process.execPath}"`,
          type: 'REG_SZ'
        }
      }
    });
  }
}

async function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function cloneOrPullRepo() {
  try {
    await ensureDirectoryExists(appDataPath);
    const git = simpleGit();
    
    if (!fs.existsSync(repoPath)) {
      console.log('Repository not found, attempting to clone...');
      await git.clone('https://github.com/6686-repos/sheltupdate6686', repoPath);
      console.log('Repository cloned successfully');
    } else {
      console.log('Repository exists, pulling latest changes...');
      await git.cwd(repoPath).pull();
      console.log('Repository updated successfully');
    }
  } catch (error) {
    console.error('Git operation failed:', error.message);
    throw new Error(`Git operation failed: ${error.message}`);
  }
}

async function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Starting npm install...');
    const npm = spawn('npm', ['install'], { cwd: repoPath, shell: true });
    
    let stdoutData = '';
    let stderrData = '';
    
    npm.stdout.on('data', (data) => {
      stdoutData += data;
      console.log(`npm install output: ${data}`);
    });
    
    npm.stderr.on('data', (data) => {
      stderrData += data;
      console.error(`npm install error: ${data}`);
    });
    
    npm.on('error', (error) => {
      console.error('Failed to start npm process:', error);
      reject(new Error(`Failed to start npm: ${error.message}`));
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('npm install completed successfully');
        resolve();
      } else {
        const errorMessage = `npm install failed with code ${code}\nOutput: ${stdoutData}\nErrors: ${stderrData}`;
        console.error(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  });}


function startNodeProcess() {
  if (nodeProcess) {
    nodeProcess.kill();
  }
  
  nodeProcess = spawn('node', ['src/index.js'], { cwd: repoPath });
  
  nodeProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  nodeProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  nodeProcess.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
  });
}

function downloadInstaller() {
  try {
    console.log('Downloading shelter-installer.exe...');
    const url = 'https://github.com/6686-repos/shelter-installer/releases/download/1.0.0/install-shelter.exe';
    
    // Ensure directory exists first, before creating the Promise
    ensureDirectoryExists(appDataPath);
    
    return new Promise((resolve, reject) => {
      // Create file stream
      const file = fs.createWriteStream(installerPath);
      
      const handleDownload = (downloadUrl, redirectCount = 0) => {
        // Limit redirects to prevent infinite loops
        if (redirectCount > 5) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        https.get(downloadUrl, (response) => {
          // Handle redirects (301, 302, 303, 307, 308)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log(`Redirect (${response.statusCode}) to: ${response.headers.location}`);
            // Close the current response to prevent memory leaks
            response.resume();
            // Follow the redirect
            handleDownload(response.headers.location, redirectCount + 1);
            return;
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download installer: ${response.statusCode} ${response.statusMessage}`));
            return;
          }
          
          pipelineAsync(response, file)
            .then(() => {
              console.log('Installer downloaded successfully to:', installerPath);
              resolve(installerPath);
            })
            .catch(err => {
              console.error('Download failed:', err);
              reject(err);
            });
        }).on('error', (err) => {
          fs.unlink(installerPath, () => {}); // Delete the file if download failed
          console.error('Download error:', err);
          reject(err);
        });
      };
      
      // Start the download process
      handleDownload(url);
    });
  } catch (error) {
    console.error('Error in downloadInstaller:', error);
    throw error;
  }
}

async function runInstaller() {
  if (!fs.existsSync(installerPath)) {
    console.error('Installer not found. Attempting to download...');
    try {
      await downloadInstaller();
    } catch (error) {
      console.error('Failed to download installer:', error);
      dialog.showErrorBox('Error', 'Failed to download Discord configurator. Please check your internet connection and try again.');
      return;
    }
  }
  try {
    console.log(`Running installer:`, installerPath);
    
    // Return a promise for execFile
    await new Promise((resolve, reject) => {
      execFile(installerPath, (error) => {
        if (error) {
          console.error(`Attempt ${retryCount + 1} failed:`, error.message);
          reject(error);
        } else {
          console.log('Installer executed successfully');
          resolve();
        }
      });
    });
    
    // If we get here, execution was successful
    return;
  } catch (error) {
    console.error('Failed to run installer:', error);
    dialog.showErrorBox('Error', 'Failed to run Discord configurator. Please check your internet connection and try again.');
    return;
  }
}


async function initialize() {
  try {
    console.log('Starting initialization...');
    console.log('Cloning or pulling repository...');
    await cloneOrPullRepo();
    console.log('Installing dependencies...');
    await installDependencies();
    console.log('Starting node process...');
    startNodeProcess();
    
    // Download the installer in the background
    try {
      downloadInstaller();
      console.log('Installer downloaded successfully during initialization');
    } catch (error) {
      console.error('Failed to download installer during initialization:', error);
      // Non-fatal error, continue with the app
    }
    
    console.log('Initialization completed successfully');
  } catch (error) {
    console.error('Initialization failed:', error.stack || error);
    if (error.message.includes('Failed to start npm')) {
      console.error('Failed to start npm. Please ensure npm is installed and accessible in your PATH.');
    } else if (error.message.includes('npm install failed')) {
      console.error('Failed to install dependencies. Check the error log above for details.');
      console.error('Common solutions:\n1. Check your internet connection\n2. Clear npm cache (run npm cache clean --force)\n3. Delete node_modules folder and try again');
    } else if (error.message.includes('git')) {
      console.error('Failed to clone/pull repository. Please check your internet connection and try again.');
    }
    app.quit();
  }
}

function checkForUpdates() {
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. The update will be downloaded automatically.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The application will restart to install the update.',
      buttons: ['Restart']
    }).then(() => {
      autoUpdater.quitAndInstall(true, true);
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
  });
}

app.whenReady().then(() => {
  checkForUpdates();
  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      console.error('Failed to load tray icon - image is empty');
      trayIcon = nativeImage.createEmpty();
    }
    // Resize icon for better visibility
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (error) {
    console.error('Failed to load tray icon:', error);
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);

  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DS Mod Installer',
      enabled: false,
      icon: trayIcon
    },
    { type: 'separator' },
    {
      label: 'Configure Discord',
      click: () => {
        runInstaller();
      }
    },
    {
      label: 'Restart sheltupdate',
      click: async () => {
        try {
          await cloneOrPullRepo();
          await installDependencies();
          startNodeProcess();
        } catch (error) {
          console.error('Failed to restart process:', error);
        }
      }
    },
    {
      label: buttonName,
      click: async () => {
        await toggleStartup();
      }
    },
    {
      label: 'Exit',
      click: () => {
        if (nodeProcess) {
          nodeProcess.kill();
        }
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('DS Mod Installer');
  tray.setContextMenu(contextMenu);
  
  initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nodeProcess) {
    nodeProcess.kill();
  }
});