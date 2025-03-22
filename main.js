const { app, Tray, Menu, nativeImage, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

app.commandLine.appendSwitch('high-dpi-support', 'true');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
const path = require('path');
const simpleGit = require('simple-git');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { parseUpdateInfo } = require('electron-updater/out/providers/Provider');
const pipelineAsync = promisify(pipeline);
const log = require('electron-log');

let tray = null;
let nodeProcess = null;
let appDataPath = path.join(process.env.APPDATA, 'dsmodinstaller');
let repoPath = path.join(appDataPath, 'sheltupdate6686');
let installerPath = path.join(appDataPath, 'install-shelter.exe');
let logPath = path.join(appDataPath, 'logs', 'main.log' );

function countfilelines(file) {
  return new Promise((resolve, reject) => {
    let count = 0;
    fs.createReadStream(file)
      .on('data', (chunk) => {
        count += chunk.toString().split('\n').length - 1;
      })
      .on('end', () => {
        resolve(count);
      })
      .on('error', (err) => reject(err))
      .on('end', () => resolve(count));
  });
};

async function deleteFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
    log.log(`Successfully deleted file: ${filePath}`);
  } catch (error) {
    log.error(`Error deleting file ${filePath}:`, error);
    throw error;
  }
}

//delete log file if too big
if (countfilelines(logPath) >= 100000) {
  deleteFile(logPath);
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
      log.log('Repository not found, attempting to clone...');
      await git.clone('https://github.com/6686-repos/sheltupdate6686', repoPath);
      log.log('Repository cloned successfully');
    } else {
      log.log('Repository exists, pulling latest changes...');
      await git.cwd(repoPath).pull();
      log.log('Repository updated successfully');
    }
  } catch (error) {
    log.error('Git operation failed:', error.message);
    throw new Error(`Git operation failed: ${error.message}`);
  }
}

async function installDependencies() {
  return new Promise((resolve, reject) => {
    log.log('Starting npm install...');
    const npm = spawn('npm', ['install'], { cwd: repoPath, shell: true });
    
    let stdoutData = '';
    let stderrData = '';
    
    npm.stdout.on('data', (data) => {
      stdoutData += data;
      log.log(`npm install output: ${data}`);
    });
    
    npm.stderr.on('data', (data) => {
      stderrData += data;
      log.error(`npm install error: ${data}`);
    });
    
    npm.on('error', (error) => {
      log.error('Failed to start npm process:', error);
      reject(new Error(`Failed to start npm: ${error.message}`));
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        log.log('npm install completed successfully');
        resolve();
      } else {
        const errorMessage = `npm install failed with code ${code}\nOutput: ${stdoutData}\nErrors: ${stderrData}`;
        log.error(errorMessage);
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
    log.log(`stdout: ${data}`);
  });
  
  nodeProcess.stderr.on('data', (data) => {
    log.error(`stderr: ${data}`);
  });
  
  nodeProcess.on('close', (code) => {
    log.log(`Child process exited with code ${code}`);
  });
}

function downloadInstaller() {
  try {
    log.log('Downloading shelter-installer.exe...');
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
            log.log(`Redirect (${response.statusCode}) to: ${response.headers.location}`);
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
              log.log('Installer downloaded successfully to:', installerPath);
              resolve(installerPath);
            })
            .catch(err => {
              log.error('Download failed:', err);
              reject(err);
            });
        }).on('error', (err) => {
          fs.unlink(installerPath, () => {}); // Delete the file if download failed
          log.error('Download error:', err);
          reject(err);
        });
      };
      
      // Start the download process
      handleDownload(url);
    });
  } catch (error) {
    log.error('Error in downloadInstaller:', error);
    throw error;
  }
}

async function runInstaller() {
  if (!fs.existsSync(installerPath)) {
    log.error('Installer not found. Attempting to download...');
    try {
      await downloadInstaller();
    } catch (error) {
      log.error('Failed to download installer:', error);
      dialog.showErrorBox('Error', 'Failed to download Discord configurator. Please check your internet connection and try again.');
      return;
    }
  }
  try {
    log.log(`Running installer:`, installerPath);
    
    // Return a promise for execFile
    await new Promise((resolve, reject) => {
      execFile(installerPath, (error) => {
        if (error) {
          log.error(`Attempt ${retryCount + 1} failed:`, error.message);
          reject(error);
        } else {
          log.log('Installer executed successfully');
          resolve();
        }
      });
    });
    
    // If we get here, execution was successful
    return;
  } catch (error) {
    log.error('Failed to run installer:', error);
    dialog.showErrorBox('Error', 'Failed to run Discord configurator. Please check your internet connection and try again.');
    return;
  }
}


async function initialize() {
  try {
    log.log('Starting initialization...');
    
    // Add more detailed logging
    log.log('Environment:', {
      appDataPath,
      repoPath,
      installerPath
    });
    
    log.log('Cloning or pulling repository...');
    await cloneOrPullRepo();
    
    log.log('Installing dependencies...');
    await installDependencies();
    
    log.log('Starting node process...');
    startNodeProcess();
    
    // Download the installer in the background with proper error handling
    downloadInstaller().catch(error => {
      log.error('Failed to download installer during initialization:', error);
      // Non-fatal error, continue with the app
    });
    
    log.log('Initialization completed successfully');
  } catch (error) {
    log.error('Initialization failed:', error.stack || error);
    // Add more detailed error information
    log.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Show error to user before quitting
    dialog.showErrorBox(
      'Initialization Error',
      `Failed to start application: ${error.message}\nPlease check the logs for more details.`
    );
    
    app.quit();
  }
}

async function runApp() {
  log.log('Autoupdater finished');
  // Continue with app initialization immediately
  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      log.error('Failed to load tray icon - image is empty');
      trayIcon = nativeImage.createEmpty();
    }
    // Resize icon for better visibility
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (error) {
    log.error('Failed to load tray icon:', error);
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
      label: 'Restart Sheltupdate',
      click: async () => {
        try {
          await cloneOrPullRepo();
          await installDependencies();
          startNodeProcess();
        } catch (error) {
          log.error('Failed to restart process:', error);
        }
      }
    },
    { type:'separator' },
    {
      label: 'Read Logs',
      click: () => {
        exec(`Get-Content "${logPath}" -Wait`, {'shell':'powershell.exe'}, (error, stdout, stderr)=> {
        })
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
};

async function checkForUpdates() {
  try {
    log.log('Checking for updates...');
    await autoUpdater.checkForUpdates();
    log.log('Update check completed'); 
  }
  catch (error) {
    log.error('Error checking for updates:', error);
  }

  autoUpdater.on('update-not-available', () => {
    log.log('No updates available, starting');
  });
  
  autoUpdater.on('update-available', (info) => {
    log.log(`Update available: ${app.getVersion()} → ${info.version}`);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is being downloaded. You will be notified when it is ready.`,
      buttons: ['OK']
    });
  })

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The application will restart to install the update.',
      buttons: ['Restart Now', 'Later']
    }).then((buttonIndex) => {
      if (buttonIndex.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  })
  runApp();
};

app.whenReady().then(async () => {
  checkForUpdates();
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