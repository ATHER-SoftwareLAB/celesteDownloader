# Celeste Downloader - Security Considerations

**Version**: v0.1.0-alpha  
**Updated**: 2026-08-17  
**Author**: Antonio Torres  
**Classification**: Public (MVP scope)

---

## Overview

Celeste Downloader is a desktop application for downloading YouTube videos. This document outlines security practices, threats, and mitigations.

### Key Principles
- **User-centric**: Users fully control what is downloaded
- **Transparent**: No hidden telemetry or data collection
- **Respectful**: Respects YouTube ToS and copyright
- **Simple**: Minimal attack surface (no accounts, no persistence, no cloud)

---

## Security Posture

### In Scope (MVP v0.1.0-alpha)
- ✅ File integrity verification (SHA-256)
- ✅ HTTPS/TLS for all network requests
- ✅ Input validation (URL format)
- ✅ yt-dlp security (uses maintained library)
- ✅ No sensitive data storage
- ✅ YouTube ToS compliance warning

### Out of Scope (Post-MVP)
- ❌ User authentication (no accounts)
- ❌ End-to-end encryption (no data collection)
- ❌ Multi-user security isolation (single-user app)
- ❌ Compliance certifications (ISO 27001, SOC 2)

---

## Threat Model

### Threat 1: Man-in-the-Middle (MITM) Attack

**Scenario**: Attacker intercepts traffic between app and YouTube/yt-dlp metadata server.

**Impact**: Moderate
- Attacker sees which videos user downloads (privacy)
- Attacker could redirect download to malicious file (integrity)

**Mitigations**
- ✅ All HTTP requests use HTTPS/TLS (enforced)
- ✅ Certificate validation enabled (no self-signed certs)
- ✅ SHA-256 verification of downloads (detects tampering)
- ✅ yt-dlp library handles HTTPS (no custom SSL code)

**Risk Rating**: 🟢 **Low** (industry-standard TLS)

---

### Threat 2: Malicious yt-dlp Update

**Scenario**: Attacker compromises yt-dlp repository, injects backdoor in library.

**Impact**: High
- Backdoor could execute arbitrary code on user's machine
- Could steal files, install malware, etc.

**Mitigations**
- ✅ Pin yt-dlp to known-good version in `requirements-backend.txt`
- ✅ Verify PyPI package checksums (pip verifies by default)
- ✅ Monitor yt-dlp GitHub releases for security issues
- 🟠 Consider: GPG signature verification (future enhancement)
- ⚠️ User responsible for updating app (automatic updates out of scope)

**Recommendations**
- Update yt-dlp monthly (security patches)
- Subscribe to yt-dlp security advisories
- Test major updates before release (Day 3 of sprint)

**Risk Rating**: 🟡 **Medium** (supply chain, mitigated by pinning)

---

### Threat 3: Corrupted Download Detection

**Scenario**: Network error, disk corruption, or attacker modifies downloaded file.

**Impact**: Medium
- User gets corrupted video (unusable)
- Potential security issue if app doesn't detect it

**Mitigations**
- ✅ SHA-256 hash comparison (FR4)
- ✅ Retry logic (max 3 attempts)
- ✅ User notification on failure (error modal)
- ✅ Partial files deleted on failure (no orphaned data)
- ✅ Hash provided by yt-dlp metadata (not calculated from file alone)

**Implementation**
```python
# services/verification_service.py
async def verify_download(file_path: str, expected_hash: str, max_retries: int = 3):
    for attempt in range(1, max_retries + 1):
        computed_hash = await compute_sha256(file_path)
        if computed_hash == expected_hash:
            return True  # Verified
        
        if attempt < max_retries:
            # Retry download
            logger.warning(f"Hash mismatch (attempt {attempt}/{max_retries})")
            continue
    
    # All retries failed
    logger.error("Hash verification failed after 3 attempts")
    os.remove(file_path)  # Clean up
    raise DownloadVerificationError("File integrity check failed")
```

**Risk Rating**: 🟢 **Low** (hash verification is industry-standard)

---

### Threat 4: Disk Space Exhaustion

**Scenario**: User's disk is full; download partially completes, fills remaining space.

**Impact**: Low
- User can't use machine
- Application doesn't crash gracefully

**Mitigations**
- ✅ yt-dlp checks available space before download
- ✅ Partial files cleaned up on failure
- ✅ Error message displayed to user
- 🟠 Consider: Estimate file size, warn user if insufficient space

**Risk Rating**: 🟢 **Low** (handled by yt-dlp, user can free space)

---

### Threat 5: Unauthorized Local File Access

**Scenario**: User's machine is compromised; malware tries to steal downloaded videos.

**Impact**: Medium
- Downloaded videos could be stolen
- User's privacy compromised

