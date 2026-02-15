# Template Library System - User Guide

## 🎯 Overview

The CRS Generator now includes a **Template Library Manager** that allows you to build your own collection of XML templates! Add, validate, and organize templates that the application will use for data generation.

## 📁 What Gets Created

When you run the EXE for the first time, it automatically creates:

```
📂 Documents/CRS-Generator-Templates/
├── 📂 CRS/              ← Your CRS XML templates
├── 📂 FATCA/            ← Your FATCA XML templates
├── 📂 CBC/              ← Country-by-Country templates
├── 📂 Custom/           ← Any custom templates
├── 📂 _Examples/        ← Example templates (reference)
└── 📄 README.txt        ← Instructions
```

Each folder contains a README explaining what to put there.

## ✨ Key Features

### 1. **XSD Schema Validation**
- All templates are validated against official XSD schemas
- Invalid templates are rejected with detailed error messages
- Only valid templates can be used for generation

### 2. **Organized Library**
- Templates organized by category (CRS, FATCA, CBC, Custom)
- Easy to browse and manage
- Visual status indicators (✓ Valid / ✗ Invalid)

### 3. **User-Friendly Interface**
- Graphical template manager
- Drag-and-drop import
- One-click validation
- Template statistics

### 4. **Safe & Secure**
- Templates stored in your Documents folder
- No risk to application files
- Easy backup and sharing

## 🚀 How to Use

### **Method 1: Using the GUI (Recommended)**

1. **Launch the Application**
   - Run `CRS-Generator.exe`
   - Main menu appears

2. **Open Template Manager**
   - Click "📚 Template Library Manager"
   - Template manager window opens

3. **Import a Template**
   - Click "➕ Import Template" button
   - Select your XML file
   - Choose category (CRS, FATCA, CBC, or Custom)
   - Template is validated and imported

4. **Manage Templates**
   - View all templates in the list
   - Select template to see details
   - Validate, delete, or view templates
   - Open library folder to add files directly

### **Method 2: Manual File Addition**

1. **Open Library Folder**
   - From Template Manager: Click "📁 Open Folder"
   - Or navigate to: `Documents/CRS-Generator-Templates/`

2. **Add Your XML Files**
   - Copy XML files to appropriate category folder
   - Example: Copy `my-template.xml` to `CRS/` folder

3. **Validate in Application**
   - Open Template Manager
   - Click "🔄 Refresh"
   - Click "✓ Validate All Templates"
   - Check status (✓ Valid or ✗ Invalid)

## 📋 Template Requirements

### **Valid Templates Must:**
- ✅ Be valid XML files (`.xml` extension)
- ✅ Conform to the appropriate XSD schema
- ✅ Have correct namespace declarations
- ✅ Include all required elements

### **Common Issues:**
- ❌ Missing namespace declarations
- ❌ Invalid element names
- ❌ Missing required fields
- ❌ Incorrect data types

## 🔍 Validation Details

### **What Gets Validated:**

1. **XML Syntax**
   - Well-formed XML structure
   - Proper opening/closing tags
   - Valid characters

2. **Schema Compliance**
   - Matches XSD schema structure
   - Correct element hierarchy
   - Valid attribute values

3. **Namespace Validation**
   - Correct namespace URIs
   - Proper namespace prefixes

### **Validation Messages:**

**Success:**
```
✓ Valid CRS template - passed XSD validation
```

**Failure:**
```
✗ XSD Validation Failed:
Line 15: Element 'AccountNumber': Missing required attribute 'ClosedAccount'
Line 23: Element 'TIN': Invalid value for attribute 'issuedBy'
```

## 🎨 Template Manager Interface

### **Main Window:**
```
┌─────────────────────────────────────────────────────────┐
│  Template Library Manager                               │
├─────────────────────────────────────────────────────────┤
│  [➕ Import] [🗑️ Delete] [✓ Validate] [🔄 Refresh]      │
├──────────────────────────┬──────────────────────────────┤
│  Templates               │  Template Details            │
│  ├─ 📁 CRS              │                              │
│  │  ├─ template1.xml ✓  │  Name: template1.xml         │
│  │  └─ template2.xml ✓  │  Category: CRS               │
│  ├─ 📁 FATCA            │  Size: 15.2 KB               │
│  │  └─ fatca1.xml ✓     │  Status: ✓ Valid             │
│  ├─ 📁 CBC              │  Modified: 2026-02-04        │
│  └─ 📁 Custom           │                              │
│                          │  Validation:                 │
│                          │  Passed XSD validation       │
└──────────────────────────┴──────────────────────────────┘
```

