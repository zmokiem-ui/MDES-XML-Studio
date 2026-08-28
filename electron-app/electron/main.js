const { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard, safeStorage } = require('electron');

Menu.setApplicationMenu(null);
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const { version: packageVersion } = require('../package.json');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// --- Filesystem access control ------------------------------------------
// Renderer-facing FS handlers (write/rename/delete/create) must not be able
// to touch arbitrary paths. Confine them to the app workspace (the user's own
// profile plus our scratch/config areas) and any directory the user explicitly
// picked through a native dialog. A native dialog IS the grant.
const _grantedRoots = new Set();
let _workspaceSeeded = false;

function grantPath(p) {
  if (!p) return;
  try { _grantedRoots.add(path.resolve(p)); } catch {}
}

function ensureWorkspaceSeeded() {
  if (_workspaceSeeded) return;
  _workspaceSeeded = true;  // app.getPath is only valid after 'ready'; handlers run post-ready.
  for (const key of ['home', 'documents', 'downloads', 'desktop', 'temp', 'userData']) {
    try { grantPath(app.getPath(key)); } catch {}
  }
}

function _isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// Resolve + verify a renderer-supplied path is inside an allowed root.
// Throws (caught by each handler's try/catch -> {success:false,error}) otherwise.
function assertPathAllowed(target, label = 'path') {
  ensureWorkspaceSeeded();
  if (!target || typeof target !== 'string') {
    throw new Error(`Access denied: missing ${label}`);
  }
  const resolved = path.resolve(target);
  for (const root of _grantedRoots) {
    if (_isInside(root, resolved)) return resolved;
  }
  throw new Error(`Access denied: ${label} is outside the allowed workspace`);
}

// Identifiers (SendingCompanyIN, FI TINs/GIINs, SendingEntityIN) are
// concatenated into MessageRefId/DocRefId, so a space a user pasted into the
// form would sit inside every RefId and MDES rejects the file. Trim on the way
// out; the Python configs trim again as a backstop.
function trimId(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimIdList(values) {
  return (values || []).map(trimId).filter(v => v !== '');
}

// Map Python module names to bundled executable names (production only)
const MODULE_TO_EXE = {
  'crs_generator.cli': 'crs_cli.exe',
  'crs_generator.cbc_cli': 'cbc_cli.exe',
  'crs_generator.fatca_cli': 'fatca_cli.exe',
  'crs_generator.error_injector': 'error_injector.exe',
  'crs_generator.cts_cli': 'cts_cli.exe',
  'crs_generator.mdes_target_cli': 'mdes_target_cli.exe',
};

/**
 * Get the path to a bundled Python executable (production only).
 * Returns null if not found.
 */
function getBundledExePath(moduleName) {
  const exeName = MODULE_TO_EXE[moduleName];
  if (!exeName) return null;
  const exePath = path.join(process.resourcesPath, 'python-dist', exeName);
  return fs.existsSync(exePath) ? exePath : null;
}

function createWindow() {
  // Use .ico for Windows taskbar/title bar icon
  const iconPath = isDev
    ? path.join(__dirname, '..', 'build', 'icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Keep automated settings/localStorage isolated from the user's real
      // profile and from other Electron processes in the same test run.
      ...(process.env.E2E_TEST ? { partition: 'mdes-e2e-memory' } : {}),
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    backgroundColor: '#f8fafc',
    show: false
  });

  // Keep the privileged renderer on application content only. External URLs
  // are opened deliberately from validated main-process handlers instead.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && targetUrl !== currentUrl) event.preventDefault();
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // Load the app
  if (isDev && !process.env.E2E_TEST) {
    console.log('Running in development mode');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else if (isDev && process.env.E2E_TEST) {
    console.log('Running in E2E test mode (no DevTools)');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    console.log('Running in production mode');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Auto-Update Settings Persistence ---
function getUpdateSettingsPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'update-settings.json');
}

function loadUpdateSettings() {
  try {
    const data = fs.readFileSync(getUpdateSettingsPath(), 'utf8');
    const settings = JSON.parse(data);
    return { autoUpdateEnabled: settings.autoUpdateEnabled !== false };
  } catch {
    return { autoUpdateEnabled: true };
  }
}

function saveUpdateSettings(settings) {
  fs.writeFileSync(getUpdateSettingsPath(), JSON.stringify(settings, null, 2));
}

// --- Update feed selection ----------------------------------------------
// electron-updater reads exactly one provider from app-update.yml, which
// electron-builder generates from build.publish (GitHub). That is the fallback
// and the reason nothing here can strand a user: if any of this fails we simply
// leave the baked-in GitHub feed alone.
//
// electron/update-feed.json is written at package time by
// scripts/write-update-feed.mjs. It is absent in dev and in any build that was
// not given GITLAB_UPDATE_TOKEN, in which case the company feed is skipped.
//
// GitLab is preferred when it answers, because it is the authoritative internal
// feed. It is only reachable on the VPN, so the probe below is what keeps
// off-VPN users updating from GitHub instead of failing silently.
const FEED_PROBE_TIMEOUT_MS = 5000;

function loadGitlabFeed() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'update-feed.json'), 'utf8');
    const feed = JSON.parse(raw);
    if (!feed || typeof feed.url !== 'string' || typeof feed.token !== 'string') return null;
    if (!feed.url || !feed.token) return null;
    // GitLab keys the header to the token type: a deploy token authenticates
    // with DEPLOY-TOKEN and a personal/project token with PRIVATE-TOKEN. The
    // wrong one is an indistinguishable 401, so it is decided at build time.
    return { ...feed, header: feed.header || 'DEPLOY-TOKEN' };
  } catch {
    return null;  // absent or malformed: GitHub only.
  }
}

// Resolve to true only on a real 200 for latest.yml. A 401/404 means the token
// or the path is wrong, and falling back is better than erroring at the user.
function probeFeed(feed) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    const timer = setTimeout(() => done(false), FEED_PROBE_TIMEOUT_MS);
    try {
      const { net } = require('electron');
      const request = net.request(`${feed.url}/latest.yml`);
      request.setHeader(feed.header, feed.token);
      request.on('response', (response) => {
        clearTimeout(timer);
        response.on('data', () => {});      // drain; leaving it unread keeps the socket open
        response.on('end', () => {});
        done(response.statusCode === 200);
      });
      request.on('error', () => { clearTimeout(timer); done(false); });
      request.end();
    } catch {
      clearTimeout(timer);
      done(false);
    }
  });
}

// Called once before the first update check. Returns the feed actually in use,
// for logging and for the Settings screen.
async function selectUpdateFeed(autoUpdater) {
  const feed = loadGitlabFeed();
  if (!feed) return 'github';
  if (!(await probeFeed(feed))) {
    console.log('GitLab update feed unreachable; using the GitHub feed.');
    return 'github';
  }
  autoUpdater.requestHeaders = { [feed.header]: feed.token };
  autoUpdater.setFeedURL({ provider: 'generic', url: feed.url, channel: 'latest' });
  console.log('Using the GitLab update feed.');
  return 'gitlab';
}

let activeUpdateFeed = 'github';

let updaterInstance = null;

