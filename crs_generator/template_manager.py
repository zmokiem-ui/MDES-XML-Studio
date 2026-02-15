"""
Template Manager - User Template Library System

Allows users to add their own XML templates to organized folders.
Templates are validated against XSD schemas before being accepted.
"""

import os
import shutil
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from lxml import etree
import logging

logger = logging.getLogger(__name__)


class TemplateManager:
    """Manages user template library with validation."""
    
    def __init__(self, base_path: Optional[Path] = None):
        """
        Initialize template manager.
        
        Args:
            base_path: Base directory for user templates. 
                      Defaults to Documents/CRS-Generator-Templates
        """
        if base_path is None:
            # Use Documents folder for user templates
            documents = Path.home() / "Documents"
            self.base_path = documents / "CRS-Generator-Templates"
        else:
            self.base_path = Path(base_path)
        
        # Template categories
        self.categories = {
            'CRS': 'CRS XML Templates',
            'FATCA': 'FATCA XML Templates',
            'CBC': 'CBC (Country-by-Country) Templates',
            'Custom': 'Custom Templates'
        }
        
        # XSD schema paths (bundled with app)
        self.schema_paths = self._get_schema_paths()
        
    def _get_schema_paths(self) -> Dict[str, Path]:
        """Get paths to XSD schemas bundled with application."""
        app_dir = Path(__file__).parent
        
        return {
            'CRS_v2': app_dir / 'schemas' / 'CRS' / 'CrsXML_v2.0.xsd',
            'FATCA_v2': app_dir / 'schemas' / 'FATCA' / 'FatcaXML_v2.0.xsd',
            'CBC_v2': app_dir / 'schemas' / 'CBC' / 'CbcXML_v2.0.xsd',
        }
    
    def initialize_folders(self) -> bool:
        """
        Create template folder structure on first run.
        
        Returns:
            True if folders were created, False if already existed
        """
        try:
            created = False
            
            # Create base directory
            if not self.base_path.exists():
                self.base_path.mkdir(parents=True, exist_ok=True)
                created = True
                logger.info(f"Created template library at: {self.base_path}")
            
            # Create category folders
            for category, description in self.categories.items():
                category_path = self.base_path / category
                if not category_path.exists():
                    category_path.mkdir(exist_ok=True)
                    
                    # Create README in each folder
                    readme_path = category_path / "README.txt"
                    readme_content = f"""{description}

Place your {category} XML templates in this folder.

The application will:
1. Validate templates against XSD schema
2. Make them available for data generation
3. Allow you to use them as base templates

Supported file format: .xml

Note: Templates must be valid {category} XML files that conform to the schema.
Invalid files will be rejected with an error message.
"""
                    readme_path.write_text(readme_content, encoding='utf-8')
            
            # Create examples folder
            examples_path = self.base_path / "_Examples"
            if not examples_path.exists():
                examples_path.mkdir(exist_ok=True)
                self._copy_example_templates(examples_path)
            
            # Create main README
            main_readme = self.base_path / "README.txt"
            if not main_readme.exists():
                main_readme_content = """CRS Generator - User Template Library

This folder contains your custom XML templates organized by category.

FOLDER STRUCTURE:
├── CRS/          - CRS XML templates
├── FATCA/        - FATCA XML templates  
├── CBC/          - Country-by-Country templates
├── Custom/       - Your custom templates
└── _Examples/    - Example templates (reference only)

HOW TO ADD TEMPLATES:
1. Place your XML file in the appropriate category folder
2. Open CRS Generator application
3. Go to "Template Manager" menu
4. Click "Validate & Import Templates"
5. Templates will be checked and added to your library

VALIDATION:
All templates are validated against official XSD schemas.
Invalid templates will be rejected with detailed error messages.

USAGE:
Once imported, templates appear in the generator wizard.
You can select them as base templates for data generation.

For more information, visit: https://github.com/zmokiem-ui/CRS-xml-generator
"""
                main_readme.write_text(main_readme_content, encoding='utf-8')
            
            return created
            
        except Exception as e:
            logger.error(f"Failed to initialize template folders: {e}")
            return False
    
    def _copy_example_templates(self, examples_path: Path):
        """Copy bundled example templates to examples folder."""
        try:
            app_templates = Path(__file__).parent / 'templates'
            
            if app_templates.exists():
                # Copy a few example templates
                example_files = [
                    'CRS.Generic.2021.Domestic.xml',
                    'skeleton.xml'
                ]
                
                for filename in example_files:
                    src = app_templates / filename
                    if src.exists():
                        dst = examples_path / filename
                        shutil.copy2(src, dst)
                        
        except Exception as e:
            logger.warning(f"Could not copy example templates: {e}")
    
    def validate_template(self, template_path: Path, category: str = 'auto') -> Tuple[bool, str]:
        """
        Validate XML template against appropriate XSD schema.
        
        Args:
            template_path: Path to XML template file
            category: Template category (CRS, FATCA, CBC, or 'auto' to detect)
        
        Returns:
            Tuple of (is_valid, message)
        """
        try:
            # Parse XML
            parser = etree.XMLParser(remove_blank_text=True)
            tree = etree.parse(str(template_path), parser)
            root = tree.getroot()
            
            # Auto-detect category from namespace
            if category == 'auto':
                namespace = root.nsmap.get(None, '')
                if 'crs' in namespace.lower():
                    category = 'CRS'
                elif 'fatca' in namespace.lower():
                    category = 'FATCA'
                elif 'cbc' in namespace.lower():
                    category = 'CBC'
                else:
                    return False, "Could not detect template type from XML namespace"
            
            # Get appropriate schema
            schema_key = f"{category}_v2"
            schema_path = self.schema_paths.get(schema_key)
            
            if not schema_path or not schema_path.exists():
                # No schema available, do basic XML validation only
                return True, f"Valid XML (schema validation skipped for {category})"
            
            # Validate against schema
            schema_doc = etree.parse(str(schema_path))
            schema = etree.XMLSchema(schema_doc)
            
            if schema.validate(tree):
                return True, f"Valid {category} template - passed XSD validation"
            else:
                errors = []
                for error in schema.error_log:
                    errors.append(f"Line {error.line}: {error.message}")
                
                error_msg = "\n".join(errors[:5])  # Show first 5 errors
                if len(errors) > 5:
                    error_msg += f"\n... and {len(errors) - 5} more errors"
                
                return False, f"XSD Validation Failed:\n{error_msg}"
                
        except etree.XMLSyntaxError as e:
            return False, f"XML Syntax Error: {e}"
        except Exception as e:
            return False, f"Validation Error: {e}"
    
    def scan_templates(self, category: Optional[str] = None) -> Dict[str, List[Dict]]:
        """
        Scan template folders and return available templates.
        
        Args:
            category: Specific category to scan, or None for all
        
        Returns:
            Dict mapping category to list of template info dicts
        """
        results = {}
        
        categories_to_scan = [category] if category else self.categories.keys()
        
        for cat in categories_to_scan:
            category_path = self.base_path / cat
            if not category_path.exists():
                continue
            
            templates = []
            for xml_file in category_path.glob('*.xml'):
                # Get file info
                stat = xml_file.stat()
                
                # Quick validation
                is_valid, msg = self.validate_template(xml_file, cat)
                
                templates.append({
                    'name': xml_file.name,
                    'path': xml_file,
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                    'valid': is_valid,
                    'validation_message': msg,
                    'category': cat
                })
            
            if templates:
                results[cat] = templates
        
        return results
    
    def import_template(self, source_path: Path, category: str, validate: bool = True) -> Tuple[bool, str]:
        """
        Import a template file into the library.
        
        Args:
            source_path: Path to template file to import
            category: Category to import into (CRS, FATCA, CBC, Custom)
            validate: Whether to validate before importing
        
        Returns:
            Tuple of (success, message)
        """
        try:
            if not source_path.exists():
                return False, f"File not found: {source_path}"
            
            if not source_path.suffix.lower() == '.xml':
                return False, "Only .xml files are supported"
            
            # Validate if requested
            if validate:
                is_valid, msg = self.validate_template(source_path, category)
                if not is_valid:
                    return False, f"Validation failed:\n{msg}"
            
            # Copy to category folder
            category_path = self.base_path / category
            category_path.mkdir(parents=True, exist_ok=True)
            
            dest_path = category_path / source_path.name
            
            # Check if file already exists
            if dest_path.exists():
                return False, f"Template '{source_path.name}' already exists in {category}"
            
            shutil.copy2(source_path, dest_path)
            
            return True, f"Successfully imported '{source_path.name}' to {category}"
            
        except Exception as e:
            return False, f"Import failed: {e}"
    
    def delete_template(self, template_name: str, category: str) -> Tuple[bool, str]:
        """
        Delete a template from the library.
        
        Args:
            template_name: Name of template file
            category: Category it's in
        
        Returns:
            Tuple of (success, message)
        """
        try:
            template_path = self.base_path / category / template_name
            
            if not template_path.exists():
                return False, f"Template not found: {template_name}"
            
            template_path.unlink()
            return True, f"Deleted '{template_name}' from {category}"
            
        except Exception as e:
            return False, f"Delete failed: {e}"
    
    def get_template_path(self, template_name: str, category: str) -> Optional[Path]:
        """Get full path to a template file."""
        template_path = self.base_path / category / template_name
        return template_path if template_path.exists() else None
    
    def get_library_stats(self) -> Dict:
        """Get statistics about the template library."""
        stats = {
            'total_templates': 0,
            'by_category': {},
            'valid_templates': 0,
            'invalid_templates': 0,
            'library_path': str(self.base_path)
        }
        
        templates = self.scan_templates()
        
        for category, template_list in templates.items():
            count = len(template_list)
            valid_count = sum(1 for t in template_list if t['valid'])
            
            stats['by_category'][category] = {
                'total': count,
                'valid': valid_count,
                'invalid': count - valid_count
            }
            
            stats['total_templates'] += count
            stats['valid_templates'] += valid_count
            stats['invalid_templates'] += (count - valid_count)
        
        return stats
    
    def open_library_folder(self):
        """Open the template library folder in file explorer."""
        try:
            if self.base_path.exists():
                os.startfile(str(self.base_path))
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to open library folder: {e}")
            return False
