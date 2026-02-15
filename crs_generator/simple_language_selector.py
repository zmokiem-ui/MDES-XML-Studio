"""
Simple Language Selector Widget

A compact widget that can be easily integrated into any form or wizard.
Shows a checkbox to enable language selection, and opens a dialog when clicked.
"""

import tkinter as tk
from tkinter import ttk
from typing import Optional, Callable
from .language_config import LanguageConfig, get_language_display_name
from .language_selector_ui import LanguageSelectorDialog


class SimpleLanguageSelector:
    """
    Simple language selector with checkbox and button.
    Default is English - only shows advanced options if user wants them.
    """
    
    def __init__(self, parent, on_change: Optional[Callable] = None):
        self.parent = parent
        self.on_change = on_change
        self.config = LanguageConfig()  # Default English
        self.enabled = False
        
        # Main frame
        self.frame = ttk.LabelFrame(parent, text="Language Options (Optional)", padding=10)
        
        # Enable checkbox
        self.enable_var = tk.BooleanVar(value=False)
        self.enable_checkbox = ttk.Checkbutton(
            self.frame,
            text="Use custom language for generated data (Default: English)",
            variable=self.enable_var,
            command=self._on_enable_toggle
        )
        self.enable_checkbox.pack(anchor=tk.W, pady=5)
        
        # Options frame (hidden by default)
        self.options_frame = ttk.Frame(self.frame)
        
        # Current selection display
        info_frame = ttk.Frame(self.options_frame)
        info_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(
            info_frame,
            text="Selected Language:",
            font=("Arial", 9)
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        self.selection_label = tk.Label(
            info_frame,
            text="English (Default)",
            font=("Arial", 9, "bold"),
            fg="#2c3e50"
        )
        self.selection_label.pack(side=tk.LEFT)
        
        # Change button
        ttk.Button(
            self.options_frame,
            text="🌍 Select Language...",
            command=self._open_selector
        ).pack(pady=5)
        
        # Warning message
        self.warning_frame = tk.Frame(self.options_frame, bg="#fff3cd", relief=tk.SOLID, borderwidth=1)
        self.warning_text = tk.Text(
            self.warning_frame,
            height=3,
            wrap=tk.WORD,
            font=("Arial", 8),
            bg="#fff3cd",
            fg="#856404",
            relief=tk.FLAT
        )
        self.warning_text.pack(fill=tk.X, padx=5, pady=5)
        # Don't pack warning_frame yet
    
    def pack(self, **kwargs):
        """Pack the frame."""
        self.frame.pack(**kwargs)
    
    def grid(self, **kwargs):
        """Grid the frame."""
        self.frame.grid(**kwargs)
    
    def _on_enable_toggle(self):
        """Handle enable/disable toggle."""
        self.enabled = self.enable_var.get()
        
        if self.enabled:
            # Show options
            self.options_frame.pack(fill=tk.X, pady=10)
        else:
            # Hide options and reset to default
            self.options_frame.pack_forget()
            self.config = LanguageConfig()  # Reset to English
            self._update_display()
            
            if self.on_change:
                self.on_change(self.config)
    
    def _open_selector(self):
        """Open the language selector dialog."""
        dialog = LanguageSelectorDialog(self.parent, self.config)
        result = dialog.show()
        
        if result:
            self.config = result
            self._update_display()
            
            if self.on_change:
                self.on_change(self.config)
    
    def _update_display(self):
        """Update the display based on current config."""
        languages = self.config.get_all_languages()
        
        # Update selection label
        if len(languages) == 1:
            display_name = get_language_display_name(languages[0])
            self.selection_label.config(text=display_name)
        else:
            lang_names = [get_language_display_name(lang) for lang in languages[:2]]
            if len(languages) > 2:
                display_text = f"{', '.join(lang_names)}... (+{len(languages)-2} more)"
            else:
                display_text = ', '.join(lang_names)
            self.selection_label.config(text=f"Mixed: {display_text}")
        
        # Show/hide warning
        warning = self.config.get_encoding_warning()
        if warning:
            self.warning_text.delete(1.0, tk.END)
            self.warning_text.insert(1.0, warning)
            self.warning_frame.pack(fill=tk.X, pady=5)
        else:
            self.warning_frame.pack_forget()
    
    def get_config(self) -> Optional[LanguageConfig]:
        """
        Get the current language configuration.
        Returns None if language selection is disabled (use default English).
        """
        if not self.enabled:
            return None
        return self.config
    
    def set_config(self, config: Optional[LanguageConfig]):
        """Set the language configuration."""
        if config is None:
            self.enabled = False
            self.enable_var.set(False)
            self.config = LanguageConfig()
            self.options_frame.pack_forget()
        else:
            self.enabled = True
            self.enable_var.set(True)
            self.config = config
            self.options_frame.pack(fill=tk.X, pady=10)
            self._update_display()
    
    def is_enabled(self) -> bool:
        """Check if custom language selection is enabled."""
        return self.enabled


# Standalone test
if __name__ == "__main__":
    root = tk.Tk()
    root.title("Language Selector Test")
    root.geometry("600x400")
    
    def on_change(config):
        print(f"Language changed: {config.get_all_languages()}")
        print(f"Requires NVARCHAR: {config.requires_nvarchar()}")
    
    selector = SimpleLanguageSelector(root, on_change=on_change)
    selector.pack(fill=tk.X, padx=20, pady=20)
    
    # Test button to get config
    def show_config():
        config = selector.get_config()
        if config:
            print(f"\nCurrent config:")
            print(f"  Languages: {config.get_all_languages()}")
            print(f"  Mixed: {config.use_mixed}")
            print(f"  Weights: {config.language_weights}")
        else:
            print("\nUsing default (English)")
    
    ttk.Button(root, text="Show Current Config", command=show_config).pack(pady=10)
    
    root.mainloop()