**Mitigations**
- ✅ Files stored in standard Downloads folder (accessible to user)
- ✅ No encryption (MVP scope; user controls folder permissions)
- 🟠 Recommendation: User should enable OS-level file encryption (BitLocker, FileVault)
- 🟠 Future: Add optional AES-256 encryption for sensitive downloads

**Risk Rating**: 🟡 **Medium** (depends on user's system security)

---

### Threat 6: Application Supply Chain Compromise

**Scenario**: Attacker compromises GitHub, injects malware into release binaries (.exe, .AppImage).

**Impact**: Critical
- Malware distributed to all users

**Mitigations**
- ✅ Sign releases with GPG key (GitHub Actions)
- ✅ Checksums published alongside releases (SHA-256 of .exe, .AppImage)
- ✅ Release notes include build environment (reproducible builds goal)
- ✅ Open-source code (users can build from source)
- 🟠 Consider: Notarization on macOS (future, when macOS support added)

**Risk Rating**: 🟡 **Medium** (mitigated by code signing & open source)

---

### Threat 7: YouTube Terms of Service Violation

**Scenario**: User uses app to download protected content (music, movies) in violation of YouTube ToS.

**Impact**: Legal
- User could face DMCA takedown
- Copyright holder could sue user
- Platform could be sued

**Mitigations**
- ✅ Legal modal on first launch (FR8)
- ✅ Warning text in README
- ✅ In-app warning: "Respect YouTube ToS"
- ✅ No bypass of YouTube restrictions (app respects video permissions)
- ✅ Open-source transparency (app does what code says)

**Disclaimer**: Users are solely responsible for complying with YouTube ToS and local copyright laws. Celeste Downloader is a tool; misuse is user's responsibility.

**Risk Rating**: 🟡 **Medium to High** (legal, not technical; mitigated by disclaimers)

---

### Threat 8: Phishing / Social Engineering

**Scenario**: Attacker creates fake Celeste Downloader website, tricks user into downloading malware.

**Impact**: High
- User downloads malware instead of legitimate app

**Mitigations**
- ✅ Distribute only via GitHub Releases (official source)
- ✅ README links to GitHub (not third-party sites)
- ✅ No website/marketing (keeps attack surface small)
- ✅ GPG signatures on releases (users can verify authenticity)

**Recommendation**: Only download from `https://github.com/herivia/celesteDownloader/releases`

**Risk Rating**: 🟡 **Medium** (mitigated by GitHub's reputation)

---

## Secure Development Practices

### Code Security

- [ ] **No hardcoded secrets** (API keys, tokens, passwords)
  - Enforce: Pre-commit hook to scan for secrets
  - Tool: `detect-secrets` or `git-secrets`

- [ ] **Input validation**
  - YouTube URLs: Regex validation + yt-dlp validation
  - File paths: Prevent directory traversal (use `os.path.abspath`)
  - Quality selection: Enum-based (no free text input)

- [ ] **Output encoding**
  - File names sanitized (remove special chars)
  - Error messages don't leak system paths

- [ ] **Dependency management**
  - Pinned versions in `requirements.txt` and `package.json`
  - Regular updates (monthly security audit)
  - Vulnerability scanning: `pip-audit`, `npm audit`

### Example: URL Validation

```python
# backend/utils/validators.py
import re
from urllib.parse import urlparse

YOUTUBE_URL_PATTERN = r'^https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[a-zA-Z0-9_-]{11}$'

def validate_youtube_url(url: str) -> bool:
    """
    Validate YouTube URL format.
    
    Args:
        url: URL string to validate
    
    Returns:
        True if valid YouTube URL, False otherwise
    
    Examples:
        >>> validate_youtube_url('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        True
        >>> validate_youtube_url('https://evil.com/steal-videos')
        False
    """
    if not isinstance(url, str) or len(url) > 2048:
        return False
    
    if not re.match(YOUTUBE_URL_PATTERN, url):
        return False
    
    # Additional check: parse URL to ensure no injection
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        if parsed.netloc not in ('youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'):
            return False
    except Exception:
        return False
    
    return True
```

### Testing Security

```python
# tests/test_security.py
import pytest
from backend.utils.validators import validate_youtube_url

class TestURLValidation:
    def test_valid_youtube_urls(self):
        assert validate_youtube_url('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        assert validate_youtube_url('https://youtu.be/dQw4w9WgXcQ')
    
    def test_invalid_urls(self):
        assert not validate_youtube_url('https://evil.com/steal')
        assert not validate_youtube_url('javascript:alert("xss")')
        assert not validate_youtube_url('ftp://youtube.com/watch?v=...')
        assert not validate_youtube_url('../../../etc/passwd')  # Directory traversal
        assert not validate_youtube_url('')
        assert not validate_youtube_url(None)
```

---

## Deployment Security

### Release Process

1. **Code Review**: All PRs reviewed before merge to main
2. **Testing**: Unit + integration tests pass
3. **Version Bump**: Update `VERSION` file and docs
4. **Git Tag**: `git tag v0.1.0-alpha`
5. **Build**: GitHub Actions builds `.exe` and `.AppImage`
6. **Sign**: GPG-sign release artifacts (future: currently unsigned)
7. **Publish**: Create GitHub Release with artifacts + checksums
8. **Announce**: Update README with download link

### GitHub Actions Security

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Frontend
        run: npm install && npm run build
      
      - name: Build Backend
        run: pip install -r requirements.txt && pyinstaller main.spec
      
      - name: Generate Checksums
        run: sha256sum celeste-downloader.exe celeste-downloader.AppImage > SHA256SUMS
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            celeste-downloader.exe
            celeste-downloader.AppImage
            SHA256SUMS
```

---

## User Security Guidelines

### For Users

1. **Download from GitHub only**: https://github.com/herivia/celesteDownloader/releases
2. **Verify checksums**: Compare SHA-256 after download
3. **Enable Windows Defender** or antivirus on your machine
4. **Encrypt your downloads folder** (Windows BitLocker, macOS FileVault)
5. **Respect YouTube ToS**: Only download content you have permission to
6. **Keep your OS updated**: Security patches for Windows, Linux, macOS

### Verifying Downloads (Windows)

```powershell
# PowerShell
$file = "celeste-downloader.exe"
$expected = "abc123..."  # From GitHub SHA256SUMS

$actual = (Get-FileHash -Path $file -Algorithm SHA256).Hash
if ($actual -eq $expected) {
    Write-Host "✓ Checksum verified!"
} else {
    Write-Host "✗ Checksum mismatch! Do not run this file."
}
```

### Verifying Downloads (Linux)

```bash
# Terminal
sha256sum -c SHA256SUMS
# Expected output: celeste-downloader.AppImage: OK
```

---

## Privacy Considerations

### Data Collected
- **None** (MVP v0.1.0-alpha)
- No telemetry, analytics, or crash reporting
- No user accounts or profiles
- No cloud storage of download history

### Data Stored Locally
- **Downloaded videos**: User's Downloads folder (user controls)
- **Settings**: Browser localStorage (quality, path, theme)
- **History**: In-memory only, cleared on app close (no persistence)

### Third-Party Services
- **YouTube API**: Via yt-dlp (see [yt-dlp privacy](https://github.com/yt-dlp/yt-dlp#privacy))
- **No other services**: No CDN, no analytics, no ads

---

## Compliance

### YouTube Terms of Service
- ✅ App respects video availability (doesn't bypass age restrictions, geo-blocking)
- ✅ Doesn't scrape YouTube data beyond what yt-dlp provides
- ✅ Doesn't automate interaction with YouTube platform
- ⚠️ User responsible for compliance when downloading content

**Reference**: [YouTube ToS - Prohibited Conduct](https://www.youtube.com/static?template=terms)

### Legal Disclaimers
- ✅ MIT License (permissive, open-source)
- ✅ No warranty (use at own risk)
- ✅ User liable for misuse (downloading copyrighted content)
- ✅ yt-dlp attribution (GPL compliance)

---

## Incident Response

### If Compromised
If you believe Celeste Downloader was compromised:

1. **Report to GitHub**: File private security advisory
2. **Revoke & Re-sign**: Revoke compromised GPG key, create new releases
3. **Notify Users**: Update README with warning, post on GitHub Releases
4. **Post-Mortem**: Document what happened and how to prevent

### Supported Security Issues
- Remote code execution (RCE)
- Cryptographic weaknesses
- Integrity verification failures
- Credential exposure
- Supply chain compromise

**Not supported**: 
- Social engineering
- User misuse
- Third-party app attacks

---

## Security Roadmap

### v0.1.0-alpha (Current)
- ✅ SHA-256 verification
- ✅ HTTPS/TLS enforcement
- ✅ Input validation
- ✅ Legal disclaimers

### v0.2.0 (Future)
- [ ] GPG-signed releases
- [ ] Automated vulnerability scanning (Dependabot)
- [ ] Security policy documentation
- [ ] Optional download encryption (AES-256)

### v1.0 (Future)
- [ ] macOS code signing & notarization
- [ ] Reproducible builds (verify binary matches source)
- [ ] Security audit (third-party pen test)

---

## References

- **OWASP Top 10**: https://owasp.org/Top10/
- **CWE/SANS Top 25**: https://cwe.mitre.org/top25/
- **yt-dlp Security**: https://github.com/yt-dlp/yt-dlp#security
- **Python Security**: https://python.readthedocs.io/en/latest/library/security_warnings.html
- **FastAPI Security**: https://fastapi.tiangolo.com/advanced/security/

---

## Document Control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| v1.0 | 2026-08-17 | Antonio Torres | Initial security considerations |

**Next Review**: 2026-08-20 (end of v0.1.0-alpha sprint)

