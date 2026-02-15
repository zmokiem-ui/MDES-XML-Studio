const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Map Python module names to bundled executable names (production only)
const MODULE_TO_EXE = {
  'crs_generator.cli': 'crs_cli.exe',
  'crs_generator.cbc_cli': 'cbc_cli.exe',
  'crs_generator.fatca_cli': 'fatca_cli.exe',
  'crs_generator.error_injector': 'error_injector.exe',
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    backgroundColor: '#f8fafc',
    show: false
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

app.whenReady().then(() => {
  createWindow();

  // Auto-update check (production only, after 3 second delay)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = false;
      autoUpdater.logger = console;

      autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info.version);
        if (mainWindow) mainWindow.webContents.send('update-available', info);
        autoUpdater.downloadUpdate();
      });

      autoUpdater.on('update-not-available', () => {
        console.log('App is up to date');
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
      });

      // IPC: renderer can request install
      ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall(false, true);
      });

      setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    } catch (err) {
      console.log('Auto-updater not available:', err.message);
    }
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
ipcMain.handle('select-output-file', async (event, module = 'crs') => {
  const modulePrefix = module.toLowerCase();
  const moduleName = module.toUpperCase();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Save ${moduleName} XML File`,
    defaultPath: `${modulePrefix}_output.xml`,
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
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
  
  return result.filePaths[0] || null;
});

// Download CSV template
ipcMain.handle('get-csv-template-path', async () => {
  const templatePath = path.join(__dirname, '../../templates/crs_data_template.csv');
  return templatePath;
});

// Generate CSV preview
ipcMain.handle('generate-csv-preview', async (event, formData) => {
  const projectRoot = path.join(__dirname, '../..');
  const tempCsvPath = path.join(projectRoot, 'temp_preview.csv');
  
  return runPythonCommand({
    module: 'crs_generator.cli',
    args: [
      '--mode', 'preview',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', formData.sendingCompanyIN,
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts || '0',
      '--organisation-accounts', formData.organisationAccounts || '0',
      '--controlling-persons', formData.controllingPersons || '1',
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
      '--mytin', formData.sendingCompanyIN,
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts || '0',
      '--organisation-accounts', formData.organisationAccounts || '0',
      '--controlling-persons', formData.controllingPersons || '1',
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
  } else {
    args.push(
      '--mode', 'random',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', formData.sendingCompanyIN,
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts,
      '--organisation-accounts', formData.organisationAccounts,
      '--controlling-persons', formData.controllingPersons,
      '--output', formData.outputPath
    );

    if (formData.reportingFITINs && formData.reportingFITINs.length > 0) {
      args.push('--reporting-fi-tins', formData.reportingFITINs.join(','));
    }

    if (formData.accountHolderMode !== 'random') {
      args.push('--account-holder-mode', formData.accountHolderMode);
      if (formData.accountHolderCountries) {
        args.push('--account-holder-countries', formData.accountHolderCountries);
      }
    }
  }

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
 * @returns {Promise<object>} - Parsed result or raw output
 */
function runPythonCommand({ module, args, event = null, parseJson = true, outputPath = null }) {
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
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
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

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        if (parseJson) {
          try {
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
        reject(new Error(stderr || `Command failed with exit code ${code}`));
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
    args: ['--mode', 'validate', '--csv-input', csvPath, '--output', 'dummy.xml']
  });
});

// Validate CBC CSV file
ipcMain.handle('validate-cbc-csv', async (event, csvPath) => {
  try {
    return await runPythonCommand({
      module: 'crs_generator.cbc_cli',
      args: ['--mode', 'validate', '--csv-input', csvPath, '--output', 'dummy.xml']
    });
  } catch (e) {
    // If no JSON output, assume valid (basic check passed)
    return { valid: true, statistics: { total_reports: 'Unknown' } };
  }
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
    return result.filePaths[0];
  }
  return null;
});

// Validate XML file
ipcMain.handle('validate-xml', async (event, xmlPath) => {
  return runPythonCommand({
    module: 'crs_generator.cli',
    args: ['--mode', 'validate-xml', '--xml-input', xmlPath, '--output', 'dummy']
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
  if (options.testMode) args.push('--test-mode');

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
    '--sending-country', formData.transmittingCountry || 'NL',
    '--receiving-country', formData.receivingCountry || 'US',
    '--tax-year', formData.reportingPeriod || new Date().getFullYear().toString(),
    '--sending-company-in', formData.sendingCompanyIN || '000000.00000.TA.531',
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

  if (formData.testMode) args.push('--test-mode');

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
    args: ['--mode', 'validate-xml', '--xml-input', xmlPath, '--output', 'dummy']
  });
});

// Generate FATCA correction
ipcMain.handle('generate-fatca-correction', async (event, options) => {
  const args = [
    '--mode', 'correction',
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
  if (options.testMode) args.push('--test-mode');

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
  return new Promise((resolve, reject) => {
    try {
      const content = fs.readFileSync(xmlPath, 'utf8');
      
      // Check if it's a CBC file
      const isCBC = content.includes('CBC_OECD') || content.includes('urn:oecd:ties:cbc:v');
      
      if (!isCBC) {
        resolve({
          is_valid: false,
          can_generate_correction: false,
          errors: ['Not a valid CBC XML file. Expected CBC_OECD root element.'],
          doc_count: 0
        });
        return;
      }
      
      // Extract DocRefIds
      const docRefIdMatches = content.match(/<stf:DocRefId>([^<]+)<\/stf:DocRefId>/g) || [];
      const docRefIds = docRefIdMatches.map(m => m.replace(/<\/?stf:DocRefId>/g, ''));
      
      // Check MessageTypeIndic
      const messageTypeMatch = content.match(/<MessageTypeIndic>([^<]+)<\/MessageTypeIndic>/);
      const messageType = messageTypeMatch ? messageTypeMatch[1] : 'Unknown';
      
      // Check for existing corrections (OECD2/OECD3)
      const hasCorrections = content.includes('OECD2') || content.includes('OECD3') || 
                            content.includes('OECD12') || content.includes('OECD13');
      
      resolve({
        is_valid: true,
        can_generate_correction: docRefIds.length > 0,
        message_type: messageType,
        has_corrections: hasCorrections,
        doc_count: docRefIds.length,
        doc_ref_ids: docRefIds.slice(0, 10), // First 10 for preview
        errors: []
      });
    } catch (error) {
      resolve({
        is_valid: false,
        can_generate_correction: false,
        errors: [error.message],
        doc_count: 0
      });
    }
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
      '--tin', formData.sendingEntityIN || '123456789',
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
    return result.filePaths[0];
  }
  return null;
});

// Corrupt file with error injection
ipcMain.handle('corrupt-file', async (event, config) => {
  const { module, fileType, corruptionLevel, preset, customOptions, inputFile } = config;
  
  // Generate output filename
  const inputPath = inputFile;
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
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete file or folder
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
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
  return result.canceled ? null : result.filePaths[0];
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
    if (content.includes('FATCA_OECD') || content.includes('fatca:')) detectedModule = 'fatca';
    else if (content.includes('CBC_OECD') || content.includes('CbcBody')) detectedModule = 'cbc';
    else if (content.includes('CRS_OECD') || content.includes('crs:')) detectedModule = 'crs';

    // Write content to a temp file
    const tmpDir = path.join(app.getPath('temp'), 'crs-editor');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `validate_${Date.now()}.xml`);
    fs.writeFileSync(tmpFile, content, 'utf-8');

    let cliModule, mode;
    if (detectedModule === 'fatca') {
      cliModule = 'crs_generator.fatca_cli';
      mode = 'validate-xml';
    } else if (detectedModule === 'cbc') {
      cliModule = 'crs_generator.cbc_cli';
      mode = 'validate';
    } else {
      cliModule = 'crs_generator.cli';
      mode = 'validate-xml';
    }

    // Spawn Python directly to capture stdout even on non-zero exit
    // Production: use bundled exe; Development: use system Python
    let exePath, spawnArgs, spawnCwd;
    const bundledExe = !isDev ? getBundledExePath(cliModule) : null;
    if (bundledExe) {
      exePath = bundledExe;
      spawnArgs = ['--mode', mode, '--xml-input', tmpFile, '--output', 'dummy'];
      spawnCwd = path.dirname(bundledExe);
    } else {
      const pythonPath = findPythonExecutable();
      if (!pythonPath) return { is_valid: false, errors: ['Python not found'], warnings: [] };
      exePath = pythonPath;
      spawnArgs = ['-m', cliModule, '--mode', mode, '--xml-input', tmpFile, '--output', 'dummy'];
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
