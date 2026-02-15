"""
Template Manager UI - Graphical interface for managing user templates.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path
from typing import Optional
import threading
from datetime import datetime

from .template_manager import TemplateManager


class TemplateManagerUI:
    """GUI for managing user template library."""
    
    def __init__(self, parent=None):
        self.manager = TemplateManager()
        self.parent = parent
        self.window = None
        
    def show(self):
        """Display the template manager window."""
        # Create window
        if self.parent:
            self.window = tk.Toplevel(self.parent)
        else:
            self.window = tk.Tk()
        
        self.window.title("Template Library Manager")
        self.window.geometry("900x600")
        self.window.minsize(800, 500)
        
        # Initialize template folders on first run
        self.manager.initialize_folders()
        
        # Create UI
        self._create_menu()
        self._create_toolbar()
        self._create_main_area()
        self._create_status_bar()
        
        # Load templates
        self.refresh_templates()
        
        # Center window
        self.window.update_idletasks()
        x = (self.window.winfo_screenwidth() // 2) - (self.window.winfo_width() // 2)
        y = (self.window.winfo_screenheight() // 2) - (self.window.winfo_height() // 2)
        self.window.geometry(f"+{x}+{y}")
        
        if not self.parent:
            self.window.mainloop()
    
    def _create_menu(self):
        """Create menu bar."""
        menubar = tk.Menu(self.window)
        self.window.config(menu=menubar)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="Import Template...", command=self.import_template)
        file_menu.add_command(label="Open Library Folder", command=self.open_library_folder)
        file_menu.add_separator()
        file_menu.add_command(label="Refresh", command=self.refresh_templates)
        file_menu.add_separator()
        file_menu.add_command(label="Close", command=self.window.destroy)
        
        # Tools menu
        tools_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Tools", menu=tools_menu)
        tools_menu.add_command(label="Validate All Templates", command=self.validate_all)
        tools_menu.add_command(label="Library Statistics", command=self.show_stats)
        
        # Help menu
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Help", menu=help_menu)
        help_menu.add_command(label="How to Use", command=self.show_help)
        help_menu.add_command(label="About", command=self.show_about)
    
    def _create_toolbar(self):
        """Create toolbar with common actions."""
        toolbar = ttk.Frame(self.window)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        ttk.Button(toolbar, text="➕ Import Template", command=self.import_template).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="🗑️ Delete Selected", command=self.delete_selected).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="✓ Validate Selected", command=self.validate_selected).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="🔄 Refresh", command=self.refresh_templates).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="📁 Open Folder", command=self.open_library_folder).pack(side=tk.LEFT, padx=2)
        
        # Category filter
        ttk.Label(toolbar, text="Category:").pack(side=tk.LEFT, padx=(20, 5))
        self.category_var = tk.StringVar(value="All")
        category_combo = ttk.Combobox(
            toolbar, 
            textvariable=self.category_var,
            values=["All", "CRS", "FATCA", "CBC", "Custom"],
            state="readonly",
            width=10
        )
        category_combo.pack(side=tk.LEFT, padx=2)
        category_combo.bind("<<ComboboxSelected>>", lambda e: self.refresh_templates())
    
    def _create_main_area(self):
        """Create main template list area."""
        # Main container
        main_frame = ttk.Frame(self.window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Template list (left side)
        list_frame = ttk.LabelFrame(main_frame, text="Templates", padding=5)
        list_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Treeview for templates
        columns = ("Category", "Size", "Status", "Modified")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="tree headings", selectmode="browse")
        
        # Column headers
        self.tree.heading("#0", text="Template Name")
        self.tree.heading("Category", text="Category")
        self.tree.heading("Size", text="Size")
        self.tree.heading("Status", text="Status")
        self.tree.heading("Modified", text="Modified")
        
        # Column widths
        self.tree.column("#0", width=250)
        self.tree.column("Category", width=80)
        self.tree.column("Size", width=80)
        self.tree.column("Status", width=100)
        self.tree.column("Modified", width=150)
        
        # Scrollbars
        vsb = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        hsb = ttk.Scrollbar(list_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        # Grid layout
        self.tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        
        list_frame.grid_rowconfigure(0, weight=1)
        list_frame.grid_columnconfigure(0, weight=1)
        
        # Bind double-click to view details
        self.tree.bind("<Double-1>", lambda e: self.view_template_details())
        
        # Details panel (right side)
        details_frame = ttk.LabelFrame(main_frame, text="Template Details", padding=5)
        details_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=(5, 0))
        details_frame.config(width=300)
        
        self.details_text = scrolledtext.ScrolledText(
            details_frame,
            wrap=tk.WORD,
            width=35,
            height=20,
            font=("Consolas", 9)
        )
        self.details_text.pack(fill=tk.BOTH, expand=True)
        
        # Bind selection change
        self.tree.bind("<<TreeviewSelect>>", lambda e: self.on_selection_change())
    
    def _create_status_bar(self):
        """Create status bar at bottom."""
        status_frame = ttk.Frame(self.window)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.status_label = ttk.Label(status_frame, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=2, pady=2)
        
        self.count_label = ttk.Label(status_frame, text="0 templates", relief=tk.SUNKEN)
        self.count_label.pack(side=tk.RIGHT, padx=2, pady=2)
    
    def refresh_templates(self):
        """Refresh the template list."""
        # Clear tree
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Get selected category
        category_filter = self.category_var.get()
        scan_category = None if category_filter == "All" else category_filter
        
        # Scan templates
        templates = self.manager.scan_templates(scan_category)
        
        total_count = 0
        
        # Populate tree
        for category, template_list in sorted(templates.items()):
            # Add category node
            category_node = self.tree.insert("", "end", text=f"📁 {category}", open=True)
            
            for template in sorted(template_list, key=lambda x: x['name']):
                # Format size
                size_kb = template['size'] / 1024
                size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb/1024:.1f} MB"
                
                # Format date
                modified_date = datetime.fromtimestamp(template['modified']).strftime("%Y-%m-%d %H:%M")
                
                # Status icon
                status = "✓ Valid" if template['valid'] else "✗ Invalid"
                
                # Add template node
                self.tree.insert(
                    category_node,
                    "end",
                    text=template['name'],
                    values=(category, size_str, status, modified_date),
                    tags=("valid" if template['valid'] else "invalid",)
                )
                
                total_count += 1
        
        # Configure tags for coloring
        self.tree.tag_configure("valid", foreground="green")
        self.tree.tag_configure("invalid", foreground="red")
        
        # Update status
        self.count_label.config(text=f"{total_count} templates")
        self.status_label.config(text=f"Loaded {total_count} templates from {self.manager.base_path}")
    
    def on_selection_change(self):
        """Handle template selection change."""
        selection = self.tree.selection()
        if not selection:
            self.details_text.delete(1.0, tk.END)
            return
        
        item = selection[0]
        item_text = self.tree.item(item, "text")
        
        # Check if it's a category node
        if item_text.startswith("📁"):
            self.details_text.delete(1.0, tk.END)
            self.details_text.insert(1.0, f"Category: {item_text[2:]}\n\n")
            
            # Count templates in category
            children = self.tree.get_children(item)
            self.details_text.insert(tk.END, f"Templates: {len(children)}\n")
            return
        
        # It's a template - show details
        values = self.tree.item(item, "values")
        if not values:
            return
        
        category = values[0]
        template_path = self.manager.get_template_path(item_text, category)
        
        if template_path:
            # Validate and show details
            is_valid, msg = self.manager.validate_template(template_path, category)
            
            details = f"""Template: {item_text}
