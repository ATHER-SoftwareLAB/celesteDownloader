# Celeste Downloader - Deployment & Packaging Guide

**Version**: v0.1.0-alpha  
**Updated**: 2026-08-17  
**Target Platforms**: Windows 10+, Linux (Ubuntu 20.04+)

---

## Overview

Celeste Downloader is packaged as two standalone executables:
- **Windows**: `celeste-downloader.exe` (~150MB, includes Python 3.12 + runtime)
- **Linux**: `celeste-downloader.AppImage` (~150MB, self-contained)

Both are zero-dependency, portable binaries that work on clean systems.

---

## Architecture

```
Source Code (Git)
└── Build Pipeline (GitHub Actions)
    ├── Frontend (React)
    │   └── npm run build → dist/
    ├── Backend (FastAPI)
    │   └── pyinstaller → celeste-downloader.exe / .AppImage
    └── Artifacts
        ├── celeste-downloader.exe
        ├── celeste-downloader.AppImage
        └── SHA256SUMS
```

---

## Build Requirements

### Frontend Requirements
- **Node.js**: 18.x LTS or later
- **npm**: 9.x or later
- **Tools**: Vite, React 18, TypeScript, Tailwind CSS

### Backend Requirements
- **Python**: 3.9+ (tested on 3.12)
- **Tools**: PyInstaller 6.x, yt-dlp latest
- **Size**: Python runtime adds ~100MB to final binary

### System Requirements (for building)
- **Disk space**: 2GB free (for builds + caches)
- **RAM**: 4GB minimum (8GB recommended)
- **Build time**: ~5-10 minutes per platform (depends on network)

---

## Local Development Build

### Prerequisites

```bash
# Windows (PowerShell as Administrator)
# Install Node.js from https://nodejs.org (LTS)
node --version  # Should be v18.x or later
npm --version   # Should be 9.x or later

# Install Python from https://www.python.org (3.9+)
python --version  # Should be 3.9+

# Verify Python is in PATH
python -m pip --version
```

```bash
# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install -y nodejs npm python3.12 python3.12-venv python3.12-dev
node --version
python3 --version
```

### Frontend Build

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build for production (creates dist/)
npm run build

# Verify build output
ls -la dist/
# Expected: index.html, assets/*, manifest.json
```

### Backend Build (PyInstaller)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements-backend.txt

# Install PyInstaller
pip install pyinstaller==6.1.0

# Run PyInstaller (creates dist/)
pyinstaller main.spec

# Verify output
ls -la dist/celeste-downloader/
# Expected: celeste-downloader (binary), and other runtime files
```

### Full Build (Combined)

```bash
# Root directory
./scripts/build.sh  # Linux/macOS
# or
.\scripts\build.ps1  # Windows PowerShell

# Creates:
# - ./dist/celeste-downloader.exe (Windows)
# - ./dist/celeste-downloader.AppImage (Linux)
```

---

## PyInstaller Configuration

### PyInstaller Spec File (main.spec)

```python
# backend/main.spec
# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Include yt-dlp modules
        (venv/lib/python3.12/site-packages/yt_dlp, 'yt_dlp'),
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'pydantic',
        'aiofiles',
        'yt_dlp',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludedimports=[],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='celeste-downloader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Compress binary with UPX (requires upx installed)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Hide console window on Windows
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../assets/icon.ico',  # Windows icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='celeste-downloader',
)
```

### AppImage Build (Linux)

AppImage bundles the entire app into a single executable:

```bash
# Install appimagetool (Linux)
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage

# Create AppDir structure
mkdir -p AppDir/usr/{bin,lib,share/icons}
cp dist/celeste-downloader/celeste-downloader AppDir/usr/bin/

# Create .desktop file
cat > AppDir/celeste-downloader.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Celeste Downloader
Exec=celeste-downloader
Icon=celeste-downloader
Categories=Utility;
EOF

# Build AppImage
./appimagetool-x86_64.AppImage AppDir celeste-downloader.AppImage

# Verify
file celeste-downloader.AppImage
# Output: ELF 64-bit executable
```

---

## Continuous Integration (GitHub Actions)

