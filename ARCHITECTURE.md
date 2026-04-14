# TizenBrew "Site Modification Module" - Replication Guide

This document explains how to replicate the TizenTube module structure for another website (e.g., lekuluent.et). This is for "TizenBrew" and is known as a "Site modification module".

---

## 1. High-Level Architecture Overview

TizenTube is a TizenBrew module that modifies the YouTube TV website to add features like ad-blocking, SponsorBlock, custom UI, etc. The module works by:

1. **Loading as a user script** - The `main` file (`dist/userScript.js`) is injected into the target website.
2. **Running a service file** - The `serviceFile` (`dist/service.js`) runs a Node.js server for DIAL protocol support.
3. **Patching native APIs** - The module intercepts `JSON.parse` to modify API responses before the website processes them.
4. **Hooking into the app's command system** - The `resolveCommand` function is patched to intercept and handle custom actions.

---

## 2. Directory Structure

```
<ModuleName>/
├── package.json              # Module metadata (REQUIRED)
├── README.md                 # User-facing documentation
├── mods/                     # Client-side JavaScript code (user script)
│   ├── package.json          # Dependencies for the mods build
│   ├── rollup.config.js      # Build configuration for userScript.js
│   ├── userScript.js         # Entry point - imports all features
│   ├── config.js             # Configuration system (localStorage-based)
│   ├── resolveCommand.js     # Command interception system
│   ├── domrect-polyfill.js   # Polyfill for DOMRect
│   ├── spatial-navigation-polyfill.js  # TV remote navigation polyfill
│   ├── tiny-sha256.js        # SHA256 implementation
│   ├── features/             # Feature modules
│   │   ├── adblock.js
│   │   ├── sponsorblock.js
│   │   ├── userAgentSpoofing.js
│   │   └── ...
│   ├── ui/                   # UI components
│   │   ├── ui.js             # Main UI initialization
│   │   ├── settings.js       # Settings menu
│   │   ├── theme.js          # Theme customization
│   │   ├── ytUI.js           # YouTube-specific UI helpers
│   │   └── ui.css            # Custom CSS
│   ├── utils/                # Utility modules
│   │   └── ASTParser.js
│   └── translations/         # i18n support
│       ├── index.js
│       ├── i18nResources.js
│       └── resources/
├── service/                  # Node.js service file
│   ├── package.json
│   ├── rollup.config.js
│   └── service.js            # DIAL server implementation
└── dist/                     # Build output (generated)
    ├── userScript.js         # Bundled user script
    └── service.js            # Bundled service file
```

---

## 3. package.json Structure

The root `package.json` defines the module for TizenBrew:

```json
{
  "name": "@your-org/module-name",
  "appName": "YourModuleName",
  "version": "1.0.0",
  "description": "Description of your module",
  "packageType": "mods",
  "websiteURL": "https://target-website.com/",
  "main": "dist/userScript.js",
  "author": "Your Name",
  "serviceFile": "dist/service.js",
  "keys": []
}
```

### Key Fields Explained:

| Field | Description |
|-------|-------------|
| `packageType` | Must be `"mods"` for site modification modules |
| `appName` | User-friendly name (e.g., "TizenTube") |
| `websiteURL` | The URL of the target website |
| `main` | The JavaScript file injected into the website |
| `serviceFile` | Node.js service file (optional, used if exists) |
| `keys` | TV remote keys to register via TVInputDevice API |

---

## 4. Core Components Deep Dive

### 4.1. Entry Point (`userScript.js`)

This is the main entry point. It imports all features and UI modules.

```javascript
// Example structure
import "./features/userAgentSpoofing.js";
import "./features/adblock.js";
import "./ui/ui.js";
import "./ui/settings.js";
// ... more imports
```

**Purpose:** Acts as a bootstrap that loads all other modules.

---

### 4.2. Configuration System (`config.js`)

A localStorage-based configuration system:

```javascript
const CONFIG_KEY = 'your-module-config';

const defaultConfig = {
  feature1: true,
  feature2: false,
  someSetting: 'default',
  // ... more settings
};

// Read config from localStorage
let localConfig;
try {
  localConfig = JSON.parse(window.localStorage[CONFIG_KEY]);
} catch (err) {
  localConfig = defaultConfig;
}

export function configRead(key) {
  if (localConfig[key] === undefined) {
    localConfig[key] = defaultConfig[key];
  }
  return localConfig[key];
}

export function configWrite(key, value) {
  localConfig[key] = value;
  window.localStorage[CONFIG_KEY] = JSON.stringify(localConfig);
  configChangeEmitter.dispatchEvent(...);
}
```

