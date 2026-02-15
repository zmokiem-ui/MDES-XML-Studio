"""
Startup module for CRS Generator.
Handles update checks and displays notifications to users.
"""

import tkinter as tk
from tkinter import messagebox
import threading
from typing import Optional, Dict
import logging

from . import __version__
from .updater import UpdateChecker

logger = logging.getLogger(__name__)


def check_updates_async(callback):
    """Check for updates in background thread."""
    def _check():
        checker = UpdateChecker(__version__)
        result = checker.check_for_updates()
        callback(result)
    
    thread = threading.Thread(target=_check, daemon=True)
    thread.start()


def show_update_dialog(update_info: Dict) -> bool:
    """
    Show update notification dialog to user.
    
    Returns:
        True if user wants to update, False otherwise
    """
    root = tk.Tk()
    root.withdraw()  # Hide main window
    
    message = f"""A new version of CRS Generator is available!

Current Version: {update_info['current_version']}
Latest Version: {update_info['latest_version']}

Release Notes:
{update_info['release_notes'][:300]}...

Would you like to download and install the update now?

The application will restart after the update."""
    
    result = messagebox.askyesno(
        "Update Available",
        message,
        icon='info'
    )
    
    root.destroy()
    return result


def download_and_install_update(update_info: Dict) -> bool:
    """
    Download and install update with progress dialog.
    
    Returns:
        True if successful, False otherwise
    """
    if not update_info.get('download_url'):
        messagebox.showerror(
            "Update Error",
            "No download URL found for this release.\n\n"
            f"Please visit:\n{update_info.get('release_url', 'GitHub releases page')}"
        )
        return False
    
    # Create progress window
    progress_window = tk.Tk()
    progress_window.title("Downloading Update")
    progress_window.geometry("400x150")
    progress_window.resizable(False, False)
    
    tk.Label(
        progress_window,
        text=f"Downloading CRS Generator v{update_info['latest_version']}...",
        font=('Arial', 10, 'bold')
    ).pack(pady=20)
    
    progress_label = tk.Label(progress_window, text="Starting download...")
    progress_label.pack(pady=10)
    
    progress_bar = tk.Canvas(progress_window, width=350, height=30, bg='white')
    progress_bar.pack(pady=10)
    
    def update_progress(downloaded, total):
        """Update progress bar."""
        if total > 0:
            percent = (downloaded / total) * 100
            progress_label.config(text=f"{downloaded // 1024} KB / {total // 1024} KB ({percent:.1f}%)")
            
            # Draw progress bar
            progress_bar.delete("all")
            bar_width = int((downloaded / total) * 340)
            progress_bar.create_rectangle(5, 5, bar_width + 5, 25, fill='#4CAF50', outline='')
            progress_bar.create_rectangle(5, 5, 345, 25, outline='#333')
            
        progress_window.update()
    
    # Download in background thread
    download_result = {'success': False, 'file': None}
    
    def download_thread():
        checker = UpdateChecker(__version__)
        downloaded_file = checker.download_update(
            update_info['download_url'],
            progress_callback=update_progress
        )
        
        download_result['file'] = downloaded_file
        download_result['success'] = downloaded_file is not None
        progress_window.quit()
    
    thread = threading.Thread(target=download_thread, daemon=True)
    thread.start()
    
    progress_window.mainloop()
    progress_window.destroy()
    
    # Install if download successful
    if download_result['success'] and download_result['file']:
        checker = UpdateChecker(__version__)
        success = checker.install_update(download_result['file'])
        
        if success:
            messagebox.showinfo(
                "Update Ready",
                "Update downloaded successfully!\n\n"
                "The application will now restart to complete the installation."
            )
            return True
        else:
            messagebox.showerror(
                "Update Failed",
                "Failed to install update. Please try again later or download manually."
            )
            return False
    else:
        messagebox.showerror(
            "Download Failed",
            "Failed to download update. Please check your internet connection and try again."
        )
        return False


def check_for_updates_on_startup(silent: bool = False) -> Optional[Dict]:
    """
    Check for updates when application starts.
    
    Args:
        silent: If True, only check but don't show dialogs
    
    Returns:
        Update info dict if available, None otherwise
    """
    def handle_update_result(update_info):
        if not update_info:
            if not silent:
                logger.info("No updates available or check failed")
            return
        
        if not update_info.get('available'):
            if not silent:
                logger.info(f"Already running latest version: {update_info.get('latest_version')}")
            return
        
        # Update available
        logger.info(f"Update available: {update_info['latest_version']}")
        
        if not silent:
            # Show dialog and ask user
            if show_update_dialog(update_info):
                download_and_install_update(update_info)
    
    if silent:
        # Quick check without blocking
        checker = UpdateChecker(__version__)
        return checker.check_for_updates()
    else:
        # Show dialogs
        check_updates_async(handle_update_result)
        return None


def show_startup_banner():
    """Display startup banner with version info."""
    banner = f"""
================================================================
                                                             
            CRS Test Data Generator v{__version__:<10}             
                                                             
  Generate compliant CRS, FATCA, and CBC XML test data       
                                                             
================================================================
"""
    print(banner)
