"""
Auto-update module for CRS Generator.
Checks GitHub releases for new versions and handles updates.
"""

import requests
import json
import os
import sys
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class UpdateChecker:
    """Checks for and manages application updates from GitHub releases."""
    
    def __init__(self, current_version: str, repo_owner: str = "zmokiem-ui", repo_name: str = "CRS-xml-generator"):
        self.current_version = current_version
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.github_api_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/releases/latest"
        
    def parse_version(self, version_str: str) -> Tuple[int, int, int]:
        """Parse version string like '2.1.0' into tuple (2, 1, 0)."""
        # Remove 'v' prefix if present
        version_str = version_str.lstrip('v')
        parts = version_str.split('.')
        return tuple(int(p) for p in parts[:3])
    
    def check_for_updates(self, timeout: int = 5) -> Optional[Dict]:
        """
        Check GitHub for new releases.
        
        Returns:
            Dict with update info if available, None otherwise
            {
                'available': bool,
                'latest_version': str,
                'download_url': str,
                'release_notes': str
            }
        """
        try:
            response = requests.get(self.github_api_url, timeout=timeout)
            response.raise_for_status()
            
            release_data = response.json()
            latest_version = release_data.get('tag_name', '').lstrip('v')
            
            if not latest_version:
                return None
            
            # Compare versions
            current = self.parse_version(self.current_version)
            latest = self.parse_version(latest_version)
            
            if latest > current:
                # Find the .exe asset
                download_url = None
                for asset in release_data.get('assets', []):
                    if asset['name'].endswith('.exe'):
                        download_url = asset['browser_download_url']
                        break
                
                return {
                    'available': True,
                    'latest_version': latest_version,
                    'current_version': self.current_version,
                    'download_url': download_url,
                    'release_notes': release_data.get('body', 'No release notes available.'),
                    'release_url': release_data.get('html_url', '')
                }
            
            return {'available': False, 'latest_version': latest_version}
            
        except requests.exceptions.RequestException as e:
            logger.debug(f"Update check failed: {e}")
            return None
        except Exception as e:
            logger.debug(f"Unexpected error during update check: {e}")
            return None
    
    def download_update(self, download_url: str, progress_callback=None) -> Optional[Path]:
        """
        Download the update file.
        
        Args:
            download_url: URL to download from
            progress_callback: Optional callback function(bytes_downloaded, total_bytes)
        
        Returns:
            Path to downloaded file, or None if failed
        """
        try:
            response = requests.get(download_url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            # Create temp file
            temp_dir = tempfile.gettempdir()
            temp_file = Path(temp_dir) / "CRS-Generator-Update.exe"
            
            downloaded = 0
            with open(temp_file, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback:
                            progress_callback(downloaded, total_size)
            
            return temp_file
            
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return None
    
    def install_update(self, update_file: Path) -> bool:
        """
        Install the downloaded update by replacing the current executable.
        
        This creates a batch script that:
        1. Waits for current process to exit
        2. Replaces the old exe with new one
        3. Restarts the application
        
        Returns:
            True if update script was created successfully
        """
        try:
            # Get current executable path
            if getattr(sys, 'frozen', False):
                current_exe = Path(sys.executable)
            else:
                # Running from Python, can't auto-update
                logger.warning("Auto-update only works with compiled EXE")
                return False
            
            # Create update script
            update_script = current_exe.parent / "update_installer.bat"
            
            script_content = f"""@echo off
echo Installing update...
timeout /t 2 /nobreak >nul
taskkill /F /IM "{current_exe.name}" >nul 2>&1
timeout /t 1 /nobreak >nul
move /Y "{update_file}" "{current_exe}"
echo Update installed successfully!
timeout /t 2 /nobreak >nul
start "" "{current_exe}"
del "%~f0"
"""
            
            with open(update_script, 'w') as f:
                f.write(script_content)
            
            # Launch update script and exit
            os.startfile(str(update_script))
            return True
            
        except Exception as e:
            logger.error(f"Update installation failed: {e}")
            return False


def check_for_updates_silent(current_version: str) -> Optional[Dict]:
    """
    Convenience function to silently check for updates.
    Returns update info dict or None.
    """
    checker = UpdateChecker(current_version)
    return checker.check_for_updates()
