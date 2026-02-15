# Language Feature Integration Guide

## ✅ What's Been Added

### **Backend (Python) - COMPLETE**
- ✅ `language_config.py` - 20+ language definitions
- ✅ `base_data_generator.py` - Multi-language data generation
- ✅ `cli.py` - Language parameters added (`--language`, `--language-mixed`, `--language-weights`)
- ✅ `fatca_cli.py` - Language parameters added
- ✅ All generators updated to accept `language_config`

### **Frontend (React) - COMPLETE**
- ✅ `LanguageSelector.jsx` - Beautiful language selection component
- ✅ Exported in `components/index.js`
- ✅ Matches your app's design system
- ✅ Dark/light theme support

## 🚀 How to Integrate into Your Electron App

### **Step 1: Add Language State to Your Form**

In your `App.jsx`, add language state:

```jsx
// Add to your state declarations (around line 50-100)
const [selectedLanguage, setSelectedLanguage] = useState('en_US')
```

### **Step 2: Import and Add the Component**

```jsx
// Add to imports at top of App.jsx
import { LanguageSelector } from './components'

// Add to your form (in the appropriate section, e.g., after country selection)
<LanguageSelector 
  value={selectedLanguage}
  onChange={setSelectedLanguage}
  theme={theme}
/>
```

### **Step 3: Pass Language to Python Backend**

Update your generation functions to include language parameter:

```jsx
// In your generateCRS function (around line 1500-1600)
const generateCRS = async (formData) => {
  const result = await window.electronAPI.generateCRS({
    ...formData,
    language: selectedLanguage,  // ← Add this
    // ... other fields
  })
}
```

### **Step 4: Update Electron Main Process** (if needed)

In `electron/main.js`, the IPC handler should pass the language parameter to Python CLI:

```javascript
ipcMain.handle('generate-crs', async (event, formData) => {
  const args = [
    '--mode', 'random',
    '--sending-country', formData.transmittingCountry,
    '--receiving-country', formData.receivingCountry,
    '--tax-year', formData.reportingPeriod,
    '--mytin', formData.sendingCompanyIN,
    '--num-fis', formData.numReportingFIs,
    '--individual-accounts', formData.individualAccounts,
    '--organisation-accounts', formData.organisationAccounts,
    '--language', formData.language || 'en_US',  // ← Add this
    '--output', outputPath
  ]
  
  // Execute Python CLI with args...
})
```

## 📍 Recommended Placement in UI

### **Option A: In Advanced Settings Section**
Place it with other advanced options like test mode, parallel processing, etc.

```jsx
{/* Advanced Settings */}
<div className="space-y-4">
  <h3>Advanced Options</h3>
  
  {/* Existing options... */}
  
  {/* Add Language Selector */}
  <LanguageSelector 
    value={selectedLanguage}
    onChange={setSelectedLanguage}
    theme={theme}
  />
</div>
```

### **Option B: In Main Form (Recommended)**
Place it near country selection for better visibility:

```jsx
{/* Country Selection */}
<div>
  <label>Transmitting Country</label>
  <input value={transmittingCountry} ... />
</div>

<div>
  <label>Receiving Country</label>
  <input value={receivingCountry} ... />
</div>

{/* Add Language Selector */}
<LanguageSelector 
  value={selectedLanguage}
  onChange={setSelectedLanguage}
  theme={theme}
/>
```

## 🎨 Component Features

### **Compact Display**
- Shows current language
- Warning icon if NVARCHAR required
- "Change" button to open modal

### **Modal Features**
- Organized by category (Western European, East Asian, etc.)
- Visual indicators for non-safe languages (⚠️)
- Script type labels (Latin, Cyrillic, Chinese, etc.)
- Database encoding warnings
- Reset to English button

### **User Experience**
- Click "Change" → Modal opens
- Select language → See warning if needed
- Click "Apply Language" → Modal closes
- Language saved to state

## 🔧 Backend Integration

The Python CLI now accepts these parameters:

```bash
# Single language
python -m crs_generator.cli \
  --language ru_RU \
  --output output.xml \
  # ... other params

# Mixed languages (future feature)
python -m crs_generator.cli \
  --language en_US \
  --language-mixed \
  --language-weights '{"en_US": 0.7, "ru_RU": 0.3}' \
  --output output.xml
```

## 📊 Supported Languages

### **Safe for VARCHAR (Latin Script)**
- English (US), Dutch, French, German, Spanish
- Italian, Portuguese, Polish, Turkish

### **Requires NVARCHAR (Non-Latin)**
- **Cyrillic:** Russian, Ukrainian
- **Chinese:** Simplified, Traditional
- **Japanese, Korean**
- **Hindi** (Devanagari)
- **Arabic, Hebrew**

## ⚠️ Important Notes

### **Database Compatibility**
When users select non-Latin languages, they'll see warnings about NVARCHAR requirements. Make sure your documentation mentions this.

### **Default Behavior**
- If no language specified → defaults to English
- No breaking changes to existing functionality
- Backward compatible

### **Performance**
- No performance impact
- Language selection happens at generation time
- Uses Faker library with locale support

## 🧪 Testing

### **Test the Component**
```jsx
// In your dev environment
<LanguageSelector 
  value="ru_RU"
  onChange={(lang) => console.log('Selected:', lang)}
  theme="dark"
/>
```

### **Test Generation**
1. Select Russian language
2. Generate small XML (10 accounts)
3. Open XML and verify Cyrillic names
4. Import to database (NVARCHAR columns)
5. Verify characters display correctly

## 📝 Example Integration

Here's a complete example of where to add it in your form:

```jsx
{/* In your CRS form section */}
<div className="space-y-6">
  {/* Global Settings */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Sending Company TIN</label>
      <input value={mytin} onChange={e => setMytin(e.target.value)} />
    </div>
    <div>
      <label>Tax Year</label>
      <input value={taxYear} onChange={e => setTaxYear(e.target.value)} />
    </div>
  </div>

  {/* Country Selection */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Transmitting Country</label>
      <input value={transmittingCountry} ... />
    </div>
    <div>
      <label>Receiving Country</label>
      <input value={receivingCountry} ... />
    </div>
  </div>

  {/* Language Selection - NEW! */}
  <LanguageSelector 
    value={selectedLanguage}
    onChange={setSelectedLanguage}
    theme={theme}
  />

  {/* Rest of form... */}
</div>
```

## ✅ Summary

**What you need to do:**
1. Add `selectedLanguage` state to App.jsx
2. Import `LanguageSelector` component
3. Place it in your form (recommended: near country selection)
4. Pass `language` parameter to backend in generation functions
5. Test with Russian or Chinese to verify it works

**What's already done:**
- ✅ Python backend supports language parameter
- ✅ React component is ready to use
- ✅ Component matches your app's design
- ✅ All 20+ languages configured
- ✅ Warnings for NVARCHAR requirements

**Time to integrate: ~15 minutes** 🚀
