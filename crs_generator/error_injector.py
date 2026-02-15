"""
Error Injector - Corrupt XML/CSV files for testing purposes
Supports CRS, FATCA, and CBC modules with various corruption types
"""

import xml.etree.ElementTree as ET
import csv
import random
import re
from pathlib import Path
from typing import Dict, List, Any
import json


class ErrorInjector:
    """Inject errors into XML/CSV files for testing"""
    
    def __init__(self, module: str, file_type: str, corruption_level: int = 3):
        self.module = module.lower()
        self.file_type = file_type.lower()
        self.corruption_level = corruption_level
        self.corruptions_applied = []
        
    def corrupt_file(self, input_path: str, output_path: str, preset: str, options: Dict[str, bool]) -> Dict[str, Any]:
        """Main corruption method"""
        try:
            if self.file_type == 'xml':
                return self._corrupt_xml(input_path, output_path, preset, options)
            else:
                return self._corrupt_csv(input_path, output_path, preset, options)
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _corrupt_xml(self, input_path: str, output_path: str, preset: str, options: Dict[str, bool]) -> Dict[str, Any]:
        """Corrupt XML file based on preset and options"""
        tree = ET.parse(input_path)
        root = tree.getroot()
        
        # Get namespace
        ns = self._get_namespace(root)
        
        # Apply corruptions based on preset
        if preset == 'missing_required':
            self._remove_required_fields(root, ns, options)
        elif preset == 'invalid_dates':
            self._corrupt_dates(root, ns, options)
        elif preset == 'wrong_country_codes':
            self._corrupt_country_codes(root, ns, options)
        elif preset == 'invalid_amounts':
            self._corrupt_amounts(root, ns, options)
        elif preset == 'duplicate_docrefids':
            self._duplicate_docrefids(root, ns, options)
        elif preset == 'wrong_message_type':
            self._corrupt_message_types(root, ns, options)
        elif preset == 'malformed_xml':
            self._malform_xml(root, ns, options)
        elif preset == 'invalid_tin_format':
            self._corrupt_tin_formats(root, ns, options)
        elif preset == 'invalid_giin':
            self._corrupt_giin_formats(root, ns, options)
        elif preset == 'wrong_filer_category':
            self._corrupt_filer_category(root, ns, options)
        elif preset == 'invalid_account_types':
            self._corrupt_account_types(root, ns, options)
        elif preset == 'wrong_payment_types':
            self._corrupt_payment_types(root, ns, options)
        elif preset == 'us_indicia_errors':
            self._create_us_indicia_errors(root, ns, options)
        elif preset == 'invalid_revenues':
            self._corrupt_revenues(root, ns, options)
        elif preset == 'wrong_entity_types':
            self._corrupt_entity_types(root, ns, options)
        elif preset == 'missing_cbc_reports':
            self._remove_cbc_reports(root, ns, options)
        elif preset == 'invalid_message_type':
            self._corrupt_cbc_message_type(root, ns, options)
        elif preset == 'duplicate_entities':
            self._duplicate_entities(root, ns, options)
        
        # Apply corruption level intensity
        self._apply_corruption_intensity(root, ns)
        
        # Write corrupted XML
        tree.write(output_path, encoding='utf-8', xml_declaration=True)
        
        return {
            'success': True,
            'outputPath': output_path,
            'corruptionsApplied': self.corruptions_applied
        }
    
    def _corrupt_csv(self, input_path: str, output_path: str, preset: str, options: Dict[str, bool]) -> Dict[str, Any]:
        """Corrupt CSV file based on preset"""
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
        
        if not rows:
            return {'success': False, 'error': 'Empty CSV file'}
        
        headers = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else []
        
        # Apply CSV corruptions
        if preset == 'missing_headers':
            rows = data_rows
            self.corruptions_applied.append('Removed CSV headers')
        
        if preset == 'wrong_delimiter':
            # Will be handled during write
            self.corruptions_applied.append('Changed delimiter to semicolon')
        
        if preset == 'missing_columns':
            if headers and options.get('removeRandom', True):
                num_to_remove = max(1, len(headers) // 4)
                cols_to_remove = random.sample(range(len(headers)), num_to_remove)
                rows = [[val for i, val in enumerate(row) if i not in cols_to_remove] for row in rows]
                self.corruptions_applied.append(f'Removed {num_to_remove} columns')
        
        if preset == 'invalid_data_types':
            for row in data_rows:
                for i in range(len(row)):
                    if random.random() < 0.1 * self.corruption_level:
                        row[i] = 'INVALID_TEXT_' + str(random.randint(1000, 9999))
            self.corruptions_applied.append('Corrupted data types in random cells')
        
        if preset == 'empty_required_fields':
            for row in data_rows:
                for i in range(min(3, len(row))):
                    if random.random() < 0.2 * self.corruption_level:
                        row[i] = ''
            self.corruptions_applied.append('Emptied required fields')
        
        if preset == 'duplicate_rows':
            num_duplicates = min(len(data_rows), self.corruption_level * 2)
            for _ in range(num_duplicates):
                if data_rows:
                    rows.append(random.choice(data_rows).copy())
            self.corruptions_applied.append(f'Duplicated {num_duplicates} rows')
        
        if preset == 'invalid_dates':
            date_patterns = ['99/99/9999', '2024-13-45', 'INVALID_DATE', '00-00-0000']
            for row in data_rows:
                for i in range(len(row)):
                    if 'date' in headers[i].lower() if i < len(headers) else False:
                        if random.random() < 0.3:
                            row[i] = random.choice(date_patterns)
            self.corruptions_applied.append('Corrupted date formats')
        
        if preset == 'special_characters':
            special_chars = ['@#$%', '™®©', '§¶†', '←→↑↓', '♠♣♥♦']
            for row in data_rows:
                for i in range(len(row)):
                    if random.random() < 0.05 * self.corruption_level:
                        row[i] = random.choice(special_chars) + row[i]
            self.corruptions_applied.append('Injected special characters')
        
        if preset == 'encoding_issues':
            for row in data_rows:
                for i in range(len(row)):
                    if random.random() < 0.1:
                        row[i] = row[i].encode('utf-8', errors='ignore').decode('latin-1', errors='ignore')
            self.corruptions_applied.append('Broke UTF-8 encoding')
        
        if preset == 'line_breaks':
            for row in data_rows:
                for i in range(len(row)):
                    if random.random() < 0.05 * self.corruption_level:
                        row[i] = row[i] + '\n' + 'UNEXPECTED_LINE_BREAK'
            self.corruptions_applied.append('Added random line breaks')
        
        # Write corrupted CSV
        delimiter = ';' if preset == 'wrong_delimiter' else ','
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, delimiter=delimiter)
            writer.writerows(rows)
        
        return {
            'success': True,
            'outputPath': output_path,
            'corruptionsApplied': self.corruptions_applied
        }
    
    def _build_parent_map(self, root):
        """Build a map of child -> parent for element removal"""
        return {c: p for p in root.iter() for c in p}
    
    def _get_namespace(self, root):
        """Extract namespace from root element"""
        match = re.match(r'\{.*\}', root.tag)
        return match.group(0) if match else ''
    
    def _local_name(self, tag):
        """Get local name from a namespaced tag"""
        if '}' in tag:
            return tag.split('}', 1)[1]
        return tag
    
    def _find_all_by_local_name(self, root, local_name):
        """Find all elements matching a local name, regardless of namespace"""
        return [elem for elem in root.iter() if self._local_name(elem.tag) == local_name]
    
    def _remove_required_fields(self, root, ns, options):
        """Remove required fields from XML"""
        parent_map = self._build_parent_map(root)
        field_map = {
            'docRefId': 'DocRefId',
            'messageRefId': 'MessageRefId',
            'tin': 'TIN',
            'name': 'Name',
            'address': 'Address',
            'giin': 'GIIN',
            'accountNumber': 'AccountNumber',
            'filerCategory': 'FilerCategory'
        }
        
        for field, local_name in field_map.items():
            if options.get(field, True):
                elements = self._find_all_by_local_name(root, local_name)
                removed_count = 0
                for elem in elements:
                    if random.random() < 0.3 * self.corruption_level:
                        parent = parent_map.get(elem)
                        if parent is not None:
                            try:
                                parent.remove(elem)
                                removed_count += 1
                            except:
                                pass
                if removed_count > 0:
                    self.corruptions_applied.append(f'Removed {removed_count} {local_name} elements')
    
    def _corrupt_dates(self, root, ns, options):
        """Corrupt date fields"""
        date_fields = ['ReportingPeriod', 'BirthDate', 'Timestamp']
        invalid_dates = ['9999-99-99', '2024-13-45', 'INVALID', '00-00-0000', '2024/13/32']
        
        for field in date_fields:
            if options.get(field.lower(), True):
                elements = self._find_all_by_local_name(root, field)
                for elem in elements:
                    if random.random() < 0.5 * self.corruption_level:
                        elem.text = random.choice(invalid_dates)
                        self.corruptions_applied.append(f'Corrupted {field}: {elem.text}')
    
    def _corrupt_country_codes(self, root, ns, options):
        """Corrupt country codes"""
        country_fields = ['ResCountryCode', 'SendingCountry', 'ReceivingCountry', 'TransmittingCountry', 'CountryCode']
        invalid_codes = ['XX', 'ZZ', '99', 'ABC', 'INVALID', '']
        
        for field in country_fields:
            if options.get(field.lower(), True):
                elements = self._find_all_by_local_name(root, field)
                for elem in elements:
                    if random.random() < 0.4 * self.corruption_level:
                        elem.text = random.choice(invalid_codes)
                        self.corruptions_applied.append(f'Corrupted {field}: {elem.text}')
    
    def _corrupt_amounts(self, root, ns, options):
        """Corrupt monetary amounts"""
        amount_fields = ['AccountBalance', 'Payment', 'Amount']
        
        for field in amount_fields:
            if options.get(field.lower(), True):
                elements = self._find_all_by_local_name(root, field)
                for elem in elements:
                    if random.random() < 0.3 * self.corruption_level:
                        corruption_type = random.choice(['negative', 'invalid', 'huge', 'text'])
                        if corruption_type == 'negative':
                            elem.text = '-999999.99'
                        elif corruption_type == 'invalid':
                            elem.text = 'INVALID_AMOUNT'
                        elif corruption_type == 'huge':
                            elem.text = '999999999999999.99'
                        elif corruption_type == 'text':
                            elem.text = 'NOT_A_NUMBER'
                        self.corruptions_applied.append(f'Corrupted {field}: {elem.text}')
    
    def _duplicate_docrefids(self, root, ns, options):
        """Create duplicate DocRefIds"""
        docrefids = self._find_all_by_local_name(root, 'DocRefId')
        if docrefids and len(docrefids) > 1:
            duplicate_value = docrefids[0].text
            num_to_duplicate = min(len(docrefids) - 1, self.corruption_level * 2)
            for i in range(1, num_to_duplicate + 1):
                if i < len(docrefids):
                    docrefids[i].text = duplicate_value
            self.corruptions_applied.append(f'Created {num_to_duplicate} duplicate DocRefIds')
    
    def _corrupt_message_types(self, root, ns, options):
        """Corrupt message type indicators"""
        if options.get('messageTypeIndic', True):
            elements = self._find_all_by_local_name(root, 'MessageTypeIndic')
            invalid_types = ['CRS999', 'INVALID', 'CRS000', 'FATCA999']
            for elem in elements:
                elem.text = random.choice(invalid_types)
                self.corruptions_applied.append(f'Corrupted MessageTypeIndic: {elem.text}')
        
        if options.get('docTypeIndic', True):
            elements = self._find_all_by_local_name(root, 'DocTypeIndic')
            invalid_types = ['OECD99', 'INVALID', 'FATCA99', 'OECD0']
            for elem in elements:
                elem.text = random.choice(invalid_types)
                self.corruptions_applied.append(f'Corrupted DocTypeIndic: {elem.text}')
    
    def _malform_xml(self, root, ns, options):
        """Break XML structure"""
        if options.get('unclosedTags', False):
            # Add text that looks like unclosed tags
            elements = list(root.iter())
            if elements:
                elem = random.choice(elements)
                if elem.text:
                    elem.text = elem.text + '<UnclosedTag>'
                    self.corruptions_applied.append('Added unclosed tag')
        
        if options.get('invalidChars', True):
            elements = list(root.iter())
            for elem in elements[:min(5, len(elements))]:
                if elem.text and random.random() < 0.3:
                    elem.text = elem.text + chr(0x00) + chr(0x1F)
                    self.corruptions_applied.append('Added invalid XML characters')
        
        if options.get('brokenNamespaces', False):
            # Change namespace prefix
            for elem in root.iter():
                if random.random() < 0.1:
                    elem.tag = elem.tag.replace(ns, '{http://invalid.namespace}')
            self.corruptions_applied.append('Broke XML namespaces')
    
    def _corrupt_tin_formats(self, root, ns, options):
        """Corrupt TIN/GIIN formats"""
        tin_elements = self._find_all_by_local_name(root, 'TIN') + self._find_all_by_local_name(root, 'IN')
        invalid_formats = ['INVALID', '123', '99999999999999999', 'ABC-DEF-GHI', '']
        
        for elem in tin_elements:
            if random.random() < 0.4 * self.corruption_level:
                elem.text = random.choice(invalid_formats)
                self.corruptions_applied.append(f'Corrupted TIN format: {elem.text}')
    
    def _corrupt_giin_formats(self, root, ns, options):
        """Corrupt GIIN formats (FATCA) - also targets TIN elements used as GIINs"""
        giin_elements = self._find_all_by_local_name(root, 'GIIN') + self._find_all_by_local_name(root, 'TIN')
        invalid_formats = ['INVALID', '123456', 'ABCDEF.GHIJK.LM.NOP', '......', '']
        
        for elem in giin_elements:
            if random.random() < 0.5 * self.corruption_level:
                elem.text = random.choice(invalid_formats)
                self.corruptions_applied.append(f'Corrupted GIIN/TIN format: {elem.text}')
    
    def _corrupt_filer_category(self, root, ns, options):
        """Corrupt FATCA filer category"""
        elements = self._find_all_by_local_name(root, 'FilerCategory')
        invalid_codes = ['FATCA999', 'FATCA000', 'INVALID', 'FATCA700']
        
        for elem in elements:
            elem.text = random.choice(invalid_codes)
            self.corruptions_applied.append(f'Corrupted FilerCategory: {elem.text}')
    
    def _corrupt_account_types(self, root, ns, options):
        """Corrupt FATCA account holder types"""
        elements = self._find_all_by_local_name(root, 'AcctHolderType') + self._find_all_by_local_name(root, 'AccountHolderType')
        invalid_codes = ['FATCA999', 'FATCA000', 'INVALID']
        
        for elem in elements:
            elem.text = random.choice(invalid_codes)
            self.corruptions_applied.append(f'Corrupted AcctHolderType: {elem.text}')
    
    def _corrupt_payment_types(self, root, ns, options):
        """Corrupt FATCA payment types"""
        elements = self._find_all_by_local_name(root, 'PaymentType') + self._find_all_by_local_name(root, 'Type')
        invalid_codes = ['FATCA999', 'FATCA500', 'INVALID']
        
        for elem in elements:
            elem.text = random.choice(invalid_codes)
            self.corruptions_applied.append(f'Corrupted PaymentType: {elem.text}')
    
    def _create_us_indicia_errors(self, root, ns, options):
        """Create US indicia conflicts"""
        parent_map = self._build_parent_map(root)
        # Remove SubstantialOwner when US person exists
        if options.get('missingSubstantialOwner', True):
            substantial_owners = self._find_all_by_local_name(root, 'SubstantialOwner')
            for owner in substantial_owners[:max(1, len(substantial_owners) // 2)]:
                parent = parent_map.get(owner)
                if parent is not None:
                    try:
                        parent.remove(owner)
                        self.corruptions_applied.append('Removed SubstantialOwner')
                    except:
                        pass
    
    def _corrupt_revenues(self, root, ns, options):
        """Corrupt CBC revenue amounts"""
        revenue_fields = ['Revenues', 'ProfitLoss', 'TaxPaid', 'TaxAccrued', 'Capital', 'Earnings', 'NbEmployees']
        
        for field in revenue_fields:
            if options.get(field.lower(), True):
                elements = self._find_all_by_local_name(root, field)
                for elem in elements:
                    if random.random() < 0.4:
                        corruption = random.choice(['negative', 'invalid', 'huge'])
                        if corruption == 'negative':
                            elem.text = '-999999999'
                        elif corruption == 'invalid':
                            elem.text = 'INVALID'
                        else:
                            elem.text = '999999999999999'
                        self.corruptions_applied.append(f'Corrupted {field}: {elem.text}')
    
    def _corrupt_entity_types(self, root, ns, options):
        """Corrupt CBC entity types"""
        elements = self._find_all_by_local_name(root, 'EntityType') + self._find_all_by_local_name(root, 'BizActivities')
        invalid_types = ['INVALID', 'CBC999', 'UNKNOWN']
        
        for elem in elements:
            elem.text = random.choice(invalid_types)
            self.corruptions_applied.append(f'Corrupted EntityType: {elem.text}')
    
    def _remove_cbc_reports(self, root, ns, options):
        """Remove CBC report sections"""
        parent_map = self._build_parent_map(root)
        if options.get('cbcReports', True):
            reports = self._find_all_by_local_name(root, 'CbcReports')
            for report in reports[:max(1, len(reports) // 2)]:
                parent = parent_map.get(report)
                if parent is not None:
                    try:
                        parent.remove(report)
                        self.corruptions_applied.append('Removed CbcReports section')
                    except:
                        pass
    
    def _corrupt_cbc_message_type(self, root, ns, options):
        """Corrupt CBC message type"""
        elements = self._find_all_by_local_name(root, 'MessageTypeIndic')
        invalid_types = ['CBC999', 'INVALID', 'CBC000']
        
        for elem in elements:
            elem.text = random.choice(invalid_types)
            self.corruptions_applied.append(f'Corrupted CBC MessageTypeIndic: {elem.text}')
    
    def _duplicate_entities(self, root, ns, options):
        """Duplicate entity names in CBC"""
        entities = self._find_all_by_local_name(root, 'ConstituentEntity')
        if len(entities) > 1:
            names_in_first = [e for e in entities[0].iter() if self._local_name(e.tag) == 'Name']
            first_name = names_in_first[0] if names_in_first else None
            if first_name is not None:
                for entity in entities[1:self.corruption_level + 1]:
                    entity_names = [e for e in entity.iter() if self._local_name(e.tag) == 'Name']
                    name_elem = entity_names[0] if entity_names else None
                    if name_elem is not None:
                        name_elem.text = first_name.text
                self.corruptions_applied.append('Created duplicate entity names')
    
    def _apply_corruption_intensity(self, root, ns):
        """Apply additional random corruptions based on intensity level"""
        if self.corruption_level >= 4:
            # Add random empty elements
            elements = list(root.iter())
            for elem in random.sample(elements, min(5, len(elements))):
                if elem.text:
                    elem.text = ''
            self.corruptions_applied.append('Emptied random elements (high intensity)')
        
        if self.corruption_level == 5:
            # Add completely invalid elements
            for _ in range(3):
                invalid_elem = ET.SubElement(root, 'InvalidElement')
                invalid_elem.text = 'THIS_SHOULD_NOT_BE_HERE'
            self.corruptions_applied.append('Added invalid elements (fatal intensity)')


def main():
    """CLI interface for error injector"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Inject errors into XML/CSV files')
    parser.add_argument('--input', required=True, help='Input file path')
    parser.add_argument('--output', required=True, help='Output file path')
    parser.add_argument('--module', required=True, choices=['crs', 'fatca', 'cbc'], help='Module type')
    parser.add_argument('--file-type', required=True, choices=['xml', 'csv'], help='File type')
    parser.add_argument('--preset', required=True, help='Corruption preset ID')
    parser.add_argument('--level', type=int, default=3, help='Corruption level (1-5)')
    parser.add_argument('--options', help='JSON string of options')
    
    args = parser.parse_args()
    
    options = {}
    if args.options:
        try:
            options = json.loads(args.options)
        except json.JSONDecodeError:
            # If JSON parsing fails, try to use empty options
            options = {}
    
    injector = ErrorInjector(args.module, args.file_type, args.level)
    result = injector.corrupt_file(args.input, args.output, args.preset, options)
    
    print(json.dumps(result))


if __name__ == '__main__':
    main()