### Workflow File (.github/workflows/release.yml)

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags (v0.1.0-alpha, etc.)

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
          cd ..
      
      - name: Build Backend (Windows)
        run: |
          cd backend
          python -m venv venv
          venv\Scripts\activate
          pip install -r requirements-backend.txt
          pip install pyinstaller
          pyinstaller main.spec
          cd ..
      
      - name: Create Artifact
        run: |
          move backend\dist\celeste-downloader\celeste-downloader.exe celeste-downloader.exe
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: celeste-downloader-windows
          path: celeste-downloader.exe

  build-linux:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install AppImage Tools
        run: |
          sudo apt-get update
          sudo apt-get install -y appimage-builder
      
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
          cd ..
      
      - name: Build Backend (Linux)
        run: |
          cd backend
          python -m venv venv
          source venv/bin/activate
          pip install -r requirements-backend.txt
          pip install pyinstaller
          pyinstaller main.spec
          cd ..
      
      - name: Create AppImage
        run: |
          # Script to create AppImage from PyInstaller output
          ./scripts/create-appimage.sh
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: celeste-downloader-linux
          path: celeste-downloader.AppImage

  release:
    needs: [build-windows, build-linux]
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download Artifacts
        uses: actions/download-artifact@v3
      
      - name: Generate Checksums
        run: |
          sha256sum celeste-downloader-windows/celeste-downloader.exe > SHA256SUMS
          sha256sum celeste-downloader-linux/celeste-downloader.AppImage >> SHA256SUMS
          cat SHA256SUMS
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ github.ref_name }}
          body_path: CHANGELOG.md  # Optional: release notes from CHANGELOG
          files: |
            celeste-downloader-windows/celeste-downloader.exe
            celeste-downloader-linux/celeste-downloader.AppImage
            SHA256SUMS
          draft: false
          prerelease: ${{ contains(github.ref_name, 'alpha') || contains(github.ref_name, 'rc') }}
```

---

## Manual Release Process

### Step 1: Create Release Tag

```bash
# Verify version in VERSION file (e.g., 0.1.0-alpha)
cat VERSION  # Output: 0.1.0-alpha

# Create git tag
git tag v0.1.0-alpha
git push origin v0.1.0-alpha

# GitHub Actions automatically triggered by tag
```

### Step 2: Monitor Build

```bash
# Watch GitHub Actions: https://github.com/herivia/celesteDownloader/actions
# Wait for build to complete (5-10 minutes)
```

### Step 3: Verify & Test

Download artifacts and test locally:

```bash
# Windows
# Download celeste-downloader.exe
# Verify signature: Get-FileHash -Path celeste-downloader.exe -Algorithm SHA256
# Run: .\celeste-downloader.exe
# Verify: Can input URL, fetch metadata, see preview

# Linux
# Download celeste-downloader.AppImage
# Verify checksum: sha256sum -c SHA256SUMS
# Make executable: chmod +x celeste-downloader.AppImage
# Run: ./celeste-downloader.AppImage
# Verify: Same as Windows
```

### Step 4: Update Documentation

```markdown
# In README.md

## Downloads

Latest version: **v0.1.0-alpha**