app.whenReady().then(() => {
  createWindow();

  // --- Auto-Update System ---
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      updaterInstance = autoUpdater;
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.logger = console;

      autoUpdater.on('checking-for-update', () => {
        console.log('Checking for updates...');
        if (mainWindow) mainWindow.webContents.send('update-checking');
      });

      autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        if (mainWindow) mainWindow.webContents.send('update-available', info);
        autoUpdater.downloadUpdate();
      });

      autoUpdater.on('update-not-available', (info) => {
        console.log('App is up to date');
        if (mainWindow) mainWindow.webContents.send('update-not-available', info);
      });

      autoUpdater.on('download-progress', (progress) => {
        if (mainWindow) mainWindow.webContents.send('download-progress', progress);
      });

      autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info.version);
        if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
      });

      autoUpdater.on('error', (err) => {
        console.error('Auto-update error:', err);
        if (mainWindow) mainWindow.webContents.send('update-error', err.message || 'Unknown error');
      });

      // IPC: renderer can request install
      ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall(false, true);
      });

      // Feed selection runs once and both check paths await it, so a manual
      // check triggered during the startup probe cannot race it onto the wrong
      // feed.
      let feedSelection = null;
      const ensureFeedSelected = () => {
        if (!feedSelection) {
          feedSelection = selectUpdateFeed(autoUpdater)
            .then((feed) => { activeUpdateFeed = feed; return feed; })
            .catch(() => 'github');   // never let feed selection break updating
        }
        return feedSelection;
      };

      // IPC: manual check for updates
      ipcMain.handle('check-for-updates', async () => {
        try {
          await ensureFeedSelected();
          await autoUpdater.checkForUpdates();
          return { success: true, feed: activeUpdateFeed };
        } catch (err) {
          return { success: false, error: err.message };
        }
      });

      // IPC: which feed the app is actually updating from (Settings display)
      ipcMain.handle('get-update-feed', async () => ({ feed: await ensureFeedSelected() }));

      // IPC: get/set update settings
      ipcMain.handle('get-update-settings', () => loadUpdateSettings());
      ipcMain.handle('set-update-settings', (event, settings) => {
        const normalized = { autoUpdateEnabled: settings?.autoUpdateEnabled !== false };
        saveUpdateSettings(normalized);
        return normalized;
      });

      // IPC: get current app version
      ipcMain.handle('get-app-version', () => app.getVersion());

      // Auto-check on startup if enabled
      const updateSettings = loadUpdateSettings();
      if (updateSettings.autoUpdateEnabled) {
        setTimeout(() => {
          ensureFeedSelected()
            .then(() => autoUpdater.checkForUpdates())
            .catch(err => {
              console.error('Startup update check failed:', err);
            });
        }, 3000);
      }
    } catch (err) {
      console.log('Auto-updater not available:', err.message);
    }
  } else {
    // Dev mode: still register handlers so UI doesn't break
    ipcMain.handle('check-for-updates', () => ({ success: false, error: 'Updates not available in dev mode' }));
    ipcMain.handle('get-update-feed', () => ({ feed: 'dev' }));
    ipcMain.handle('get-update-settings', () => ({ autoUpdateEnabled: true }));
    ipcMain.handle('set-update-settings', (event, settings) => settings);
    ipcMain.handle('get-app-version', () => packageVersion);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Select output file
ipcMain.handle('select-output-file', async (event, module = 'crs', defaultName = null) => {
  const modulePrefix = module.toLowerCase();
  const moduleName = module.toUpperCase();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${moduleName} XML File`,
    defaultPath: defaultName || `${modulePrefix}_output.xml`,
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.filePath) grantPath(path.dirname(result.filePath));
  return result.filePath;
});

// Select CSV input file
ipcMain.handle('select-csv-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CSV Data File',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  const picked = result.filePaths[0] || null;
  if (picked) grantPath(path.dirname(picked));
  return picked;
});

// Generate CSV preview
ipcMain.handle('generate-csv-preview', async (event, formData) => {
  // Write the scratch CSV to the OS temp dir — the project root is inside the
  // read-only asar bundle in a packaged build, so writing there would fail.
  const tempCsvPath = path.join(app.getPath('temp'), 'crs-preview', 'temp_preview.csv');
  fs.mkdirSync(path.dirname(tempCsvPath), { recursive: true });

  return runPythonCommand({
    module: 'crs_generator.cli',
    args: [
      '--mode', 'preview',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', trimId(formData.sendingCompanyIN),
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts || '0',
      '--organisation-accounts', formData.organisationAccounts || '0',
      '--controlling-persons', formData.controllingPersons || '1',
      ...(formData.crsVersion ? ['--crs-version', formData.crsVersion] : []),
      '--output', tempCsvPath,
      '--preview-limit', '20',
      '--preview-json'
    ]
  });
});

// Save CSV preview to file
ipcMain.handle('save-csv-preview', async (event, formData) => {
  const dialogResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CSV Preview',
    defaultPath: 'crs_data_preview.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!dialogResult.filePath) return null;

  return runPythonCommand({
    module: 'crs_generator.cli',
    args: [
      '--mode', 'preview',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', trimId(formData.sendingCompanyIN),
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts || '0',
      '--organisation-accounts', formData.organisationAccounts || '0',
      '--controlling-persons', formData.controllingPersons || '1',
      ...(formData.crsVersion ? ['--crs-version', formData.crsVersion] : []),
      '--output', dialogResult.filePath
    ],
    parseJson: false,
    outputPath: dialogResult.filePath
  });
});

// Generate CRS file
ipcMain.handle('generate-crs', async (event, formData) => {
  let args = [];
  
  if (formData.mode === 'csv') {
    args.push('--mode', 'csv', '--csv-input', formData.csvPath, '--output', formData.outputPath);
    // The CSV path supports CRS 3.0 too, driven by the optional v3 columns.
    if (formData.crsVersion) args.push('--crs-version', formData.crsVersion);
  } else {
    args.push(
      '--mode', 'random',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', trimId(formData.sendingCompanyIN),
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts,
      '--organisation-accounts', formData.organisationAccounts,
      '--controlling-persons', formData.controllingPersons,
      '--output', formData.outputPath
    );

    // Domestic vs foreign delivery. The generator uses it to reject a "foreign"
    // file whose two countries match, which MDES would silently treat as a
    // domestic filing.
    if (formData.fileType) {
      args.push('--file-type', formData.fileType);
    }

    // CRS schema version. Both paths support 3.0; the CSV branch above passes
    // the same flag.
    if (formData.crsVersion) {
      args.push('--crs-version', formData.crsVersion);
    }

    if (formData.reportingFITINs && formData.reportingFITINs.length > 0) {
      args.push('--reporting-fi-tins', trimIdList(formData.reportingFITINs).join(','));
    }

    if (formData.accountHolderMode !== 'random') {
      args.push('--account-holder-mode', formData.accountHolderMode);
      if (formData.accountHolderCountries) {
        args.push('--account-holder-countries', formData.accountHolderCountries);
      }
    }
  }

  // Test env uses OECD11 (default); production uses OECD1 (MDES 50010/50011).
  if (formData.testMode === false) args.push('--production');

  const result = await runPythonCommand({
    module: 'crs_generator.cli',
    args,
    event,
    parseJson: false,
    outputPath: formData.outputPath
  });

  result.message = 'CRS file generated successfully!';
  return result;
});

// Open file location
ipcMain.handle('open-file-location', async (event, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});

// Helper function to find Python executable
function findPythonExecutable() {
  const possibleCommands = ['python', 'python3', 'py'];
  
  for (const cmd of possibleCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' });
      console.log(`Found Python: ${cmd}`);
      return cmd;
    } catch (e) {
      continue;
    }
  }
  
  // Try specific paths on Windows
  const windowsPaths = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
  ];

  for (const pythonPath of windowsPaths) {
    try {
      if (fs.existsSync(pythonPath)) {
        console.log(`Found Python at: ${pythonPath}`);
        return pythonPath;
      }
    } catch (e) {
      continue;
    }
  }

  console.error('Python not found');
  return null;
}

/**
 * Reusable helper to run Python CLI commands and return results.
 * In production: uses bundled PyInstaller executables from python-dist/
 * In development: uses system Python with -m module invocation
 *
 * @param {object} options - Configuration options
 * @param {string} options.module - Python module to run (e.g., 'crs_generator.cli')
 * @param {string[]} options.args - Arguments to pass to the module
 * @param {object} [options.event] - IPC event for progress updates (optional)
 * @param {boolean} [options.parseJson=true] - Whether to parse output as JSON
 * @param {string} [options.outputPath] - Path to output file for file stats
 * @param {boolean} [options.allowNonZeroJson=false] - Resolve JSON output even when the CLI exits non-zero
 * @param {object} [options.env] - Extra environment variables. Used to pass secrets
 *   (certificate passwords) out of band, since argv is visible to every process.
 * @returns {Promise<object>} - Parsed result or raw output
 */
function runPythonCommand({ module, args, event = null, parseJson = true, outputPath = null, allowNonZeroJson = false, env = null }) {
  return new Promise((resolve, reject) => {
    let exePath, spawnArgs, cwd;

    // Production: use bundled PyInstaller executables
    const bundledExe = !isDev ? getBundledExePath(module) : null;
    if (bundledExe) {
      exePath = bundledExe;
      spawnArgs = args;
      cwd = path.dirname(bundledExe);
      console.log(`[Production] Running bundled: ${path.basename(bundledExe)} ${args.join(' ')}`);
    } else {
      // Development: use system Python
      const pythonPath = findPythonExecutable();
      if (!pythonPath) {
        reject(new Error('Python not found. Please install Python 3.8 or higher.'));
        return;
      }
      exePath = pythonPath;
      spawnArgs = ['-m', module, ...args];
      cwd = path.join(__dirname, '../..');
    }

    const pythonProcess = spawn(exePath, spawnArgs, {
      cwd,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...(env || {}) }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      if (event) {
        event.sender.send('generation-progress', data.toString());
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const parseJsonOutput = () => {
      // Find JSON in output (skip any print statements before it)
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // Add file stats if outputPath provided
        if (outputPath && fs.existsSync(outputPath)) {
          const fileStats = fs.statSync(outputPath);
          result.filePath = outputPath;
          result.fileSize = (fileStats.size / (1024 * 1024)).toFixed(2);
        }
        return result;
      }
      return null;
    };

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        if (parseJson) {
          try {
            const result = parseJsonOutput();
            if (result) {
              resolve(result);
            } else {
              // No JSON found, return success with output
              resolve({ success: true, output: stdout });
            }
          } catch (e) {
            reject(new Error(`Failed to parse output: ${e.message}. Output: ${stdout}`));
          }
        } else {
          // Return raw output
          if (outputPath && fs.existsSync(outputPath)) {
            const fileStats = fs.statSync(outputPath);
            resolve({
              success: true,
              filePath: outputPath,
              fileSize: (fileStats.size / (1024 * 1024)).toFixed(2),
              output: stdout
            });
          } else {
            resolve({ success: true, output: stdout });
          }
        }
      } else {
        if (parseJson && allowNonZeroJson) {
          try {
            const result = parseJsonOutput();
            if (result) {
              resolve(result);
              return;
            }
          } catch (e) {
            reject(new Error(`Failed to parse output: ${e.message}. Output: ${stdout}`));
            return;
          }
        }
        reject(new Error(stderr || stdout || `Command failed with exit code ${code}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
}

// Validate CSV file
ipcMain.handle('validate-csv', async (event, csvPath) => {
  return runPythonCommand({
    module: 'crs_generator.cli',
    args: ['--mode', 'validate', '--csv-input', csvPath, '--output', 'dummy.xml'],
    allowNonZeroJson: true
  });
});

// Validate CBC CSV file
ipcMain.handle('validate-cbc-csv', async (event, csvPath) => {
  return runPythonCommand({
    module: 'crs_generator.cbc_cli',
    args: ['validate-csv', '--csv-input', csvPath],
    allowNonZeroJson: true
  });
});

// Download CSV template
ipcMain.handle('download-csv-template', async (event, module = 'crs') => {
  const modulePrefix = module.toLowerCase();
  const moduleName = module.toUpperCase();
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${moduleName} CSV Template`,
    defaultPath: `${modulePrefix}_template.csv`,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.filePath) {
    return null;
  }

  let template;
  
  if (module === 'cbc') {
    // CBC template
    template = `TransmittingCountry,ReceivingCountry,TaxYear,SendingEntityIN,ReportingEntity_TIN,ReportingEntity_Name,ReportingEntity_CountryCode,MNEGroup_Name,ReportingRole,JurisdictionCode,Entity_TIN,Entity_Name,Entity_CountryCode,Entity_Role,IncorporationCountry,BizActivity1,BizActivity2,OtherEntityInfo,Revenue_Unrelated,Revenue_Related,Revenue_Total,ProfitLoss,TaxPaid,TaxAccrued,Capital,Earnings,NumEmployees,TangibleAssets,Currency
NL,NL,2023,20001010,NL123456789,Example Holding BV,NL,Example MNE Group,CBC701,US,US987654321,Example US Subsidiary Inc,US,CBC802,US,CBC505,CBC508,Sales and finance operations,5000000,2000000,7000000,1500000,300000,350000,10000000,8000000,50,3000000,USD
NL,NL,2023,20001010,NL123456789,Example Holding BV,NL,Example MNE Group,CBC701,DE,DE456789012,Example Germany GmbH,DE,CBC802,DE,CBC504,CBC503,Manufacturing and procurement,8000000,1500000,9500000,2000000,400000,450000,15000000,12000000,120,8000000,EUR
NL,NL,2023,20001010,NL123456789,Example Holding BV,NL,Example MNE Group,CBC701,GB,GB321654987,Example UK Ltd,GB,CBC802,GB,CBC501,CBC502,Research and IP management,3000000,500000,3500000,800000,160000,180000,5000000,4000000,35,2000000,GBP`;
  } else {
    // CRS template (default)
    template = `SendingCompanyIN,TransmittingCountry,ReceivingCountry,TaxYear,ReportingFI_TIN,ReportingFI_Name,ReportingFI_Address_Street,ReportingFI_Address_BuildingNumber,ReportingFI_Address_City,ReportingFI_Address_PostCode,ReportingFI_Address_CountryCode,AccountNumber,AccountBalance,AccountCurrency,AccountClosed,AccountDormant,Individual_FirstName,Individual_LastName,Individual_BirthDate,Individual_TIN,Individual_TIN_CountryCode,Individual_Address_Street,Individual_Address_City,Individual_Address_PostCode,Individual_Address_CountryCode,Individual_ResCountryCode,Organisation_Name,Organisation_TIN,Organisation_TIN_CountryCode,Organisation_Address_Street,Organisation_Address_City,Organisation_Address_PostCode,Organisation_Address_CountryCode,Organisation_ResCountryCode,ControllingPerson_FirstName,ControllingPerson_LastName,ControllingPerson_BirthDate,ControllingPerson_TIN,ControllingPerson_TIN_CountryCode,ControllingPerson_Address_Street,ControllingPerson_Address_City,ControllingPerson_Address_CountryCode,ControllingPerson_ResCountryCode,Payment_Type,Payment_Amount,Payment_Currency
"NL123456789","NL","DE","2024","FI001","Example Bank NL","Main Street","100","Amsterdam","1012AB","NL","ACC000001","50000.00","EUR","false","false","John","Doe","1985-03-15","DE123456789","DE","Berliner Str 45","Berlin","10115","DE","DE","","","","","","","","","","","","","","","","","CRS501","2500.00","EUR"
"NL123456789","NL","DE","2024","FI001","Example Bank NL","Main Street","100","Amsterdam","1012AB","NL","ACC000002","125000.00","EUR","false","false","","","","","","","","","","","ACME Corporation GmbH","DE987654321","DE","Business Ave 200","Munich","80331","DE","DE","Jane","Smith","1978-07-22","DE111222333","DE","Corporate Lane 50","Munich","DE","DE","CRS502","8500.00","EUR"`;
  }

  try {
    fs.writeFileSync(result.filePath, template, 'utf-8');
    return result.filePath;
  } catch (err) {
    console.error('Error writing template:', err);
    throw new Error(`Failed to save template: ${err.message}`);
  }
});

// Select XML file for correction
ipcMain.handle('select-xml-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CRS XML File',
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (result.filePaths && result.filePaths.length > 0) {
    grantPath(path.dirname(result.filePaths[0]));
    return result.filePaths[0];
  }
  return null;
});

// Validate XML file
ipcMain.handle('validate-xml', async (event, xmlPath) => {
  return runPythonCommand({
    module: 'crs_generator.cli',
    args: ['--mode', 'validate-xml', '--xml-input', xmlPath, '--output', 'dummy'],
    allowNonZeroJson: true
  });
});

// Generate correction file
ipcMain.handle('generate-correction', async (event, options) => {
  const args = [
    '--mode', 'correction',
    '--xml-input', options.xmlPath,
    '--output', options.outputPath,
    '--correct-individual', options.correctIndividual?.toString() || '0',
    '--correct-organisation', options.correctOrganisation?.toString() || '0',
    '--delete-individual', options.deleteIndividual?.toString() || '0',
    '--delete-organisation', options.deleteOrganisation?.toString() || '0'
  ];
  
  if (options.correctFI) args.push('--correct-fi');
  if (options.modifyBalance) args.push('--modify-balance');
  if (options.modifyAddress) args.push('--modify-address');
  if (options.modifyName) args.push('--modify-name');
  if (options.testMode === false) args.push('--production');

  const result = await runPythonCommand({
    module: 'crs_generator.cli',
    args,
    outputPath: options.outputPath
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Correction generation failed');
  }
  return result;
});

// Select output file for correction
ipcMain.handle('select-correction-output', async (event, module = 'crs') => {
  const modulePrefix = module.toLowerCase();
  const moduleName = module.toUpperCase();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${moduleName} Correction File`,
    defaultPath: `${modulePrefix}_correction.xml`,
    filters: [
      { name: 'XML Files', extensions: ['xml'] }
    ]
  });
  return result.filePath;
});

