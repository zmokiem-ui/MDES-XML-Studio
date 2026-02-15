"""
Main entry point for CRS Generator application.
Handles startup, update checks, template library initialization, and launches the wizard.
"""

import sys
import tkinter as tk
from tkinter import messagebox
from crs_generator.startup import check_for_updates_on_startup, show_startup_banner
from crs_generator.template_manager import TemplateManager
from crs_generator.template_ui import TemplateManagerUI


def show_main_menu():
    """Show main menu with options."""
    root = tk.Tk()
    root.title("CRS Generator")
    root.geometry("500x400")
    root.resizable(False, False)
    
    # Center window
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
    y = (root.winfo_screenheight() // 2) - (root.winfo_height() // 2)
    root.geometry(f"+{x}+{y}")
    
    # Header
    header_frame = tk.Frame(root, bg="#2c3e50", height=80)
    header_frame.pack(fill=tk.X)
    header_frame.pack_propagate(False)
    
    from crs_generator import __version__
    tk.Label(
        header_frame,
        text="CRS Test Data Generator",
        font=("Arial", 18, "bold"),
        bg="#2c3e50",
        fg="white"
    ).pack(pady=10)
    
    tk.Label(
        header_frame,
        text=f"Version {__version__}",
        font=("Arial", 10),
        bg="#2c3e50",
        fg="#ecf0f1"
    ).pack()
    
    # Main content
    content_frame = tk.Frame(root, padx=30, pady=20)
    content_frame.pack(fill=tk.BOTH, expand=True)
    
    tk.Label(
        content_frame,
        text="Welcome! Choose an option:",
        font=("Arial", 12, "bold")
    ).pack(pady=(0, 20))
    
    # Buttons
    def launch_wizard():
        root.destroy()
        try:
            from crs_generator.wizard import run_wizard
            run_wizard()
        except ImportError:
            messagebox.showerror("Error", "Wizard module not found. Using CLI mode.")
            print("\nWizard not available. Please use CLI commands.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to launch wizard: {e}")
    
    def launch_template_manager():
        template_ui = TemplateManagerUI(root)
        template_ui.show()
    
    def launch_cli():
        root.destroy()
        print("\n" + "="*60)
        print("CRS Generator - Command Line Interface")
        print("="*60)
        print("\nAvailable commands:")
        print("  python -m crs_generator.cli --help")
        print("  python -m crs_generator.fatca_cli --help")
        print("  python -m crs_generator.cbc_cli --help")
        print("\nFor interactive mode:")
        print("  python interactive_generator.py")
        print("\n" + "="*60)
    
    tk.Button(
        content_frame,
        text="🧙 Launch Wizard (Generate XML)",
        font=("Arial", 11),
        width=35,
        height=2,
        bg="#3498db",
        fg="white",
        command=launch_wizard,
        cursor="hand2"
    ).pack(pady=5)
    
    tk.Button(
        content_frame,
        text="📚 Template Library Manager",
        font=("Arial", 11),
        width=35,
        height=2,
        bg="#2ecc71",
        fg="white",
        command=launch_template_manager,
        cursor="hand2"
    ).pack(pady=5)
    
    tk.Button(
        content_frame,
        text="💻 Command Line Interface",
        font=("Arial", 11),
        width=35,
        height=2,
        bg="#95a5a6",
        fg="white",
        command=launch_cli,
        cursor="hand2"
    ).pack(pady=5)
    
    tk.Button(
        content_frame,
        text="❌ Exit",
        font=("Arial", 11),
        width=35,
        height=2,
        bg="#e74c3c",
        fg="white",
        command=root.destroy,
        cursor="hand2"
    ).pack(pady=5)
    
    # Footer
    footer_frame = tk.Frame(root, bg="#ecf0f1", height=40)
    footer_frame.pack(fill=tk.X, side=tk.BOTTOM)
    footer_frame.pack_propagate(False)
    
    tk.Label(
        footer_frame,
        text="© 2026 CRS Generator | github.com/zmokiem-ui/CRS-xml-generator",
        font=("Arial", 8),
        bg="#ecf0f1",
        fg="#7f8c8d"
    ).pack(pady=10)
    
    root.mainloop()


def main():
    """Main application entry point."""
    # Show banner in console
    show_startup_banner()
    
    # Initialize template library folders on first run
    template_manager = TemplateManager()
    if template_manager.initialize_folders():
        print(f"\n✓ Template library initialized at: {template_manager.base_path}")
        print("  You can now add your own XML templates to the library!")
    
    # Check for updates on startup (non-blocking)
    check_for_updates_on_startup(silent=False)
    
    # Show main menu
    try:
        show_main_menu()
    except KeyboardInterrupt:
        print("\n\nApplication terminated by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