- [celeste-downloader.exe](https://github.com/herivia/celesteDownloader/releases/download/v0.1.0-alpha/celeste-downloader.exe) (Windows)
- [celeste-downloader.AppImage](https://github.com/herivia/celesteDownloader/releases/download/v0.1.0-alpha/celeste-downloader.AppImage) (Linux)
- [SHA256 Checksums](https://github.com/herivia/celesteDownloader/releases/download/v0.1.0-alpha/SHA256SUMS)
```

---

## Installation & Usage

### Windows

```
1. Download celeste-downloader.exe
2. Double-click to run (may show Windows Defender warning)
3. If warned: Click "More info" → "Run anyway"
4. App starts immediately (no installation needed)
5. Pin to taskbar if you want
```

### Linux (Ubuntu/Debian)

```bash
# Download celeste-downloader.AppImage
chmod +x celeste-downloader.AppImage
./celeste-downloader.AppImage

# Optional: Create desktop shortcut
cp celeste-downloader.AppImage ~/Applications/
# Then launcher menu will show "Celeste Downloader"
```

---

## Distribution Strategy

### Primary Distribution
- **GitHub Releases**: https://github.com/herivia/celesteDownloader/releases
- Automated builds via Actions
- Public download (no authentication needed)

### Alternative Distribution (Future)
- [ ] Package managers (Windows Store, Flathub for Linux)
- [ ] Auto-update mechanism (check for new releases)
- [ ] Website landing page

---

## Troubleshooting

### Windows Issues

**"Windows Defender SmartScreen warning"**
- Normal for unsigned apps
- Click: More info → Run anyway
- Workaround: Code-sign binary (requires certificate, future enhancement)

**"Python runtime not found"**
- Verify .exe is not corrupted (check SHA256)
- Ensure Windows 10+ (Python runtime bundled)
- Re-download from official GitHub

**"OpenSSL or SSL error"**
- Windows 7/8 may lack modern TLS support
- Upgrade to Windows 10+ or use Linux version

### Linux Issues

**"AppImage not executable"**
- Run: `chmod +x celeste-downloader.AppImage`
- Verify file is not corrupted (check SHA256)

**"libfuse error" or "cannot open shared object file"**
- Some Linux distributions missing FUSE library
- Install: `sudo apt install libfuse2`

**"Permission denied" when accessing Downloads folder**
- Ensure Downloads folder is writable
- Check: `ls -ld ~/Downloads` (should have `w` permission)

---

## Performance Metrics

### File Sizes
| Platform | Size | Includes |
|----------|------|----------|
| celeste-downloader.exe | ~150MB | Python 3.12, FastAPI, yt-dlp, React bundle |
| celeste-downloader.AppImage | ~150MB | Same as above, AppImage overhead |
| Compressed (.zip) | ~60MB | 60% compression ratio |

### Startup Time
- **Cold start** (first run): 2-3 seconds
- **Warm start** (cached): <500ms
- **WebSocket connection**: <100ms

### Runtime Memory
- **Idle**: 50-80MB
- **During download**: 100-200MB (depends on file size)
- **Peak**: 300MB (with Python runtime)

---

## Security & Signatures

### Current Status (v0.1.0-alpha)
- ✅ HTTPS for all downloads (GitHub)
- ✅ SHA-256 checksums provided
- ❌ Code signing (unsigned, future enhancement)
- ❌ GPG signatures (future enhancement)

### Future Enhancement (v0.2.0)
```bash
# Sign binary with GPG
gpg --armor --sign celeste-downloader.exe
# Creates: celeste-downloader.exe.asc

# Verify signature
gpg --verify celeste-downloader.exe.asc celeste-downloader.exe
```

---

## Post-Release Checklist

- [ ] GitHub Release created with correct tag (v0.1.0-alpha)
- [ ] Both .exe and .AppImage uploaded
- [ ] SHA256SUMS file available
- [ ] README updated with download links
- [ ] CHANGELOG updated with release notes
- [ ] Test both binaries on clean Windows & Linux machines
- [ ] Verify WebSocket progress streaming works
- [ ] Verify SHA-256 verification works
- [ ] Announce release (GitHub discussions, optional social media)

---

## Version Management

| Version | Date | Platform Support | Status |
|---------|------|------------------|--------|
| v0.1.0-alpha | 2026-08-20 | Windows, Linux | Current |
| v0.2.0-beta | TBD | Windows, Linux | Planned |
| v0.3.0-rc1 | TBD | Windows, Linux, macOS | Planned |
| v1.0.0 | TBD | Windows, Linux, macOS | Planned |

---

## Related Documentation

- **[[REQUIREMENTS.md#NFR3|NFR3]]**: Standalone packaging requirement
- **[[SECURITY.md|Security]]**: Code signing, supply chain security
- **[[ARCHITECTURE.md|Architecture]]**: System design and components
- **README.md**: User-facing download instructions

---

## Support & Feedback

**Issues & Bugs**: https://github.com/herivia/celesteDownloader/issues  
**Discussions**: https://github.com/herivia/celesteDownloader/discussions  
**Email**: herivia@example.com (optional, not monitored for MVP)

---

## Document History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| v1.0 | 2026-08-17 | Antonio Torres | Initial deployment guide for v0.1.0-alpha |

Last updated: 2026-08-17