**Purpose:** Centralized settings management with defaults and persistence.

---

### 4.3. API Response Interception (e.g., `adblock.js`)

The module intercepts `JSON.parse` to modify API responses:

```javascript
const origParse = JSON.parse;
JSON.parse = function () {
  const r = origParse.apply(this, arguments);
  
  // Modify response data
  if (r.adPlacements && configRead('enableAdBlock')) {
    r.adPlacements = [];
  }
  
  return r;
};
```

**Purpose:** Modify data before the website processes it (ad removal, content filtering, etc.).

---

### 4.4. Command Interception (`resolveCommand.js`)

Patches the website's command system to intercept actions:

```javascript
export function patchResolveCommand() {
  for (const key in window._yttv) {
    if (window._yttv[key]?.instance?.resolveCommand) {
      const ogResolve = window._yttv[key].instance.resolveCommand;
      window._yttv[key].instance.resolveCommand = function (cmd, _) {
        // Handle custom actions
        if (cmd.customAction) {
          customAction(cmd.customAction.action, cmd.customAction.parameters);
          return true;
        }
        // ... handle other cases
        return ogResolve.call(this, cmd, _);
      }
    }
  }
}
```

**Purpose:** Intercept and extend the website's internal command system with custom actions.

---

### 4.5. Main UI (`ui/ui.js`)

Initializes the user interface:

```javascript
const interval = setInterval(() => {
  const videoElement = document.querySelector('video');
  if (videoElement) {
    execute_once_dom_loaded();
    patchResolveCommand();
    clearInterval(interval);
  }
}, 250);
```

**Key features:**
- Injects custom CSS
- Sets up key event handlers for TV remote
- Creates UI containers
- Handles colored button events (Red=403, Green=404, Yellow=405, Blue=406)

---

### 4.6. Service File (`service/service.js`)

A Node.js Express server for DIAL protocol support:

```javascript
const dial = require("@patrickkfkan/peer-dial");
const express = require('express');
const app = express();

const apps = {
    "AppName": {
        name: "AppName",
        state: "stopped",
        allowStop: true,
        pid: null,
        launch(launchData) {
            // Launch the module via TizenBrew
        }
    }
};

const dialServer = new dial.Server({...});
app.listen(PORT, () => { dialServer.start(); });
```

**Purpose:** Allows external devices to discover and launch the module via DIAL protocol.

---

## 5. Build System

### 5.1. User Script Build (`mods/rollup.config.js`)

Bundles all client-side code into a single IIFE:

```javascript
export default {
    input: "userScript.js",
    output: { file: "../dist/userScript.js", format: "iife" },
    plugins: [
        json(),
        string({ include: "**/*.css" }),
        nodeResolve({ browser: true, preferBuiltins: false }),
        commonjs({ transformMixedEsModules: true }),
        babel({ presets: [['@babel/preset-env', { targets: 'Chrome 47' }]] }),
        terser({ ecma: '5' })
    ]
};
```

**Key points:**
- Output format: IIFE (Immediately Invoked Function Expression)
- Target: Chrome 47 (for Tizen TV browsers)
- Transpiles to ES5 for compatibility

### 5.2. Service Build (`service/rollup.config.js`)

Bundles the Node.js service into CommonJS:

```javascript
export default {
    input: 'service.js',
    output: { file: '../dist/service.js', format: 'cjs' },
    plugins: [resolve(), commonjs(), babel({ presets: ['@babel/preset-env'] })]
};
```

---

## 6. Feature Module Pattern

Each feature follows a consistent pattern:

```javascript
import { configRead } from '../config.js';

class FeatureHandler {
  constructor(videoID) {
    this.videoID = videoID;
  }

  async init() {
    // Initialize feature
  }

  destroy() {
    // Clean up
  }
}

// Global instance
window.featureName = null;

// Listen for URL changes
window.addEventListener('hashchange', () => {
  // Check if feature needs reinitialization
  if (needsReload) {
    if (window.featureName) window.featureName.destroy();
    if (configRead('enableFeature')) {
      window.featureName = new FeatureHandler(videoID);
      window.featureName.init();
    }
  }
});
```

---

## 7. UI Components Pattern