// Select correction CSV file
ipcMain.handle('select-correction-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Correction CSV File',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths[0]) {
    return { path: null, preview: null };
  }

  const filePath = result.filePaths[0];
  grantPath(path.dirname(filePath));

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')) : [];
    const rows = lines.slice(1).map(line => {
      // Simple CSV parsing (handles basic cases)
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });

    return {
      path: filePath,
      preview: {
        headers,
        rows: rows.slice(0, 10),
        rowCount: rows.length
      }
    };
  } catch (err) {
    console.error('Error reading CSV:', err);
    return { path: filePath, preview: null, error: err.message };
  }
});

// Download correction CSV template
ipcMain.handle('download-correction-csv-template', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Correction CSV Template',
    defaultPath: 'correction_template.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  const template = `DocRefId,Action,AccountNumber,AccountBalance,AccountCurrency,Individual_FirstName,Individual_LastName,Individual_BirthDate,Individual_TIN,Individual_ResCountryCode,Individual_Address_Street,Individual_Address_City,Individual_Address_PostCode,Individual_Address_CountryCode,Organisation_Name,Organisation_TIN,Organisation_ResCountryCode,Organisation_Address_Street,Organisation_Address_City,Organisation_Address_PostCode,Organisation_Address_CountryCode
"EXAMPLE_DOCREFID_001","correct","ACC123456","50000.00","EUR","John","Doe","1985-03-15","123456789","DE","Main Street 123","Berlin","10115","DE","","","","","","",""
"EXAMPLE_DOCREFID_002","delete","","","","","","","","","","","","","","","","","","",""
"EXAMPLE_DOCREFID_003","correct","ACC789012","75000.00","EUR","","","","","","","","","","ACME Corp","987654321","NL","Business Ave 456","Amsterdam","1012AB","NL"`;

  try {
    fs.writeFileSync(result.filePath, template, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    console.error('Error writing template:', err);
    return { success: false, error: err.message };
  }
});

// ============== FATCA IPC Handlers ==============

// Generate FATCA file
ipcMain.handle('generate-fatca', async (event, formData) => {
  const args = [
    '--mode', 'random',
    '--variant', formData.variant === 'fatca-oecd' ? 'fatca-oecd' : 'fatca-crs',
    // FC schema version; ignored by the fatca-oecd variant.
    '--fc-version', formData.fcVersion || '2.2',
    '--sending-country', formData.transmittingCountry || 'NL',
    '--receiving-country', formData.receivingCountry || 'US',
    '--tax-year', formData.reportingPeriod || new Date().getFullYear().toString(),
    '--sending-company-in', trimId(formData.sendingCompanyIN) || '000000.00000.TA.531',
    '--num-fis', formData.numReportingFIs || '1',
    '--filer-category', formData.filerCategory || 'FATCA601',
    '--individual-accounts', formData.individualAccounts || '0',
    '--organisation-accounts', formData.organisationAccounts || '0',
    '--substantial-owners', formData.substantialOwners || '1',
    '--output', formData.outputPath
  ];

  if (formData.reportingFITINs && formData.reportingFITINs.length > 0) {
    args.push('--reporting-fi-tins', formData.reportingFITINs.join(','));
  }

  if (formData.accountHolderMode !== 'random') {
    args.push('--account-holder-mode', formData.accountHolderMode);
    if (formData.accountHolderCountries) {
      args.push('--account-holder-countries', formData.accountHolderCountries);
    }
  }

  if (formData.testMode === false) args.push('--production');

  return runPythonCommand({
    module: 'crs_generator.fatca_cli',
    args,
    event,
    parseJson: false,
    outputPath: formData.outputPath
  });
});

// Validate FATCA XML file
ipcMain.handle('validate-fatca-xml', async (event, xmlPath) => {
  return runPythonCommand({
    module: 'crs_generator.fatca_cli',
    args: ['--mode', 'validate-xml', '--xml-input', xmlPath, '--output', 'dummy'],
    allowNonZeroJson: true
  });
});

// Generate FATCA correction
ipcMain.handle('generate-fatca-correction', async (event, options) => {
  const args = [
    '--mode', 'correction',
    '--variant', options.variant === 'fatca-oecd' ? 'fatca-oecd' : 'fatca-crs',
    '--xml-input', options.xmlPath,
    '--output', options.outputPath,
    '--correct-individual', options.correctIndividual.toString(),
    '--correct-organisation', options.correctOrganisation.toString(),
    '--delete-individual', options.deleteIndividual.toString(),
    '--delete-organisation', options.deleteOrganisation.toString()
  ];

  if (options.correctFI) args.push('--correct-fi');
  if (options.modifyBalance) args.push('--modify-balance');
  if (options.modifyAddress) args.push('--modify-address');
  if (options.modifyName) args.push('--modify-name');
  if (options.testMode === false) args.push('--production');

  return runPythonCommand({
    module: 'crs_generator.fatca_cli',
    args,
    outputPath: options.outputPath
  });
});

// ============== CRS Country Code Replacer ==============

// Replace country codes in CRS XML file with allowed partner jurisdictions
ipcMain.handle('replace-crs-country-codes', async (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      const { xmlPath, outputPath, allowedCountries, convertToTestMode } = options;
      
      if (!allowedCountries || allowedCountries.length === 0) {
        reject(new Error('No partner jurisdictions configured'));
        return;
      }
      
      let content = fs.readFileSync(xmlPath, 'utf8');
      
      // Check if it's a CRS file
      if (!content.includes('CRS_OECD') && !content.includes('urn:oecd:ties:crs')) {
        reject(new Error('Not a valid CRS XML file'));
        return;
      }
      
      // Extract SendingCountry from MessageSpec
      const sendingCountryMatch = content.match(/<(?:crs:)?SendingCompanyIN>([A-Z]{2})/);
      const sendingCountry = sendingCountryMatch ? sendingCountryMatch[1] : null;
      
      // Also try to get it from the TIN prefix pattern or explicit SendingCountry element
      const sendingCountryAltMatch = content.match(/<(?:crs:)?SendingCountry>([A-Z]{2})<\/(?:crs:)?SendingCountry>/);
      const messageSendingCountry = sendingCountryAltMatch ? sendingCountryAltMatch[1] : sendingCountry;
      
      let reportingFIFixed = false;
      let originalReportingFICountry = null;
      
      // Rule: ReportingFI.ResCountryCode must match Message SendingCountry
      if (messageSendingCountry) {
        // Find ReportingFI section and fix its ResCountryCode
        const reportingFIRegex = /(<(?:crs:)?ReportingFI>[\s\S]*?<(?:crs:)?ResCountryCode>)([A-Z]{2})(<\/(?:crs:)?ResCountryCode>[\s\S]*?<\/(?:crs:)?ReportingFI>)/;
        const reportingFIMatch = content.match(reportingFIRegex);
        if (reportingFIMatch && reportingFIMatch[2] !== messageSendingCountry) {
          originalReportingFICountry = reportingFIMatch[2];
          content = content.replace(reportingFIRegex, `$1${messageSendingCountry}$3`);
          reportingFIFixed = true;
        }
      }
      
      // Find all country codes in ResCountryCode elements (account holder residence) - excluding ReportingFI
      // We need to find ResCountryCode inside AccountHolder elements only
      const resCountryRegex = /<(?:crs:)?ResCountryCode>([A-Z]{2})<\/(?:crs:)?ResCountryCode>/g;
      const foundCountries = new Set();
      let match;
      while ((match = resCountryRegex.exec(content)) !== null) {
        foundCountries.add(match[1]);
      }
      
      // Filter to only countries not in allowed list (for account holders)
      const countriesToReplace = [...foundCountries].filter(c => !allowedCountries.includes(c));
      
      // Create replacement map - distribute replaced countries among allowed ones
      const replacements = {};
      countriesToReplace.forEach((country, index) => {
        replacements[country] = allowedCountries[index % allowedCountries.length];
      });
      
      // Replace country codes in account holder ResCountryCode elements
      // But NOT in ReportingFI (which we already fixed to match SendingCountry)
      // Use simple, fast replacement - replace all ResCountryCode except the one in ReportingFI
      let replacedCount = 0;
      for (const [oldCode, newCode] of Object.entries(replacements)) {
        // Simple global replace of ResCountryCode values
        // This is much faster than complex regex with backtracking
        const simpleRegex = new RegExp(`(<(?:crs:)?ResCountryCode>)${oldCode}(<\\/(?:crs:)?ResCountryCode>)`, 'g');
        const before = content;
        content = content.replace(simpleRegex, `$1${newCode}$2`);
        if (content !== before) {
          replacedCount++;
        }
      }
      
      // Convert DocTypeIndic values for test/production mode
      let docTypeIndicConverted = false;
      let originalDocTypeIndicValues = [];
      let newDocTypeIndicValues = [];
      
      if (convertToTestMode) {
        // Production to Test: OECD1->OECD11, OECD2->OECD12, OECD3->OECD13
        // ReportingFI should use OECD0 in test mode
        const docTypeIndicConversions = [
          { from: 'OECD1', to: 'OECD11' },
          { from: 'OECD2', to: 'OECD12' },
          { from: 'OECD3', to: 'OECD13' }
        ];
        
        for (const conv of docTypeIndicConversions) {
          // Check if this value exists in the file
          const checkRegex = new RegExp(`<(?:stf:)?DocTypeIndic>${conv.from}<\\/(?:stf:)?DocTypeIndic>`);
          if (checkRegex.test(content)) {
            originalDocTypeIndicValues.push(conv.from);
            newDocTypeIndicValues.push(conv.to);
            
            // Replace all occurrences
            const replaceRegex = new RegExp(`(<(?:stf:)?DocTypeIndic>)${conv.from}(<\\/(?:stf:)?DocTypeIndic>)`, 'g');
            content = content.replace(replaceRegex, `$1${conv.to}$2`);
            docTypeIndicConverted = true;
          }
        }
        
        // Special case: ReportingFI DocSpec should use OECD0 for resend scenario
        // But typically for test data we just convert to OECD11/12/13
      }
      
      // Write output file
      fs.writeFileSync(outputPath, content, 'utf8');
      
      resolve({
        success: true,
        filePath: outputPath,
        originalCountries: [...foundCountries].sort(),
        replacedCountries: Object.keys(replacements).sort(),
        replacements: replacements,
        allowedCountries: allowedCountries,
        reportingFIFixed: reportingFIFixed,
        originalReportingFICountry: originalReportingFICountry,
        messageSendingCountry: messageSendingCountry,
        docTypeIndicConverted: docTypeIndicConverted,
        originalDocTypeIndicValues: originalDocTypeIndicValues,
        newDocTypeIndicValues: newDocTypeIndicValues
      });
    } catch (error) {
      reject(new Error(`Failed to replace country codes: ${error.message}`));
    }
  });
});

// ============== CBC IPC Handlers ==============

// Validate CBC XML file
ipcMain.handle('validate-cbc-xml', async (event, xmlPath) => {
  return runPythonCommand({
    module: 'crs_generator.cbc_cli',
    args: ['validate-xml', '--xml-input', xmlPath],
    allowNonZeroJson: true
  });
});

// Generate CBC file
ipcMain.handle('generate-cbc', async (event, formData) => {
  let args = ['generate'];
  
  // Check if CSV mode
  if (formData.mode === 'csv' && formData.csvPath) {
    args.push('--mode', 'csv', '--csv-input', formData.csvPath, '--output', formData.outputPath);
  } else {
    // Random mode
    args.push(
      '--mode', 'random',
      '--country', formData.transmittingCountry || 'NL',
      '--year', formData.reportingPeriod || new Date().getFullYear().toString(),
      '--tin', trimId(formData.sendingEntityIN) || '123456789',
      '--reports', formData.numCbcReports || '3',
      '--entities', formData.constEntitiesPerReport || '2',
      '--role', formData.reportingRole || 'CBC701',
      '--output', formData.outputPath
    );

    if (formData.mneGroupName) args.push('--mne-name', formData.mneGroupName);
    if (formData.reportingEntityName) args.push('--entity-name', formData.reportingEntityName);
  }

  if (!formData.testMode) args.push('--production');

  return runPythonCommand({
    module: 'crs_generator.cbc_cli',
    args,
    event,
    parseJson: false,
    outputPath: formData.outputPath
  });
});

// Read Excel file and convert to CSV format
ipcMain.handle('read-excel-file', async (event, filePath) => {
  try {
    // For now, return an error suggesting Excel support needs xlsx package
    // This can be enhanced later with actual xlsx parsing
    return {
      error: 'Excel support requires additional setup. Please convert to CSV first.',
      suggestion: 'Use Excel to save as CSV, or install xlsx package for direct support.'
    };
  } catch (error) {
    return { error: error.message };
  }
});

// Get app statistics from storage
ipcMain.handle('get-app-stats', async () => {
  try {
    const statsPath = path.join(app.getPath('userData'), 'app-stats.json');
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }
    return { totalGenerated: 0, totalAccounts: 0, byModule: {}, lastGeneration: null };
  } catch (error) {
    return { totalGenerated: 0, totalAccounts: 0, byModule: {}, lastGeneration: null };
  }
});

// Save app statistics
ipcMain.handle('save-app-stats', async (event, stats) => {
  try {
    const statsPath = path.join(app.getPath('userData'), 'app-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-save form state
ipcMain.handle('save-form-state', async (event, { module, state }) => {
  try {
    const statePath = path.join(app.getPath('userData'), `${module}-form-state.json`);
    fs.writeFileSync(statePath, JSON.stringify({ state, savedAt: Date.now() }, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load saved form state
ipcMain.handle('load-form-state', async (event, module) => {
  try {
    const statePath = path.join(app.getPath('userData'), `${module}-form-state.json`);
    if (fs.existsSync(statePath)) {
      const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      // Only return if saved within last 24 hours
      if (Date.now() - data.savedAt < 24 * 60 * 60 * 1000) {
        return data.state;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
});

// Generate CBC correction/deletion
ipcMain.handle('generate-cbc-correction', async (event, options) => {
  const args = [
    'correct',
    '--source', options.sourceXmlPath,
    '--type', options.correctionType || 'correction',
    '--output', options.outputPath
  ];

  if (options.csvPath) args.push('--csv', options.csvPath);
  if (!options.testMode) args.push('--production');

  return runPythonCommand({
    module: 'crs_generator.cbc_cli',
    args,
    event,
    parseJson: false,
    outputPath: options.outputPath
  });
});

// ============== Error Injector IPC Handlers ==============

// Select file for error injection (supports XML and CSV)
ipcMain.handle('select-error-injector-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select File to Corrupt',
    filters: [
      { name: 'XML & CSV Files', extensions: ['xml', 'csv'] },
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  
  if (result.filePaths && result.filePaths.length > 0) {
    grantPath(path.dirname(result.filePaths[0]));
    return result.filePaths[0];
  }
  return null;
});

// Corrupt file with error injection
ipcMain.handle('corrupt-file', async (event, config) => {
  const { module, fileType, corruptionLevel, preset, customOptions, inputFile } = config;
  
  // Generate output filename
  const inputPath = inputFile;
  assertPathAllowed(inputPath, 'error-injector input file');
  const outputDir = path.dirname(inputPath);
  const inputName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${inputName}_CORRUPTED_${preset}${path.extname(inputPath)}`);
  
  const args = [
    '--input', inputPath,
    '--output', outputPath,
    '--module', module,
    '--file-type', fileType,
    '--preset', preset,
    '--level', corruptionLevel.toString(),
    '--options', JSON.stringify(customOptions)
  ];
  
  return runPythonCommand({
    module: 'crs_generator.error_injector',
    args,
    event,
    parseJson: true
  });
});