### **Menu Options:**

**File Menu:**
- Import Template... - Add new template
- Open Library Folder - Browse templates
- Refresh - Reload template list
- Close - Exit manager

**Tools Menu:**
- Validate All Templates - Check all templates
- Library Statistics - View stats

**Help Menu:**
- How to Use - This guide
- About - Version info

## 📊 Library Statistics

View statistics about your template collection:

```
Template Library Statistics

Library Path:
C:\Users\YourName\Documents\CRS-Generator-Templates

Total Templates: 15
Valid: 13
Invalid: 2

By Category:
  CRS: 8 (7 valid)
  FATCA: 4 (4 valid)
  CBC: 2 (1 valid)
  Custom: 1 (1 valid)
```

## 💡 Best Practices

### **Organizing Templates:**
1. Use descriptive filenames
   - ✅ `CRS-Netherlands-2023-Standard.xml`
   - ❌ `template1.xml`

2. Keep templates organized by type
   - CRS templates → `CRS/` folder
   - FATCA templates → `FATCA/` folder

3. Document your templates
   - Add comments in XML
   - Keep notes about template purpose

### **Template Validation:**
1. Always validate before using
2. Fix validation errors immediately
3. Test templates with small data first
4. Keep backup of working templates

### **Library Maintenance:**
1. Regularly validate all templates
2. Remove unused templates
3. Update templates when schemas change
4. Back up your library folder

## 🔧 Advanced Usage

### **Sharing Templates:**

1. **Export Templates:**
   - Open library folder
   - Copy templates to share
   - Share via email, USB, etc.

2. **Import Shared Templates:**
   - Receive templates from colleague
   - Use "Import Template" in manager
   - Validate before using

### **Backup & Restore:**

**Backup:**
```
1. Open library folder
2. Copy entire "CRS-Generator-Templates" folder
3. Save to external drive or cloud
```

**Restore:**
```
1. Copy backed-up folder
2. Paste to Documents folder
3. Restart application
4. Validate all templates
```

### **Using Templates in Generation:**

Once templates are validated and in your library:

1. Launch wizard from main menu
2. Select "Use Custom Template"
3. Choose from your library templates
4. Generate data based on template

## 🐛 Troubleshooting

### **Template Not Showing Up:**
- Click "🔄 Refresh" in Template Manager
- Check file extension is `.xml`
- Verify file is in correct category folder

### **Validation Fails:**
- Read error message carefully
- Check line numbers mentioned
- Compare with example templates
- Ensure correct namespace

### **Can't Import Template:**
- Check file isn't corrupted
- Verify it's a valid XML file
- Try opening in text editor first
- Check file permissions

### **Library Folder Not Created:**
- Run application as administrator
- Check Documents folder permissions
- Manually create folder structure

## 📚 Example Templates

The `_Examples/` folder contains reference templates:

- `CRS.Generic.2021.Domestic.xml` - Standard CRS template
- `skeleton.xml` - Minimal CRS structure

Use these as starting points for your own templates.

## 🔗 Resources

- **XSD Schemas:** Bundled with application in `schemas/` folder
- **GitHub:** https://github.com/zmokiem-ui/CRS-xml-generator
- **Documentation:** See README.md in library folder

## 🎓 Tips & Tricks

1. **Start with Examples**
   - Copy example templates
   - Modify for your needs
   - Validate before using

2. **Build a Collection**
   - Create templates for common scenarios
   - Organize by country, year, type
   - Share with team

3. **Validate Often**
   - Validate after any changes
   - Use "Validate All" regularly
   - Fix errors immediately

4. **Keep It Clean**
   - Delete unused templates
   - Archive old templates
   - Document template purpose

## ✅ Summary

The Template Library System gives you:

- ✅ **Flexibility** - Use your own templates
- ✅ **Validation** - Ensure templates are correct
- ✅ **Organization** - Keep templates organized
- ✅ **Sharing** - Share templates with team
- ✅ **Safety** - No risk to application files

Build your perfect template collection and generate data with confidence! 🚀
