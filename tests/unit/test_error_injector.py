import random
import xml.etree.ElementTree as ET

from crs_generator.error_injector import ErrorInjector


def _write_xml(tmp_path, name, body):
    path = tmp_path / name
    path.write_text(f'<?xml version="1.0" encoding="utf-8"?><Root>{body}</Root>', encoding='utf-8')
    return path


def test_fatca_account_holder_type_preset_targets_combined_format(tmp_path):
    source = _write_xml(
        tmp_path,
        'fatca.xml',
        '<AccountHolder><Organisation/><AcctHolderTypeCRS>CRS101</AcctHolderTypeCRS>'
        '<AcctHolderTypeFATCA>FATCA104</AcctHolderTypeFATCA></AccountHolder>',
    )
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('fatca', 'xml', 3).corrupt_file(
        str(source), str(output), 'invalid_account_types', {}
    )

    assert result['success'] is True
    values = [elem.text for elem in ET.parse(output).getroot().iter() if elem.tag.endswith('AcctHolderTypeFATCA')]
    assert values and values[0] not in {'FATCA101', 'FATCA102', 'FATCA103', 'FATCA104', 'FATCA105', 'FATCA106'}


def test_us_indicia_preset_creates_be_informed_90023_conflict(tmp_path):
    source = _write_xml(
        tmp_path,
        'fatca.xml',
        '<AccountHolder><Organisation><ResCountryCode>US</ResCountryCode></Organisation>'
        '<AcctHolderTypeFATCA>FATCA104</AcctHolderTypeFATCA></AccountHolder>',
    )
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('fatca', 'xml', 3).corrupt_file(
        str(source), str(output), 'us_indicia_errors', {}
    )

    assert result['success'] is True
    assert 'AcctHolderTypeFATCA' not in output.read_text(encoding='utf-8')
    assert '90023' in result['corruptionsApplied'][0]


def test_cbc_duplicate_entity_preset_targets_const_entity(tmp_path):
    source = _write_xml(
        tmp_path,
        'cbc.xml',
        '<ConstEntities><ConstEntity><Name>First Ltd</Name></ConstEntity>'
        '<ConstEntity><Name>Second Ltd</Name></ConstEntity></ConstEntities>',
    )
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('cbc', 'xml', 3).corrupt_file(
        str(source), str(output), 'duplicate_entities', {}
    )

    assert result['success'] is True
    names = [elem.text for elem in ET.parse(output).getroot().iter() if elem.tag.endswith('Name')]
    assert names == ['First Ltd', 'First Ltd']


def test_inapplicable_preset_reports_failure_instead_of_false_success(tmp_path):
    source = _write_xml(tmp_path, 'fatca.xml', '<AccountHolder><Individual/></AccountHolder>')
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('fatca', 'xml', 3).corrupt_file(
        str(source), str(output), 'invalid_account_types', {}
    )

    assert result['success'] is False
    assert 'no matching XML elements were changed' in result['error']
    assert not output.exists()


def test_unknown_module_preset_is_rejected(tmp_path):
    source = _write_xml(tmp_path, 'crs.xml', '<TIN>123</TIN>')

    result = ErrorInjector('crs', 'xml', 3).corrupt_file(
        str(source), str(tmp_path / 'corrupt.xml'), 'invalid_giin', {}
    )

    assert result['success'] is False
    assert 'Unsupported XML preset' in result['error']


def test_unclosed_tag_option_produces_non_well_formed_xml(tmp_path):
    random.seed(1)
    source = _write_xml(tmp_path, 'crs.xml', '<TIN>123</TIN>')
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('crs', 'xml', 3).corrupt_file(
        str(source), str(output), 'malformed_xml',
        {'unclosedTags': True, 'invalidChars': False, 'brokenNamespaces': False},
    )

    assert result['success'] is True
    try:
        ET.parse(output)
    except ET.ParseError:
        pass
    else:
        raise AssertionError('Malformed XML preset produced well-formed XML')


def test_malformed_xml_default_options_always_changes_text(tmp_path):
    source = _write_xml(
        tmp_path,
        'crs.xml',
        '<CRS_OECD><MessageSpec><MessageRefId>MSG-1</MessageRefId></MessageSpec></CRS_OECD>',
    )
    output = tmp_path / 'corrupt.xml'

    result = ErrorInjector('crs', 'xml', 3).corrupt_file(
        str(source), str(output), 'malformed_xml', {}
    )

    assert result['success'] is True
    assert output.exists()
    assert 'Added invalid XML characters' in result['corruptionsApplied']