// Open file in default application
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


// ============================================================
// CTS / IDES PACKAGING IPC HANDLERS
// ============================================================
// MDES only accepts encrypted, signed, zipped deliveries. The Python side
// (crs_generator.cts) builds them; everything here is about getting the
// certificates and their passwords to it safely.

// The store the app actually works from: a user-writable copy in userData, so
// a tester can replace an expiring certificate without waiting for a release.
function ctsStoreRoot() {
  return path.join(app.getPath('userData'), 'certificates');
}

// The read-only pack shipped with the app, used to seed the store once.
function ctsSeedRoot() {
  return isDev
    ? path.join(__dirname, '..', '..', 'crs_generator', 'certificates')
    : path.join(process.resourcesPath, 'certificates');
}

// Seed on first use only. Re-seeding would silently undo a replacement the
// user made deliberately, so a store that already has content is never touched.
function ensureCtsStore() {
  const store = ctsStoreRoot();
  try {
    if (fs.existsSync(store) && fs.readdirSync(store).length > 0) return store;
    const seed = ctsSeedRoot();
    if (!fs.existsSync(seed)) return store;
    fs.mkdirSync(store, { recursive: true });
    fs.cpSync(seed, store, { recursive: true });
    console.log(`Seeded certificate store from ${seed}`);
  } catch (error) {
    console.error('Could not seed the certificate store:', error.message);
  }
  return store;
}

