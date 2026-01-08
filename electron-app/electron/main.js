const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
  if (isDev) {
    console.log('Running in development mode');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
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

app.whenReady().then(createWindow);

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
ipcMain.handle('select-output-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CRS XML File',
    defaultPath: 'crs_output.xml',
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
  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found.'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    const tempCsvPath = path.join(projectRoot, 'temp_preview.csv');
    
    const args = [
      '-m', 'crs_generator.cli',
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
    ];

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Find JSON in output (skip any print statements before it)
          const jsonStart = output.indexOf('{');
          if (jsonStart !== -1) {
            const jsonData = JSON.parse(output.substring(jsonStart));
            resolve(jsonData);
          } else {
            reject(new Error('No JSON data in output'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse preview data: ${e.message}`));
        }
      } else {
        reject(new Error(errorOutput || 'Preview generation failed'));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Save CSV preview to file
ipcMain.handle('save-csv-preview', async (event, formData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CSV Preview',
    defaultPath: 'crs_data_preview.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.filePath) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found.'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    
    const args = [
      '-m', 'crs_generator.cli',
      '--mode', 'preview',
      '--sending-country', formData.transmittingCountry,
      '--receiving-country', formData.receivingCountry,
      '--tax-year', formData.reportingPeriod,
      '--mytin', formData.sendingCompanyIN,
      '--num-fis', formData.numReportingFIs,
      '--individual-accounts', formData.individualAccounts || '0',
      '--organisation-accounts', formData.organisationAccounts || '0',
      '--controlling-persons', formData.controllingPersons || '1',
      '--output', result.filePath
    ];

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let errorOutput = '';

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, filePath: result.filePath });
      } else {
        reject(new Error(errorOutput || 'CSV save failed'));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Generate CRS file
ipcMain.handle('generate-crs', async (event, formData) => {
  return new Promise((resolve, reject) => {
    // Find Python executable
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found. Please install Python 3.8 or higher.'));
      return;
    }

    // Path to the project root (where crs_generator package is)
    const projectRoot = path.join(__dirname, '../..');
    
    // Build command arguments based on mode
    let args = ['-m', 'crs_generator.cli'];
    
    if (formData.mode === 'csv') {
      // CSV mode - generate from uploaded CSV file
      args.push(
        '--mode', 'csv',
        '--csv-input', formData.csvPath,
        '--output', formData.outputPath
      );
    } else {
      // Random mode (default)
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

      // Add optional parameters
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

    // Spawn Python process with cwd set to project root
    const pythonProcess = spawn(pythonPath, args, {
      cwd: projectRoot
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Send progress updates to renderer
      event.sender.send('generation-progress', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Success
        const fileStats = fs.statSync(formData.outputPath);
        resolve({
          success: true,
          filePath: formData.outputPath,
          fileSize: (fileStats.size / (1024 * 1024)).toFixed(2),
          message: 'CRS file generated successfully!'
        });
      } else {
        // Error
        reject(new Error(errorOutput || 'Generation failed with unknown error'));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
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

// Validate CSV file
ipcMain.handle('validate-csv', async (event, csvPath) => {
  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    
    const args = [
      '-m', 'crs_generator.cli',
      '--mode', 'validate',
      '--csv-input', csvPath,
      '--output', 'dummy.xml'
    ];

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const jsonStart = output.indexOf('{');
        if (jsonStart !== -1) {
          const result = JSON.parse(output.substring(jsonStart));
          resolve(result);
        } else {
          reject(new Error('No validation result'));
        }
      } catch (e) {
        reject(new Error(errorOutput || 'Validation failed'));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Download CSV template
ipcMain.handle('download-csv-template', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CRS 701 CSV Template',
    defaultPath: 'crs_701_template.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.filePath) {
    return null;
  }

  // Generate template with all required columns
  const template = `SendingCompanyIN,TransmittingCountry,ReceivingCountry,TaxYear,ReportingFI_TIN,ReportingFI_Name,ReportingFI_Address_Street,ReportingFI_Address_BuildingNumber,ReportingFI_Address_City,ReportingFI_Address_PostCode,ReportingFI_Address_CountryCode,AccountNumber,AccountBalance,AccountCurrency,AccountClosed,AccountDormant,Individual_FirstName,Individual_LastName,Individual_BirthDate,Individual_TIN,Individual_TIN_CountryCode,Individual_Address_Street,Individual_Address_City,Individual_Address_PostCode,Individual_Address_CountryCode,Individual_ResCountryCode,Organisation_Name,Organisation_TIN,Organisation_TIN_CountryCode,Organisation_Address_Street,Organisation_Address_City,Organisation_Address_PostCode,Organisation_Address_CountryCode,Organisation_ResCountryCode,ControllingPerson_FirstName,ControllingPerson_LastName,ControllingPerson_BirthDate,ControllingPerson_TIN,ControllingPerson_TIN_CountryCode,ControllingPerson_Address_Street,ControllingPerson_Address_City,ControllingPerson_Address_CountryCode,ControllingPerson_ResCountryCode,Payment_Type,Payment_Amount,Payment_Currency
"NL123456789","NL","DE","2024","FI001","Example Bank NL","Main Street","100","Amsterdam","1012AB","NL","ACC000001","50000.00","EUR","false","false","John","Doe","1985-03-15","DE123456789","DE","Berliner Str 45","Berlin","10115","DE","DE","","","","","","","","","","","","","","","","","CRS501","2500.00","EUR"
"NL123456789","NL","DE","2024","FI001","Example Bank NL","Main Street","100","Amsterdam","1012AB","NL","ACC000002","125000.00","EUR","false","false","","","","","","","","","","","ACME Corporation GmbH","DE987654321","DE","Business Ave 200","Munich","80331","DE","DE","Jane","Smith","1978-07-22","DE111222333","DE","Corporate Lane 50","Munich","DE","DE","CRS502","8500.00","EUR"`;

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
  const projectRoot = path.join(__dirname, '../..');
  const pythonPath = await findPythonExecutable();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-m', 'crs_generator.cli',
      '--mode', 'validate-xml',
      '--xml-input', xmlPath,
      '--output', 'dummy'
    ];

    let stdout = '';
    let stderr = '';

    const pythonProcess = spawn(pythonPath, args, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        // Find JSON in output
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          resolve(result);
        } else {
          reject(new Error(stderr || 'Failed to parse validation result'));
        }
      } catch (e) {
        reject(new Error(`Parse error: ${e.message}. Output: ${stdout}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Generate correction file
ipcMain.handle('generate-correction', async (event, options) => {
  const projectRoot = path.join(__dirname, '../..');
  const pythonPath = await findPythonExecutable();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-m', 'crs_generator.cli',
      '--mode', 'correction',
      '--xml-input', options.xmlPath,
      '--output', options.outputPath,
      '--correct-individual', options.correctIndividual?.toString() || '0',
      '--correct-organisation', options.correctOrganisation?.toString() || '0',
      '--delete-individual', options.deleteIndividual?.toString() || '0',
      '--delete-organisation', options.deleteOrganisation?.toString() || '0'
    ];
    
    if (options.correctFI) {
      args.push('--correct-fi');
    }
    if (options.modifyBalance) {
      args.push('--modify-balance');
    }
    if (options.modifyAddress) {
      args.push('--modify-address');
    }
    if (options.modifyName) {
      args.push('--modify-name');
    }
    if (options.testMode) {
      args.push('--test-mode');
    }

    let stdout = '';
    let stderr = '';

    const pythonProcess = spawn(pythonPath, args, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Correction generation failed'));
          }
        } else {
          reject(new Error(stderr || 'Failed to parse result'));
        }
      } catch (e) {
        reject(new Error(`Parse error: ${e.message}. Output: ${stdout}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Select output file for correction
ipcMain.handle('select-correction-output', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Correction File',
    defaultPath: 'crs_correction.xml',
    filters: [
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  return result.filePath || null;
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
  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found. Please install Python 3.8 or higher.'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    
    let args = ['-m', 'crs_generator.fatca_cli'];
    
    args.push(
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

    if (formData.testMode) {
      args.push('--test-mode');
    }

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
      event.sender.send('generation-progress', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        const fileStats = fs.statSync(formData.outputPath);
        resolve({
          success: true,
          filePath: formData.outputPath,
          fileSize: (fileStats.size / (1024 * 1024)).toFixed(2),
          output: output
        });
      } else {
        reject(new Error(errorOutput || 'FATCA generation failed'));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Validate FATCA XML file
ipcMain.handle('validate-fatca-xml', async (event, xmlPath) => {
  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    const args = ['-m', 'crs_generator.fatca_cli', '--mode', 'validate-xml', '--xml-input', xmlPath, '--output', 'dummy'];

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Parse error: ${e.message}. Output: ${stdout}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});

// Generate FATCA correction
ipcMain.handle('generate-fatca-correction', async (event, options) => {
  return new Promise((resolve, reject) => {
    const pythonPath = findPythonExecutable();
    
    if (!pythonPath) {
      reject(new Error('Python not found'));
      return;
    }

    const projectRoot = path.join(__dirname, '../..');
    
    let args = [
      '-m', 'crs_generator.fatca_cli',
      '--mode', 'correction',
      '--xml-input', options.xmlPath,
      '--output', options.outputPath,
      '--correct-individual', options.correctIndividual.toString(),
      '--correct-organisation', options.correctOrganisation.toString(),
      '--delete-individual', options.deleteIndividual.toString(),
      '--delete-organisation', options.deleteOrganisation.toString()
    ];

    if (options.correctFI) {
      args.push('--correct-fi');
    }
    if (options.modifyBalance) {
      args.push('--modify-balance');
    }
    if (options.modifyAddress) {
      args.push('--modify-address');
    }
    if (options.modifyName) {
      args.push('--modify-name');
    }
    if (options.testMode) {
      args.push('--test-mode');
    }

    const pythonProcess = spawn(pythonPath, args, { cwd: projectRoot });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        reject(new Error(`Parse error: ${e.message}. Output: ${stdout}, Stderr: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`));
    });
  });
});