Category: {category}
Size: {values[1]}
Modified: {values[3]}

Validation Status:
{msg}

Path:
{template_path}
"""
            
            self.details_text.delete(1.0, tk.END)
            self.details_text.insert(1.0, details)
    
    def import_template(self):
        """Import a new template."""
        # Ask for file
        file_path = filedialog.askopenfilename(
            title="Select XML Template",
            filetypes=[("XML Files", "*.xml"), ("All Files", "*.*")],
            initialdir=Path.home()
        )
        
        if not file_path:
            return
        
        file_path = Path(file_path)
        
        # Ask for category
        category_dialog = tk.Toplevel(self.window)
        category_dialog.title("Select Category")
        category_dialog.geometry("300x150")
        category_dialog.transient(self.window)
        category_dialog.grab_set()
        
        ttk.Label(category_dialog, text="Import template to category:").pack(pady=10)
        
        category_var = tk.StringVar(value="Custom")
        for cat in ["CRS", "FATCA", "CBC", "Custom"]:
            ttk.Radiobutton(category_dialog, text=cat, variable=category_var, value=cat).pack(anchor=tk.W, padx=20)
        
        result = {'category': None}
        
        def on_ok():
            result['category'] = category_var.get()
            category_dialog.destroy()
        
        def on_cancel():
            category_dialog.destroy()
        
        btn_frame = ttk.Frame(category_dialog)
        btn_frame.pack(pady=10)
        ttk.Button(btn_frame, text="Import", command=on_ok).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Cancel", command=on_cancel).pack(side=tk.LEFT, padx=5)
        
        self.window.wait_window(category_dialog)
        
        if not result['category']:
            return
        
        # Import template
        self.status_label.config(text="Importing and validating template...")
        self.window.update()
        
        success, message = self.manager.import_template(file_path, result['category'], validate=True)
        
        if success:
            messagebox.showinfo("Success", message)
            self.refresh_templates()
        else:
            messagebox.showerror("Import Failed", message)
        
        self.status_label.config(text="Ready")
    
    def delete_selected(self):
        """Delete selected template."""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a template to delete.")
            return
        
        item = selection[0]
        item_text = self.tree.item(item, "text")
        
        # Check if it's a category node
        if item_text.startswith("📁"):
            messagebox.showwarning("Invalid Selection", "Cannot delete category folders.\nSelect a template instead.")
            return
        
        values = self.tree.item(item, "values")
        category = values[0]
        
        # Confirm deletion
        if not messagebox.askyesno("Confirm Delete", f"Delete template '{item_text}'?"):
            return
        
        # Delete
        success, message = self.manager.delete_template(item_text, category)
        
        if success:
            self.refresh_templates()
            self.status_label.config(text=message)
        else:
            messagebox.showerror("Delete Failed", message)
    
    def validate_selected(self):
        """Validate selected template."""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("No Selection", "Please select a template to validate.")
            return
        
        item = selection[0]
        item_text = self.tree.item(item, "text")
        
        if item_text.startswith("📁"):
            messagebox.showwarning("Invalid Selection", "Select a template, not a category.")
            return
        
        values = self.tree.item(item, "values")
        category = values[0]
        
        template_path = self.manager.get_template_path(item_text, category)
        if not template_path:
            return
        
        # Validate
        is_valid, msg = self.manager.validate_template(template_path, category)
        
        if is_valid:
            messagebox.showinfo("Validation Success", f"✓ {msg}")
        else:
            messagebox.showerror("Validation Failed", f"✗ {msg}")
    
    def validate_all(self):
        """Validate all templates."""
        self.status_label.config(text="Validating all templates...")
        self.window.update()
        
        templates = self.manager.scan_templates()
        
        total = 0
        valid = 0
        invalid = 0
        
        for category, template_list in templates.items():
            for template in template_list:
                total += 1
                if template['valid']:
                    valid += 1
                else:
                    invalid += 1
        
        message = f"""Validation Complete