// Signing passwords are per-country and belong to the user, not the repository.
// safeStorage binds them to the OS account; without it we keep them in memory
// for the session only rather than writing plaintext to disk.
const _ctsSessionPasswords = new Map();

function ctsPasswordsPath() {
  return path.join(app.getPath('userData'), 'cts-passwords.enc');
}

function loadCtsPasswords() {
  if (!safeStorage.isEncryptionAvailable()) {
    return Object.fromEntries(_ctsSessionPasswords);
  }
  try {
    const blob = fs.readFileSync(ctsPasswordsPath());
    return JSON.parse(safeStorage.decryptString(blob));
  } catch {
    return {};
  }
}

function saveCtsPassword(country, password) {
  const code = String(country || '').toUpperCase();
  if (!code) throw new Error('A country is required');
  if (!safeStorage.isEncryptionAvailable()) {
    _ctsSessionPasswords.set(code, password);
    return { persisted: false };
  }
  const all = loadCtsPasswords();
  if (password) {
    all[code] = password;
  } else {
    delete all[code];
  }
  fs.writeFileSync(ctsPasswordsPath(), safeStorage.encryptString(JSON.stringify(all)));
  return { persisted: true };
}

function ctsPasswordFor(country) {
  const code = String(country || '').toUpperCase();
  const stored = loadCtsPasswords();
  return stored[code] || _ctsSessionPasswords.get(code) || '';
}