### 7.1. Settings Menu

Settings are defined as a data structure:

```javascript
const settings = [
    {
        name: 'Setting Name',
        icon: 'ICON_TYPE',
        value: 'configKey',  // Maps to config.js
    },
    {
        name: 'Nested Menu',
        value: null,
        menuId: 'unique-menu-id',
        options: [...]
    }
];
```

### 7.2. Custom UI Elements

Helper functions create UI components:

```javascript
// showModal, buttonItem, overlayPanelItemListRenderer, etc.
import { showModal, buttonItem } from './ytUI.js';
```

---

## 8. Key Event Handling

TV remote keys are handled by keyCode:

| Key | KeyCode | Typical Use |
|-----|---------|-------------|
| Left | 37 | Navigate left |
| Up | 38 | Navigate up |
| Right | 39 | Navigate right |
| Down | 40 | Navigate down |
| Enter | 13 | Select/OK |
| Back/Return | 27 | Go back |
| Red (A) | 403 | Custom action 1 |
| Green (B) | 404 | Custom action 2 |
| Yellow (C) | 405 | Custom action 3 |
| Blue (D) | 406 | Custom action 4 |

---

## 9. Polyfills and Compatibility

Required polyfills for Tizen TV browsers:

- **DOMRect** - For DOM rectangle operations
- **Spatial Navigation** - For TV remote D-pad navigation
- **whatwg-fetch** - For fetch API support
- **core-js** - For modern JavaScript features

---

## 10. Implementation Checklist for a New Module

When creating a module for a new website:

1. [ ] **package.json** - Define module metadata
2. [ ] **Directory structure** - Create mods/, service/, dist/ folders
3. [ ] **config.js** - Define default configuration
4. [ ] **userScript.js** - Entry point importing all features
5. [ ] **rollup.config.js** - Build configuration (both mods/ and service/)
6. [ ] **ui/ui.js** - Main UI initialization with key handling
7. [ ] **resolveCommand.js** - Command interception (adapt to target website's API)
8. [ ] **features/** - Individual feature modules
9. [ ] **ui/** - UI components (settings, theme, custom elements)
10. [ ] **service.js** - DIAL service (if external device launch is needed)
11. [ ] **Polyfills** - DOMRect, spatial navigation, fetch
12. [ ] **translations/** - i18n support (optional)

---

## 11. Adapting to a Different Website

The key differences when targeting a new website:

1. **Command System** - The `resolveCommand` function is website-specific. You need to discover how the target website handles internal commands.

2. **API Response Structure** - The `JSON.parse` interception targets specific API response fields. These will differ per website.

3. **DOM Selectors** - UI elements are identified by CSS selectors specific to the website.

4. **Event System** - The website may use different events for navigation/content changes (hashchange, pushState, etc.).

5. **DIAL App Name** - The service file app name should match the target website.

---

## 12. TizenBrew Module Specification

For TizenBrew to recognize the module:

```json
{
  "packageType": "mods",
  "appName": "LekuluEnt",
  "websiteURL": "https://lekuluent.et/"
}
```

Additional optional fields:
- `main`: User script file (default: `dist/userScript.js`)
- `serviceFile`: Service file (if exists)
- `keys`: Array of keys for TVInputDevice API

---

## 13. Dependencies

### User Script Dependencies (`mods/package.json`)

```json
{
  "dependencies": {
    "@babel/preset-env": "^7.22.9",
    "@rollup/plugin-babel": "^6.0.3",
    "@rollup/plugin-terser": "^0.4.3",
    "core-js": "^3.46.0",
    "rollup": "^3.26.2",
    "rollup-plugin-string": "^3.0.0",
    "whatwg-fetch": "^3.6.2",
    "i18next": "^25.8.18"
  }
}
```

### Service Dependencies (`service/package.json`)

```json
{
  "dependencies": {
    "@patrickkfkan/peer-dial": "^0.1.2",
    "cors": "^2.8.5",
    "express": "^4.19.2"
  }
}
```

---

## 14. Build Commands

```bash
# Build user script
cd mods && npm run build

# Build service
cd service && npm run build
```

---

## 15. Notes for lekuluent.et

The lekuluent directory is currently empty. To create a module for this website:

1. Analyze the website's structure (DOM, API responses, command system)
2. Adapt the patterns above to match the website's architecture
3. Insert custom JavaScript as specified in future requirements
