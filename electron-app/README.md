# CRS Test Data Generator - Electron App

A professional desktop application for generating CRS XML test files, built with Electron, React, and Python.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS
- **Desktop Framework**: Electron
- **Backend**: Python (existing CRS generator logic)
- **Communication**: IPC between Electron main process and Python subprocess

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (with the CRS generator dependencies installed)

## Installation

1. Install Node.js dependencies:
```bash
cd electron-app
npm install
```

2. Ensure Python dependencies are installed in the parent directory:
```bash
cd ..
pip install -r requirements.txt
```

## Development

Run the app in development mode:

```bash
cd electron-app
npm run electron:dev
```

This will:
1. Start the Vite dev server on port 5173
2. Launch Electron with hot reload

## Building

Build the production app:

```bash
npm run electron:build
```

This will create a Windows installer in `dist-electron/` directory.

## Project Structure

```
electron-app/
├── electron/
│   ├── main.js       # Electron main process
│   └── preload.js    # Preload script for IPC
├── src/
│   ├── App.jsx       # Main React component
│   ├── main.jsx      # React entry point
│   └── index.css     # Tailwind styles
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Features

- Modern card-based UI with collapsible sections
- Real-time form validation
- Progress tracking during generation
- File save dialog integration
- Success notifications with file location
- Responsive design
- Professional color scheme

## Python Integration

The app calls the Python CLI wrapper (`crs_generator/cli.py`) using Node.js `child_process.spawn()`. All XML generation logic remains in Python - no changes to the existing generator code.

## Packaging

The electron-builder configuration bundles:
- React frontend (built with Vite)
- Electron main/preload scripts
- Python scripts from parent directory

Users need Python installed on their system to run the app.