// One place decides what the Python side sees: the store location always, and a
// password only when we hold one for the country in question. It travels in the
// environment rather than argv, which is readable by every process.
function ctsEnv(country) {
  const env = { MDES_CERT_STORE: ensureCtsStore() };
  const password = country ? ctsPasswordFor(country) : '';
  if (password) env.MDES_SIGNING_PASSWORD = password;
  return env;
}

// What is in the store, and what is close to expiry.
ipcMain.handle('cts-list-certificates', async (event, country = null) => {
  const args = ['certificates'];
  if (country) args.push('--country', country);
  return runPythonCommand({
    module: 'crs_generator.cts_cli',
    args,
    env: ctsEnv(country),
    allowNonZeroJson: true
  });
});

// Whether a country can sign, i.e. whether the stored password actually opens
// its certificate. Answers without handing the password back to the renderer.
ipcMain.handle('cts-check-password', async (event, country) => {
  if (!ctsPasswordFor(country)) {
    return { success: false, hasPassword: false, error: 'No password stored for this country' };
  }
  const result = await runPythonCommand({
    module: 'crs_generator.cts_cli',
    args: ['certificates', '--country', country],
    env: ctsEnv(country),
    allowNonZeroJson: true
  });
  const canSign = (result.certificates || []).some(c => c.role === 'signing');
  return { ...result, hasPassword: true, canSign };
});

