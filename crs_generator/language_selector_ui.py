"""
Language Selector UI Component

Provides a user-friendly interface for selecting data generation languages.
Includes warnings for non-Latin scripts that require NVARCHAR encoding.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Optional, Callable
from .language_config import (
    LanguageConfig, 
    SUPPORTED_LANGUAGES, 
    get_languages_by_category,
    get_language_display_name
)


class LanguageSelectorDialog:
    """Dialog for selecting language configuration."""
    
    def __init__(self, parent, initial_config: Optional[LanguageConfig] = None):
        self.parent = parent
        self.result = initial_config or LanguageConfig()
        self.dialog = None
        self.selected_languages = {}
        self.weight_vars = {}
        
    def show(self) -> Optional[LanguageConfig]:
        """Show the language selector dialog and return the configuration."""
        self.dialog = tk.Toplevel(self.parent)
        self.dialog.title("Language Selection")
        self.dialog.geometry("700x600")
        self.dialog.resizable(False, False)
        self.dialog.transient(self.parent)
        self.dialog.grab_set()
        
        # Center dialog
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (self.dialog.winfo_width() // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (self.dialog.winfo_height() // 2)
        self.dialog.geometry(f"+{x}+{y}")
        
        self._create_ui()
        
        # Wait for dialog to close
        self.parent.wait_window(self.dialog)
        
        return self.result
    
    def _create_ui(self):
        """Create the UI components."""
        # Header
        header_frame = tk.Frame(self.dialog, bg="#3498db", height=60)
        header_frame.pack(fill=tk.X)
        header_frame.pack_propagate(False)
        
        tk.Label(
            header_frame,
            text="🌍 Language Selection for Data Generation",
            font=("Arial", 14, "bold"),
            bg="#3498db",
            fg="white"
        ).pack(pady=15)
        
        # Main content
        content_frame = tk.Frame(self.dialog, padx=20, pady=10)
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Mode selection
        mode_frame = ttk.LabelFrame(content_frame, text="Language Mode", padding=10)
        mode_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.mode_var = tk.StringVar(value="single")
        
        ttk.Radiobutton(
            mode_frame,
            text="Single Language (Default)",
            variable=self.mode_var,
            value="single",
            command=self._on_mode_change
        ).pack(anchor=tk.W, pady=2)
        
        ttk.Radiobutton(
            mode_frame,
            text="Mixed Languages (Multiple languages in same dataset)",
            variable=self.mode_var,
            value="mixed",
            command=self._on_mode_change
        ).pack(anchor=tk.W, pady=2)
        
        # Language selection area
        self.lang_frame = ttk.LabelFrame(content_frame, text="Select Languages", padding=10)
        self.lang_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Create scrollable area
        canvas = tk.Canvas(self.lang_frame, height=300)
        scrollbar = ttk.Scrollbar(self.lang_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Populate languages by category
        languages_by_cat = get_languages_by_category()
        
        for category, languages in languages_by_cat.items():
            # Category header
            cat_label = tk.Label(
                scrollable_frame,
                text=f"▼ {category}",
                font=("Arial", 10, "bold"),
                fg="#2c3e50"
            )
            cat_label.pack(anchor=tk.W, pady=(10, 5))
            
            # Languages in category
            for lang in languages:
                lang_frame = tk.Frame(scrollable_frame)
                lang_frame.pack(fill=tk.X, padx=20, pady=2)
                
                # Checkbox
                var = tk.BooleanVar(value=False)
                self.selected_languages[lang['code']] = var
                
                cb = ttk.Checkbutton(
                    lang_frame,
                    text=lang['name'],
                    variable=var,
                    command=self._on_language_change
                )
                cb.pack(side=tk.LEFT)
                
                # Warning icon for non-safe encodings
                if not lang['safe']:
                    warning_label = tk.Label(
                        lang_frame,
                        text="⚠️",
                        fg="orange",
                        cursor="hand2"
                    )
                    warning_label.pack(side=tk.LEFT, padx=5)
                    
                    # Tooltip on hover
                    def create_tooltip(widget, text):
                        def on_enter(e):
                            tooltip = tk.Toplevel()
                            tooltip.wm_overrideredirect(True)
                            tooltip.wm_geometry(f"+{e.x_root+10}+{e.y_root+10}")
                            label = tk.Label(
                                tooltip,
                                text=text,
                                background="yellow",
                                relief=tk.SOLID,
                                borderwidth=1,
                                font=("Arial", 9)
                            )
                            label.pack()
                            widget.tooltip = tooltip
                        
                        def on_leave(e):
                            if hasattr(widget, 'tooltip'):
                                widget.tooltip.destroy()
                        
                        widget.bind("<Enter>", on_enter)
                        widget.bind("<Leave>", on_leave)
                    
                    create_tooltip(warning_label, lang['warning'])
                
                # Script indicator
                script_label = tk.Label(
                    lang_frame,
                    text=f"[{lang['script']}]",
                    font=("Arial", 8),
                    fg="gray"
                )
                script_label.pack(side=tk.LEFT, padx=5)
                
                # Weight slider (for mixed mode)
                weight_var = tk.DoubleVar(value=0.0)
                self.weight_vars[lang['code']] = weight_var
                
                weight_frame = tk.Frame(lang_frame)
                weight_frame.pack(side=tk.RIGHT, padx=10)
                
                tk.Label(weight_frame, text="Weight:", font=("Arial", 8)).pack(side=tk.LEFT)
                weight_label = tk.Label(weight_frame, text="0%", font=("Arial", 8), width=4)
                weight_label.pack(side=tk.LEFT)
                
                # Store reference for later
                lang_frame.weight_label = weight_label
                lang_frame.weight_var = weight_var
        
        # Info panel
        info_frame = ttk.LabelFrame(content_frame, text="Information", padding=10)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.info_text = tk.Text(info_frame, height=4, wrap=tk.WORD, font=("Arial", 9))
        self.info_text.pack(fill=tk.X)
        self.info_text.insert(1.0, "Select one or more languages for data generation.\n\n"
                                   "⚠️ Languages with warning icons require NVARCHAR columns in your database.")
        self.info_text.config(state=tk.DISABLED)
        
        # Buttons
        button_frame = tk.Frame(self.dialog)
        button_frame.pack(fill=tk.X, padx=20, pady=10)
        
        ttk.Button(
            button_frame,
            text="Cancel",
            command=self._on_cancel
        ).pack(side=tk.RIGHT, padx=5)
        
        ttk.Button(
            button_frame,
            text="OK",
            command=self._on_ok
        ).pack(side=tk.RIGHT, padx=5)
        
        ttk.Button(
            button_frame,
            text="Reset to Default",
            command=self._on_reset
        ).pack(side=tk.LEFT, padx=5)
        
        # Initialize with default (English)
        self.selected_languages['en_US'].set(True)
        self._on_mode_change()
    
    def _on_mode_change(self):
        """Handle mode change between single and mixed."""
        is_mixed = self.mode_var.get() == "mixed"
        
        # Update info text
        self.info_text.config(state=tk.NORMAL)
        self.info_text.delete(1.0, tk.END)
        
        if is_mixed:
            self.info_text.insert(1.0, 
                "Mixed Language Mode: Select multiple languages and adjust their weights.\n"
                "Weights determine the distribution of each language in the generated data.\n\n"
                "⚠️ Languages with warning icons require NVARCHAR columns in your database."
            )
        else:
            self.info_text.insert(1.0,
                "Single Language Mode: Select one primary language for all generated data.\n\n"
                "⚠️ Languages with warning icons require NVARCHAR columns in your database."
            )
        
        self.info_text.config(state=tk.DISABLED)
    
    def _on_language_change(self):
        """Handle language selection change."""
        selected_count = sum(1 for var in self.selected_languages.values() if var.get())
        
        if selected_count == 0:
            # At least one language must be selected
            messagebox.showwarning(
                "No Language Selected",
                "At least one language must be selected. Defaulting to English."
            )
            self.selected_languages['en_US'].set(True)
    
    def _on_reset(self):
        """Reset to default (English only)."""
        for code, var in self.selected_languages.items():
            var.set(code == 'en_US')
        
        self.mode_var.set("single")
        self._on_mode_change()
    
    def _on_ok(self):
        """Confirm selection and close dialog."""
        # Get selected languages
        selected = [code for code, var in self.selected_languages.items() if var.get()]
        
        if not selected:
            messagebox.showerror("Error", "Please select at least one language.")
            return
        
        # Build configuration
        primary_lang = selected[0]
        additional_langs = selected[1:] if len(selected) > 1 else []
        use_mixed = self.mode_var.get() == "mixed" and len(selected) > 1
        
        # Build weights if mixed mode
        weights = {}
        if use_mixed:
            # Equal distribution by default
            weight_per_lang = 1.0 / len(selected)
            for lang in selected:
                weights[lang] = weight_per_lang
        else:
            weights = {primary_lang: 1.0}
        
        # Create config
        self.result = LanguageConfig(
            primary_language=primary_lang,
            additional_languages=additional_langs,
            language_weights=weights,
            use_mixed=use_mixed
        )
        
        # Show encoding warning if needed
        warning = self.result.get_encoding_warning()
        if warning:
            messagebox.showwarning("Database Encoding Warning", warning)
        
        self.dialog.destroy()
    
    def _on_cancel(self):
        """Cancel and close dialog."""
        self.result = None
        self.dialog.destroy()


class LanguageSelectorButton:
    """
    Simple button widget that opens language selector dialog.
    Can be embedded in other UIs.
    """
    
    def __init__(self, parent, on_change: Optional[Callable] = None):
        self.parent = parent
        self.on_change = on_change
        self.config = LanguageConfig()  # Default to English
        
        self.frame = ttk.Frame(parent)
        
        # Label
        ttk.Label(
            self.frame,
            text="Data Language:",
            font=("Arial", 10)
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        # Current selection display
        self.selection_label = tk.Label(
            self.frame,
            text="English (Default)",
            font=("Arial", 10),
            fg="#2c3e50",
            relief=tk.SUNKEN,
            padx=10,
            pady=5
        )
        self.selection_label.pack(side=tk.LEFT, padx=(0, 10))
        
        # Change button
        ttk.Button(
            self.frame,
            text="Change Language...",
            command=self._open_selector
        ).pack(side=tk.LEFT)
        
        # Warning icon (hidden by default)
        self.warning_label = tk.Label(
            self.frame,
            text="⚠️ NVARCHAR Required",
            fg="orange",
            font=("Arial", 9, "bold")
        )
        # Don't pack yet - will show when needed
    
    def pack(self, **kwargs):
        """Pack the frame."""
        self.frame.pack(**kwargs)
    
    def grid(self, **kwargs):
        """Grid the frame."""
        self.frame.grid(**kwargs)
    
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
        """Update the display label based on current config."""
        languages = self.config.get_all_languages()
        
        if len(languages) == 1:
            display_name = get_language_display_name(languages[0])
            self.selection_label.config(text=display_name)
        else:
            lang_names = [get_language_display_name(lang) for lang in languages[:3]]
            if len(languages) > 3:
                display_text = f"{', '.join(lang_names)}... ({len(languages)} total)"
            else:
                display_text = ', '.join(lang_names)
            self.selection_label.config(text=f"Mixed: {display_text}")
        
        # Show/hide warning
        if self.config.requires_nvarchar():
            self.warning_label.pack(side=tk.LEFT, padx=10)
        else:
            self.warning_label.pack_forget()
    
    def get_config(self) -> LanguageConfig:
        """Get the current language configuration."""
        return self.config
    
    def set_config(self, config: LanguageConfig):
        """Set the language configuration."""
        self.config = config
        self._update_display()


def show_language_selector(parent=None) -> Optional[LanguageConfig]:
    """
    Standalone function to show language selector dialog.
    
    Args:
        parent: Parent window (creates new Tk if None)
    
    Returns:
        LanguageConfig or None if cancelled
    """
    if parent is None:
        root = tk.Tk()
        root.withdraw()
        parent = root
    
    dialog = LanguageSelectorDialog(parent)
    return dialog.show()


if __name__ == "__main__":
    # Test the language selector
    config = show_language_selector()
    if config:
        print(f"Selected languages: {config.get_all_languages()}")
        print(f"Primary: {config.primary_language}")
        print(f"Mixed mode: {config.use_mixed}")
        print(f"Requires NVARCHAR: {config.requires_nvarchar()}")
        if config.requires_nvarchar():
            print(f"\nWarning:\n{config.get_encoding_warning()}")