Total Templates: {total}
✓ Valid: {valid}
✗ Invalid: {invalid}

{f'Invalid templates are marked in red in the list.' if invalid > 0 else 'All templates passed validation!'}"""
        
        messagebox.showinfo("Validation Results", message)
        self.status_label.config(text="Ready")
    
    def show_stats(self):
        """Show library statistics."""
        stats = self.manager.get_library_stats()
        
        message = f"""Template Library Statistics

Library Path:
{stats['library_path']}

Total Templates: {stats['total_templates']}
Valid: {stats['valid_templates']}
Invalid: {stats['invalid_templates']}

By Category:
"""
        
        for category, cat_stats in stats['by_category'].items():
            message += f"\n  {category}: {cat_stats['total']} ({cat_stats['valid']} valid)"
        
        messagebox.showinfo("Library Statistics", message)
    
    def view_template_details(self):
        """View detailed template information."""
        selection = self.tree.selection()
        if not selection:
            return
        
        item = selection[0]
        item_text = self.tree.item(item, "text")
        
        if item_text.startswith("📁"):
            return
        
        values = self.tree.item(item, "values")
        category = values[0]
        
        template_path = self.manager.get_template_path(item_text, category)
        if template_path:
            # Open in default XML viewer
            try:
                os.startfile(str(template_path))
            except:
                messagebox.showerror("Error", "Could not open template file.")
    
    def open_library_folder(self):
        """Open template library folder in explorer."""
        if self.manager.open_library_folder():
            self.status_label.config(text=f"Opened {self.manager.base_path}")
        else:
            messagebox.showerror("Error", "Could not open library folder.")
    
    def show_help(self):
        """Show help dialog."""
        help_text = """Template Library Manager - Help

HOW TO USE:

1. ADDING TEMPLATES
   - Click "Import Template" button
   - Select your XML file
   - Choose category (CRS, FATCA, CBC, or Custom)
   - Template will be validated and imported

2. VALIDATING TEMPLATES
   - Select a template from the list
   - Click "Validate Selected"
   - Or use "Validate All Templates" from Tools menu

3. ORGANIZING TEMPLATES
   - Templates are organized by category
   - Valid templates show ✓ in green
   - Invalid templates show ✗ in red

4. USING TEMPLATES
   - Valid templates appear in the generator wizard
   - Select them as base templates for data generation

5. MANAGING TEMPLATES
   - Delete unwanted templates
   - View template details in right panel
   - Open library folder to manage files directly

VALIDATION:
All templates are validated against official XSD schemas.
Only valid templates can be used for generation.

For more information, visit the GitHub repository.
"""
        
        help_window = tk.Toplevel(self.window)
        help_window.title("Help")
        help_window.geometry("600x500")
        
        text = scrolledtext.ScrolledText(help_window, wrap=tk.WORD, font=("Arial", 10))
        text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text.insert(1.0, help_text)
        text.config(state=tk.DISABLED)
        
        ttk.Button(help_window, text="Close", command=help_window.destroy).pack(pady=10)
    
    def show_about(self):
        """Show about dialog."""
        from . import __version__
        
        about_text = f"""CRS Generator - Template Library Manager

Version: {__version__}

A powerful tool for managing XML templates for CRS, FATCA, 
and CBC data generation.

Features:
• XSD Schema Validation
• Organized Template Library
• Easy Import/Export
• Template Validation

© 2026 CRS Generator Project
"""
        
        messagebox.showinfo("About", about_text)


def launch_template_manager():
    """Launch template manager as standalone application."""
    app = TemplateManagerUI()
    app.show()


if __name__ == "__main__":
    launch_template_manager()