ipcMain.handle('cts-set-password', async (event, options) => {
  try {
    const { country, password } = options || {};
    return { success: true, ...saveCtsPassword(country, password) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Which countries already have a password, so the UI can show the gap without
// reading any of the values.
ipcMain.handle('cts-countries-with-passwords', async () => {
  try {
    return { success: true, countries: Object.keys(loadCtsPasswords()) };
  } catch (error) {
    return { success: false, error: error.message, countries: [] };
  }
});

// Replace a country's certificate files in the user's store.
// Importing a password file. The estate keeps its certificate passwords in an
// ART checkout at TestData/Certificates/Passwords.csv, and typing eleven of them
// into the screen below - correctly, on every tester's machine - is not a plan.
//
// The file is read here in the main process and never reaches the renderer. The
// Python side is asked which entry actually opens each country, because at least
// one country is listed twice with two different passwords and only the second
// one works; storing whichever came first would leave that country quietly
// unable to sign.
function parsePasswordFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const byCountry = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [rawCountry, rawPassword] = line.split(',');
    const country = String(rawCountry || '').trim().replace(/^"|"$/g, '').toUpperCase();
    const password = String(rawPassword || '').trim().replace(/^"|"$/g, '');
    if (!password || !/^[A-Z]{2}$/.test(country)) continue;  // skips the header
    const candidates = byCountry.get(country) || [];
    if (!candidates.includes(password)) candidates.push(password);
    byCountry.set(country, candidates);
  }
  return byCountry;
}

ipcMain.handle('cts-import-passwords', async (event, filePath = null) => {
  let source = filePath;
  if (!source) {
    const chosen = await dialog.showOpenDialog(mainWindow, {
      title: 'Import certificate passwords',
      message: 'Select an ART TestData/Certificates/Passwords.csv',
      filters: [
        { name: 'Password list', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (!chosen.filePaths || chosen.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    source = chosen.filePaths[0];
  }

  try {
    grantPath(path.dirname(source));
    const byCountry = parsePasswordFile(source);
    if (byCountry.size === 0) {
      return {
        success: false,
        error: 'No country/password rows in that file. Expected two columns, '
             + 'an ISO country code and its certificate password.'
      };
    }

    // Ask which candidate opens each country, by position. No password crosses
    // this boundary in either direction.
    const verified = await runPythonCommand({
      module: 'crs_generator.cts_cli',
      args: ['passwords', '--file', source],
      env: { MDES_CERT_STORE: ensureCtsStore() },
      allowNonZeroJson: true
    });
    const working = (verified && verified.workingCandidate) || {};

    const imported = [];
    const failed = [];
    let persisted = true;
    for (const [country, candidates] of byCountry) {
      const index = working[country];
      if (index === undefined || !candidates[index]) {
        failed.push(country);
        continue;
      }
      const result = saveCtsPassword(country, candidates[index]);
      persisted = persisted && result.persisted;
      imported.push(country);
    }

    return {
      success: imported.length > 0,
      file: source,
      imported: imported.sort(),
      failed: failed.sort(),
      persisted,
      warnings: [
        ...[...byCountry].filter(([, c]) => c.length > 1).map(([country]) =>
          `${country} is listed more than once with different passwords; the one `
          + `that opens the certificate was kept.`),
        ...(failed.length ? [
          `No password in the file opens ${failed.join(', ')}. `
          + `Either the certificate is a different generation, or the file is stale.`
        ] : []),
        ...(persisted ? [] : [
          'The OS credential store is unavailable, so these are held for this '
          + 'session only and will be gone after a restart.'
        ])
      ]
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cts-import-certificates', async (event, country) => {
  const code = String(country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return { success: false, error: 'Select a two-letter country code first' };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Import certificates for ${code}`,
    filters: [
      { name: 'Certificates', extensions: ['p12', 'pfx', 'crt', 'cer', 'pem'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });
  if (!result.filePaths || result.filePaths.length === 0) {
    return { success: false, cancelled: true };
  }

  try {
    const target = path.join(ensureCtsStore(), code);
    fs.mkdirSync(target, { recursive: true });
    const copied = [];
    for (const source of result.filePaths) {
      grantPath(path.dirname(source));
      fs.copyFileSync(source, path.join(target, path.basename(source)));
      copied.push(path.basename(source));
    }
    return { success: true, country: code, files: copied };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cts-open-store', async () => {
  try {
    await shell.openPath(ensureCtsStore());
    return { success: true, path: ctsStoreRoot() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reset the store to the pack shipped with this version.
ipcMain.handle('cts-restore-bundled-certificates', async () => {
  try {
    const store = ctsStoreRoot();
    if (fs.existsSync(store)) fs.rmSync(store, { recursive: true, force: true });
    ensureCtsStore();
    return { success: true, path: store };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cts-select-package-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a delivery package',
    filters: [
      { name: 'Delivery packages', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.filePaths && result.filePaths.length > 0) {
    grantPath(path.dirname(result.filePaths[0]));
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('cts-select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Where should the package be written?',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.filePaths && result.filePaths.length > 0) {
    grantPath(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

// Validate the selected source before the form derives any package settings.
// The Python validator owns the CRS/XSD/MDES rules; the renderer only displays
// its immutable facts.
ipcMain.handle('cts-validate-source', async (event, sourceFile) => {
  if (!sourceFile) return { success: false, valid: false, error: 'Select an XML file to package' };
  return runPythonCommand({
    module: 'crs_generator.cts_cli',
    args: ['validate-source', '--source', sourceFile],
    allowNonZeroJson: true
  });
});

// Build a delivery package.
ipcMain.handle('cts-pack', async (event, options) => {
  let {
    sourceFile, sender, receiver, communicationType = 'CRS', taxYear,
    outputDir = null, messageRefId = null, defects = []
  } = options || {};

  if (!sourceFile) return { success: false, error: 'Select an XML file to package' };

  // Validate first so a malformed/domestic/mismatched source is reported as
  // such, even when its purported sender has no stored certificate password.
  if (communicationType === 'CRS') {
    const validation = await runPythonCommand({
      module: 'crs_generator.cts_cli',
      args: ['validate-source', '--source', sourceFile],
      allowNonZeroJson: true
    });
    if (!validation.success) return validation;
    sender = validation.facts.sender;
    receiver = validation.facts.receiver;
    taxYear = validation.facts.taxYear;
  }

  if (!ctsPasswordFor(sender)) {
    return {
      success: false,
      error: `No signing password stored for ${String(sender).toUpperCase()}. `
           + 'Add it under Settings then Certificates.'
    };
  }

  const args = [
    'pack',
    '--source', sourceFile,
    '--type', communicationType,
    '--tax-year', String(taxYear)
  ];
  if (sender) args.push('--sender', sender);
  if (receiver) args.push('--receiver', receiver);
  if (outputDir) args.push('--output', outputDir);
  if (messageRefId) args.push('--message-ref-id', messageRefId);
  for (const defect of defects) args.push('--defect', defect);

  return runPythonCommand({
    module: 'crs_generator.cts_cli',
    args,
    event,
    env: ctsEnv(sender),
    allowNonZeroJson: true
  });
});

// Inspect a package. Reading the metadata needs nothing; decrypting needs the
// receiver's private key, so it is only attempted when a country is given.
ipcMain.handle('cts-unpack', async (event, options) => {
  const { packageFile, country = null, extractTo = null } = options || {};
  if (!packageFile) return { success: false, error: 'Select a package to inspect' };

  const args = ['unpack', '--package', packageFile];
  if (country) args.push('--country', country);
  if (extractTo) args.push('--extract-to', extractTo);

  return runPythonCommand({
    module: 'crs_generator.cts_cli',
    args,
    env: ctsEnv(country),
    allowNonZeroJson: true
  });
});



// ============================================================
// MDES TARGET IPC HANDLERS  (developer mode)
// ============================================================
// A "target" binds the app to a real MDES instance - its properties file plus a
// read-only database connection - so a package can be checked against the rules
// that instance actually enforces before it is built. See
// crs_generator/mdes_target/.

const MDES_TARGET_MODULE = 'crs_generator.mdes_target_cli';

// SQL passwords are per-target and belong to the user. Same treatment as the
// certificate passwords above: safeStorage where available, memory otherwise.
const _mdesTargetSessionPasswords = new Map();

function mdesTargetPasswordsPath() {
  return path.join(app.getPath('userData'), 'mdes-target-passwords.enc');
}

function loadMdesTargetPasswords() {
  if (!safeStorage.isEncryptionAvailable()) {
    return Object.fromEntries(_mdesTargetSessionPasswords);
  }
  try {
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(mdesTargetPasswordsPath())));
  } catch {
    return {};
  }
}

function saveMdesTargetPassword(name, password) {
  if (!name) throw new Error('A target name is required');
  if (!safeStorage.isEncryptionAvailable()) {
    _mdesTargetSessionPasswords.set(name, password);
    return { persisted: false };
  }
  const all = loadMdesTargetPasswords();
  if (password) all[name] = password; else delete all[name];
  fs.writeFileSync(mdesTargetPasswordsPath(), safeStorage.encryptString(JSON.stringify(all)));
  return { persisted: true };
}

// The environment the Python side sees: where targets and certificates live,
// plus whichever passwords this call legitimately needs. Nothing travels in argv.
function mdesTargetEnv(targetName = null, senderCountry = null) {
  const env = {
    MDES_TARGET_STORE: app.getPath('userData'),
    MDES_CERT_STORE: ensureCtsStore()
  };
  const dbPassword = targetName ? (loadMdesTargetPasswords()[targetName] || '') : '';
  if (dbPassword) env.MDES_TARGET_PASSWORD = dbPassword;
  const signingPassword = senderCountry ? ctsPasswordFor(senderCountry) : '';
  if (signingPassword) env.MDES_SIGNING_PASSWORD = signingPassword;
  return env;
}

function runMdesTarget(args, { target = null, sender = null, event = null } = {}) {
  return runPythonCommand({
    module: MDES_TARGET_MODULE,
    args,
    event,
    env: mdesTargetEnv(target, sender),
    allowNonZeroJson: true
  });
}

ipcMain.handle('mdes-target-discover', async (event, options) => {
  const { propsRoot = null, server = null } = options || {};
  const args = ['discover'];
  if (propsRoot) args.push('--props-root', propsRoot);
  if (server) args.push('--server', server);
  return runMdesTarget(args);
});

ipcMain.handle('mdes-target-list', async () => runMdesTarget(['list']));

ipcMain.handle('mdes-target-save', async (event, target) => {
  const { name, propsPath, server, database, driver, username } = target || {};
  const missing = [];
  if (!name) missing.push('Name');
  if (!propsPath) missing.push('Properties file');
  if (!server) missing.push('SQL Server');
  if (!database) missing.push('Database');
  if (missing.length) {
    return { success: false, error: `Still needed: ${missing.join(', ')}.`, missing };
  }
  const args = ['save', '--name', name];
  if (propsPath) args.push('--props', propsPath);
  if (server) args.push('--server', server);
  if (database) args.push('--database', database);
  if (driver) args.push('--driver', driver);
  if (username) args.push('--username', username);
  return runMdesTarget(args, { target: name });
});

ipcMain.handle('mdes-target-delete', async (event, name) =>
  runMdesTarget(['delete', '--name', name]));

// Try a connection before committing to it. A target saved with empty fields is
// the failure mode this exists to prevent.
ipcMain.handle('mdes-target-test', async (event, draft) => {
  const { propsPath, server, database, driver, username, password } = draft || {};
  const missing = [];
  if (!propsPath) missing.push('Properties file');
  if (!server) missing.push('SQL Server');
  if (!database) missing.push('Database');
  if (missing.length) {
    return {
      success: false,
      error: `Still needed: ${missing.join(', ')}.`,
      missing
    };
  }
  const args = ['test', '--props', propsPath, '--server', server, '--database', database];
  if (driver) args.push('--driver', driver);
  if (username) args.push('--username', username);
  return runPythonCommand({
    module: MDES_TARGET_MODULE,
    args,
    env: {
      MDES_TARGET_STORE: app.getPath('userData'),
      MDES_CERT_STORE: ensureCtsStore(),
      ...(password ? { MDES_TARGET_PASSWORD: password } : {})
    },
    allowNonZeroJson: true
  });
});

ipcMain.handle('mdes-target-set-password', async (event, options) => {
  try {
    const { name, password } = options || {};
    return { success: true, ...saveMdesTargetPassword(name, password) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mdes-target-resolve', async (event, name) =>
  runMdesTarget(['resolve', '--target', name], { target: name }));

ipcMain.handle('mdes-target-preflight', async (event, options) => {
  const { target, sender = null, receiver = null, communicationType = 'CRS',
          taxYear = null, messageRefId = null, doctypeIndics = [] } = options || {};
  if (!target) return { success: false, error: 'Select a target first' };
  const args = ['preflight', '--target', target, '--type', communicationType];
  if (sender) args.push('--sender', sender);
  if (receiver) args.push('--receiver', receiver);
  if (taxYear) args.push('--tax-year', String(taxYear));
  if (messageRefId) args.push('--message-ref-id', messageRefId);
  for (const indic of doctypeIndics || []) args.push('--doctype-indic', indic);
  return runMdesTarget(args, { target, sender });
});

// The one-click path. Preflight runs first so we know which country the target
// wants us to send as, and therefore which signing password to hand over - the
// caller does not have to know either.
async function withResolvedSender(options, run) {
  const { target, sender = null } = options || {};
  if (!target) return { success: false, error: 'Select a target first' };
  let chosen = sender;
  if (!chosen) {
    const preflight = await runMdesTarget(
      ['preflight', '--target', target, '--type', options.communicationType || 'CRS'],
      { target }
    );
    chosen = preflight.sender || null;
    if (!chosen) {
      return {
        success: false,
        error: 'No sending country on this target has a certificate matching ours.',
        ...preflight
      };
    }
  }
  if (!ctsPasswordFor(chosen)) {
    return {
      success: false,
      error: `No signing password stored for ${chosen}. Add it under Settings, Certificates.`,
      sender: chosen
    };
  }
  return run(chosen);
}

ipcMain.handle('mdes-target-build', async (event, options) => {
  const opts = options || {};
  return withResolvedSender(opts, (sender) => {
    const args = ['build', '--target', opts.target, '--sender', sender,
                  '--type', opts.communicationType || 'CRS'];
    if (opts.receiver) args.push('--receiver', opts.receiver);
    if (opts.taxYear) args.push('--tax-year', String(opts.taxYear));
    if (opts.outputDir) args.push('--output', opts.outputDir);
    if (opts.individualAccounts) args.push('--individual-accounts', String(opts.individualAccounts));
    if (opts.organisationAccounts) args.push('--organisation-accounts', String(opts.organisationAccounts));
    if (opts.reportingFis) args.push('--reporting-fis', String(opts.reportingFis));
    if (opts.tin) args.push('--tin', opts.tin);
    if (opts.force) args.push('--force');
    return runMdesTarget(args, { target: opts.target, sender, event });
  });
});

ipcMain.handle('mdes-target-package', async (event, options) => {
  const opts = options || {};
  if (!opts.sourceFile) return { success: false, error: 'Select an XML file' };
  return withResolvedSender(opts, (sender) => {
    const args = ['package', '--target', opts.target, '--source', opts.sourceFile,
                  '--sender', sender, '--type', opts.communicationType || 'CRS'];
    if (opts.receiver) args.push('--receiver', opts.receiver);
    if (opts.taxYear) args.push('--tax-year', String(opts.taxYear));
    if (opts.outputDir) args.push('--output', opts.outputDir);
    if (opts.force) args.push('--force');
    return runMdesTarget(args, { target: opts.target, sender, event });
  });
});

ipcMain.handle('mdes-target-select-props-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select the MDES properties file',
    defaultPath: fs.existsSync('C:\\MDES\\props') ? 'C:\\MDES\\props' : undefined,
    filters: [
      { name: 'Properties files', extensions: ['properties'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.filePaths && result.filePaths.length > 0) {
    grantPath(path.dirname(result.filePaths[0]));
    return result.filePaths[0];
  }
  return null;
});


// ============================================================
// FILE MANAGER IPC HANDLERS
// ============================================================

// List directory contents
ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries.map(entry => {
      const fullPath = path.join(dirPath, entry.name);
      let size = 0;
      let modified = null;
      try {
        const stat = fs.statSync(fullPath);
        size = stat.size;
        modified = stat.mtime.toISOString();
      } catch {}
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size,
        modified
      };
    });
    // Sort: directories first, then files alphabetically
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { success: true, items, path: dirPath };
  } catch (error) {
    return { success: false, error: error.message, items: [] };
  }
});

// Read file content
ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large (>10MB)' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    return {
      success: true,
      content,
      fileName: path.basename(filePath),
      filePath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      extension: ext,
      language: ext === '.xml' ? 'xml' : ext === '.json' ? 'json' : ext === '.csv' ? 'plaintext' : ext === '.js' ? 'javascript' : ext === '.py' ? 'python' : 'plaintext'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Write file content
ipcMain.handle('write-file-content', async (event, filePath, content) => {
  try {
    assertPathAllowed(filePath, 'file path');
    fs.writeFileSync(filePath, content, 'utf-8');
    const stat = fs.statSync(filePath);
    return { success: true, size: stat.size, modified: stat.mtime.toISOString() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Rename file
ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    assertPathAllowed(oldPath, 'source path');
    assertPathAllowed(newPath, 'destination path');
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete file or folder
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    assertPathAllowed(filePath, 'file path');
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create new file
ipcMain.handle('create-file', async (event, filePath, content = '') => {
  try {
    assertPathAllowed(filePath, 'file path');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create new folder
ipcMain.handle('create-folder', async (event, dirPath) => {
  try {
    assertPathAllowed(dirPath, 'folder path');
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Folder'
  });
  if (result.canceled) return null;
  const folder = result.filePaths[0];
  grantPath(folder);  // user explicitly opened this folder -> grant the whole tree
  return folder;
});

// Get file info
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return {
      success: true,
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      created: stat.birthtime.toISOString(),
      isDirectory: stat.isDirectory(),
      extension: path.extname(filePath).toLowerCase()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Validate XML content against module schema (using Python validator)
// NOTE: Python validator exits with code 1 when is_valid=false, so we
// must capture stdout regardless of exit code to get the JSON result.
ipcMain.handle('validate-xml-content', async (event, content, module = 'crs') => {
  try {
    // Auto-detect module from XML content
    let detectedModule = module;
    if (content.includes('FATCA_OECD') || content.includes('FATCA_CRS') || content.includes('fatca:') || content.includes('oecd_ftc:')) detectedModule = 'fatca';
    else if (content.includes('CBC_OECD') || content.includes('CbcBody')) detectedModule = 'cbc';
    else if (content.includes('CRS_OECD') || content.includes('crs:')) detectedModule = 'crs';

    // Write content to a temp file
    const tmpDir = path.join(app.getPath('temp'), 'crs-editor');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `validate_${Date.now()}.xml`);
    fs.writeFileSync(tmpFile, content, 'utf-8');

    let cliModule, validatorArgs;
    if (detectedModule === 'fatca') {
      cliModule = 'crs_generator.fatca_cli';
      validatorArgs = ['--mode', 'validate-xml', '--xml-input', tmpFile, '--output', 'dummy'];
    } else if (detectedModule === 'cbc') {
      cliModule = 'crs_generator.cbc_cli';
      validatorArgs = ['validate-xml', '--xml-input', tmpFile];
    } else {
      cliModule = 'crs_generator.cli';
      validatorArgs = ['--mode', 'validate-xml', '--xml-input', tmpFile, '--output', 'dummy'];
    }

    // Spawn Python directly to capture stdout even on non-zero exit
    // Production: use bundled exe; Development: use system Python
    let exePath, spawnArgs, spawnCwd;
    const bundledExe = !isDev ? getBundledExePath(cliModule) : null;
    if (bundledExe) {
      exePath = bundledExe;
      spawnArgs = validatorArgs;
      spawnCwd = path.dirname(bundledExe);
    } else {
      const pythonPath = findPythonExecutable();
      if (!pythonPath) return { is_valid: false, errors: ['Python not found'], warnings: [] };
      exePath = pythonPath;
      spawnArgs = ['-m', cliModule, ...validatorArgs];
      spawnCwd = path.join(__dirname, '../..');
    }

    const result = await new Promise((resolve) => {
      const proc = spawn(exePath, spawnArgs, {
        cwd: spawnCwd,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        // Parse JSON from stdout regardless of exit code
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]));
          } else {
            resolve({ is_valid: false, errors: [stderr || stdout || `Validator exited with code ${code}`], warnings: [] });
          }
        } catch (e) {
          resolve({ is_valid: false, errors: [`Failed to parse validator output: ${e.message}`, stderr || stdout].filter(Boolean), warnings: [] });
        }
      });
      proc.on('error', (err) => {
        resolve({ is_valid: false, errors: [`Failed to run validator: ${err.message}`], warnings: [] });
      });
    });

    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}

    return result;
  } catch (error) {
    return { is_valid: false, errors: [error.message], warnings: [] };
  }
});

// Format XML (pretty-print)
ipcMain.handle('format-xml', async (event, content) => {
  try {
    // Simple XML formatter
    let formatted = '';
    let indent = 0;
    const lines = content.replace(/>\s*</g, '>\n<').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
      formatted += '  '.repeat(indent) + trimmed + '\n';
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indent++;
      }
    }
    return { success: true, content: formatted.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============== Bug Reporting IPC Handlers ==============

// Open a pre-filled public GitHub issue. Installed applications must never
// embed a repository token, so the user reviews and submits in their browser.
ipcMain.handle('create-github-issue', async (event, issueData) => {
  try {
    const title = typeof issueData?.title === 'string' ? issueData.title.trim() : '';
    const body = typeof issueData?.body === 'string' ? issueData.body.trim() : '';
    if (!title || !body) {
      throw new Error('Issue title and description are required.');
    }
    if (title.length > 256 || body.length > 6000) {
      throw new Error('Bug report is too long. Shorten the title or description and try again.');
    }

    const issueUrl = new URL('https://github.com/zmokiem-ui/MDES-XML-Studio/issues/new');
    issueUrl.searchParams.set('title', title);
    issueUrl.searchParams.set('body', body);
    issueUrl.searchParams.set('labels', (issueData.labels || ['bug', 'user-reported']).join(','));

    // Never open the user's real browser during automated tests.
    if (!process.env.E2E_TEST) {
      await shell.openExternal(issueUrl.toString());
    }

    return {
      success: true,
      openedInBrowser: true,
      submitted: false,
      html_url: issueUrl.toString(),
    };
  } catch (error) {
    console.error('Failed to open GitHub issue form:', error);
    throw new Error(`Failed to open issue form: ${error.message}`);
  }
});

// Capture only this application window and copy it to the clipboard. The
// user can paste it into the GitHub issue form opened by the submit action.
ipcMain.handle('capture-screenshot', async () => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Application window is not available');
    }
    const screenshot = await mainWindow.webContents.capturePage();
    if (screenshot.isEmpty()) {
      throw new Error('Captured screenshot was empty');
    }
    clipboard.writeImage(screenshot);
    
    return {
      success: true,
      copiedToClipboard: true,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
});
