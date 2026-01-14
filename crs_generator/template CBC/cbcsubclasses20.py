#!/usr/bin/env python

#
# Generated Wed Dec  2 15:00:07 2020 by generateDS.py version 2.35.17.
# Python 3.8.2 (tags/v3.8.2:7b3ab59, Feb 25 2020, 22:45:29) [MSC v.1916 32 bit (Intel)]
#
# Command line options:
#   ('-o', 'cbcclasses.py')
#   ('-s', 'cbcsubclasses.py')
#
# Command line arguments:
#   C:\Users\giovanni.kromosemito\Downloads\cbcgenerator20\xsd\CbcXML_v2.0.xsd
#
# Command line:
#   C:\Users\giovanni.kromosemito\Downloads\generateDS-2.35.17\generateDS-2.35.17\generateDS.py -o "cbcclasses.py" -s "cbcsubclasses.py" C:\Users\giovanni.kromosemito\Downloads\cbcgenerator20\xsd\CbcXML_v2.0.xsd
#
# Current working directory (os.getcwd()):
#   classes
#

import os
import sys
from lxml import etree as etree_

import ??? as supermod

def parsexml_(infile, parser=None, **kwargs):
    if parser is None:
        # Use the lxml ElementTree compatible parser so that, e.g.,
        #   we ignore comments.
        parser = etree_.ETCompatXMLParser()
    try:
        if isinstance(infile, os.PathLike):
            infile = os.path.join(infile)
    except AttributeError:
        pass
    doc = etree_.parse(infile, parser=parser, **kwargs)
    return doc

def parsexmlstring_(instring, parser=None, **kwargs):
    if parser is None:
        # Use the lxml ElementTree compatible parser so that, e.g.,
        #   we ignore comments.
        try:
            parser = etree_.ETCompatXMLParser()
        except AttributeError:
            # fallback to xml.etree
            parser = etree_.XMLParser()
    element = etree_.fromstring(instring, parser=parser, **kwargs)
    return element

#
# Globals
#

ExternalEncoding = ''
SaveElementTreeNode = True

#
# Data representation classes
#


class AddressFix_TypeSub(supermod.AddressFix_Type):
    def __init__(self, Street=None, BuildingIdentifier=None, SuiteIdentifier=None, FloorIdentifier=None, DistrictName=None, POB=None, PostCode=None, City=None, CountrySubentity=None, **kwargs_):
        super(AddressFix_TypeSub, self).__init__(Street, BuildingIdentifier, SuiteIdentifier, FloorIdentifier, DistrictName, POB, PostCode, City, CountrySubentity,  **kwargs_)
supermod.AddressFix_Type.subclass = AddressFix_TypeSub
# end class AddressFix_TypeSub


class Address_TypeSub(supermod.Address_Type):
    def __init__(self, legalAddressType=None, CountryCode=None, AddressFix=None, AddressFree=None, **kwargs_):
        super(Address_TypeSub, self).__init__(legalAddressType, CountryCode, AddressFix, AddressFree,  **kwargs_)
supermod.Address_Type.subclass = Address_TypeSub
# end class Address_TypeSub


class MonAmnt_TypeSub(supermod.MonAmnt_Type):
    def __init__(self, currCode=None, valueOf_=None, **kwargs_):
        super(MonAmnt_TypeSub, self).__init__(currCode, valueOf_,  **kwargs_)
supermod.MonAmnt_Type.subclass = MonAmnt_TypeSub
# end class MonAmnt_TypeSub


class NameOrganisation_TypeSub(supermod.NameOrganisation_Type):
    def __init__(self, valueOf_=None, **kwargs_):
        super(NameOrganisation_TypeSub, self).__init__(valueOf_,  **kwargs_)
supermod.NameOrganisation_Type.subclass = NameOrganisation_TypeSub
# end class NameOrganisation_TypeSub


class TIN_TypeSub(supermod.TIN_Type):
    def __init__(self, issuedBy=None, valueOf_=None, **kwargs_):
        super(TIN_TypeSub, self).__init__(issuedBy, valueOf_,  **kwargs_)
supermod.TIN_Type.subclass = TIN_TypeSub
# end class TIN_TypeSub


class MessageSpec_TypeSub(supermod.MessageSpec_Type):
    def __init__(self, SendingEntityIN=None, TransmittingCountry=None, ReceivingCountry=None, MessageType=None, Language=None, Warning=None, Contact=None, MessageRefId=None, MessageTypeIndic=None, CorrMessageRefId=None, ReportingPeriod=None, Timestamp=None, **kwargs_):
        super(MessageSpec_TypeSub, self).__init__(SendingEntityIN, TransmittingCountry, ReceivingCountry, MessageType, Language, Warning, Contact, MessageRefId, MessageTypeIndic, CorrMessageRefId, ReportingPeriod, Timestamp,  **kwargs_)
supermod.MessageSpec_Type.subclass = MessageSpec_TypeSub
# end class MessageSpec_TypeSub


class ConstituentEntity_TypeSub(supermod.ConstituentEntity_Type):
    def __init__(self, ConstEntity=None, Role=None, IncorpCountryCode=None, BizActivities=None, OtherEntityInfo=None, **kwargs_):
        super(ConstituentEntity_TypeSub, self).__init__(ConstEntity, Role, IncorpCountryCode, BizActivities, OtherEntityInfo,  **kwargs_)
supermod.ConstituentEntity_Type.subclass = ConstituentEntity_TypeSub
# end class ConstituentEntity_TypeSub


class CorrectableCbcReport_TypeSub(supermod.CorrectableCbcReport_Type):
    def __init__(self, DocSpec=None, ResCountryCode=None, Summary=None, ConstEntities=None, **kwargs_):
        super(CorrectableCbcReport_TypeSub, self).__init__(DocSpec, ResCountryCode, Summary, ConstEntities,  **kwargs_)
supermod.CorrectableCbcReport_Type.subclass = CorrectableCbcReport_TypeSub
# end class CorrectableCbcReport_TypeSub


class OrganisationIN_TypeSub(supermod.OrganisationIN_Type):
    def __init__(self, issuedBy=None, INType=None, valueOf_=None, **kwargs_):
        super(OrganisationIN_TypeSub, self).__init__(issuedBy, INType, valueOf_,  **kwargs_)
supermod.OrganisationIN_Type.subclass = OrganisationIN_TypeSub
# end class OrganisationIN_TypeSub


class OrganisationParty_TypeSub(supermod.OrganisationParty_Type):
    def __init__(self, ResCountryCode=None, TIN=None, IN=None, Name=None, Address=None, **kwargs_):
        super(OrganisationParty_TypeSub, self).__init__(ResCountryCode, TIN, IN, Name, Address,  **kwargs_)
supermod.OrganisationParty_Type.subclass = OrganisationParty_TypeSub
# end class OrganisationParty_TypeSub


class ReportingEntity_TypeSub(supermod.ReportingEntity_Type):
    def __init__(self, Entity=None, NameMNEGroup=None, ReportingRole=None, ReportingPeriod=None, extensiontype_=None, **kwargs_):
        super(ReportingEntity_TypeSub, self).__init__(Entity, NameMNEGroup, ReportingRole, ReportingPeriod, extensiontype_,  **kwargs_)
supermod.ReportingEntity_Type.subclass = ReportingEntity_TypeSub
# end class ReportingEntity_TypeSub


class CorrectableReportingEntity_TypeSub(supermod.CorrectableReportingEntity_Type):
    def __init__(self, Entity=None, NameMNEGroup=None, ReportingRole=None, ReportingPeriod=None, DocSpec=None, **kwargs_):
        super(CorrectableReportingEntity_TypeSub, self).__init__(Entity, NameMNEGroup, ReportingRole, ReportingPeriod, DocSpec,  **kwargs_)
supermod.CorrectableReportingEntity_Type.subclass = CorrectableReportingEntity_TypeSub
# end class CorrectableReportingEntity_TypeSub


class CorrectableAdditionalInfo_TypeSub(supermod.CorrectableAdditionalInfo_Type):
    def __init__(self, DocSpec=None, OtherInfo=None, ResCountryCode=None, SummaryRef=None, **kwargs_):
        super(CorrectableAdditionalInfo_TypeSub, self).__init__(DocSpec, OtherInfo, ResCountryCode, SummaryRef,  **kwargs_)
supermod.CorrectableAdditionalInfo_Type.subclass = CorrectableAdditionalInfo_TypeSub
# end class CorrectableAdditionalInfo_TypeSub


class CbcBody_TypeSub(supermod.CbcBody_Type):
    def __init__(self, ReportingEntity=None, CbcReports=None, AdditionalInfo=None, **kwargs_):
        super(CbcBody_TypeSub, self).__init__(ReportingEntity, CbcReports, AdditionalInfo,  **kwargs_)
supermod.CbcBody_Type.subclass = CbcBody_TypeSub
# end class CbcBody_TypeSub


class CBC_OECDSub(supermod.CBC_OECD):
    def __init__(self, version=None, MessageSpec=None, CbcBody=None, **kwargs_):
        super(CBC_OECDSub, self).__init__(version, MessageSpec, CbcBody,  **kwargs_)
supermod.CBC_OECD.subclass = CBC_OECDSub
# end class CBC_OECDSub


class StringMin1Max4000WithLang_TypeSub(supermod.StringMin1Max4000WithLang_Type):
    def __init__(self, language=None, valueOf_=None, **kwargs_):
        super(StringMin1Max4000WithLang_TypeSub, self).__init__(language, valueOf_,  **kwargs_)
supermod.StringMin1Max4000WithLang_Type.subclass = StringMin1Max4000WithLang_TypeSub
# end class StringMin1Max4000WithLang_TypeSub


class DocSpec_TypeSub(supermod.DocSpec_Type):
    def __init__(self, DocTypeIndic=None, DocRefId=None, CorrMessageRefId=None, CorrDocRefId=None, **kwargs_):
        super(DocSpec_TypeSub, self).__init__(DocTypeIndic, DocRefId, CorrMessageRefId, CorrDocRefId,  **kwargs_)
supermod.DocSpec_Type.subclass = DocSpec_TypeSub
# end class DocSpec_TypeSub


class SummaryTypeSub(supermod.SummaryType):
    def __init__(self, Revenues=None, ProfitOrLoss=None, TaxPaid=None, TaxAccrued=None, Capital=None, Earnings=None, NbEmployees=None, Assets=None, **kwargs_):
        super(SummaryTypeSub, self).__init__(Revenues, ProfitOrLoss, TaxPaid, TaxAccrued, Capital, Earnings, NbEmployees, Assets,  **kwargs_)
supermod.SummaryType.subclass = SummaryTypeSub
# end class SummaryTypeSub


class RevenuesTypeSub(supermod.RevenuesType):
    def __init__(self, Unrelated=None, Related=None, Total=None, **kwargs_):
        super(RevenuesTypeSub, self).__init__(Unrelated, Related, Total,  **kwargs_)
supermod.RevenuesType.subclass = RevenuesTypeSub
# end class RevenuesTypeSub


class ReportingPeriodTypeSub(supermod.ReportingPeriodType):
    def __init__(self, StartDate=None, EndDate=None, **kwargs_):
        super(ReportingPeriodTypeSub, self).__init__(StartDate, EndDate,  **kwargs_)
supermod.ReportingPeriodType.subclass = ReportingPeriodTypeSub
# end class ReportingPeriodTypeSub


def get_root_tag(node):
    tag = supermod.Tag_pattern_.match(node.tag).groups()[-1]
    rootClass = None
    rootClass = supermod.GDSClassesMapping.get(tag)
    if rootClass is None and hasattr(supermod, tag):
        rootClass = getattr(supermod, tag)
    return tag, rootClass


def parse(inFilename, silence=False):
    parser = None
    doc = parsexml_(inFilename, parser)
    rootNode = doc.getroot()
    rootTag, rootClass = get_root_tag(rootNode)
    if rootClass is None:
        rootTag = 'AddressFix_Type'
        rootClass = supermod.AddressFix_Type
    rootObj = rootClass.factory()
    rootObj.build(rootNode)
    # Enable Python to collect the space used by the DOM.
    if not SaveElementTreeNode:
        doc = None
        rootNode = None
    if not silence:
        sys.stdout.write('<?xml version="1.0" ?>\n')
        rootObj.export(
            sys.stdout, 0, name_=rootTag,
            namespacedef_='xmlns:cbc="urn:oecd:ties:cbc:v2"',
            pretty_print=True)
    return rootObj


def parseEtree(inFilename, silence=False):
    parser = None
    doc = parsexml_(inFilename, parser)
    rootNode = doc.getroot()
    rootTag, rootClass = get_root_tag(rootNode)
    if rootClass is None:
        rootTag = 'AddressFix_Type'
        rootClass = supermod.AddressFix_Type
    rootObj = rootClass.factory()
    rootObj.build(rootNode)
    mapping = {}
    rootElement = rootObj.to_etree(None, name_=rootTag, mapping_=mapping)
    reverse_mapping = rootObj.gds_reverse_node_mapping(mapping)
    # Enable Python to collect the space used by the DOM.
    if not SaveElementTreeNode:
        doc = None
        rootNode = None
    if not silence:
        content = etree_.tostring(
            rootElement, pretty_print=True,
            xml_declaration=True, encoding="utf-8")
        sys.stdout.write(content)
        sys.stdout.write('\n')
    return rootObj, rootElement, mapping, reverse_mapping


def parseString(inString, silence=False):
    if sys.version_info.major == 2:
        from StringIO import StringIO
    else:
        from io import BytesIO as StringIO
    parser = None
    rootNode= parsexmlstring_(inString, parser)
    rootTag, rootClass = get_root_tag(rootNode)
    if rootClass is None:
        rootTag = 'AddressFix_Type'
        rootClass = supermod.AddressFix_Type
    rootObj = rootClass.factory()
    rootObj.build(rootNode)
    # Enable Python to collect the space used by the DOM.
    if not SaveElementTreeNode:
        rootNode = None
    if not silence:
        sys.stdout.write('<?xml version="1.0" ?>\n')
        rootObj.export(
            sys.stdout, 0, name_=rootTag,
            namespacedef_='xmlns:cbc="urn:oecd:ties:cbc:v2"')
    return rootObj


def parseLiteral(inFilename, silence=False):
    parser = None
    doc = parsexml_(inFilename, parser)
    rootNode = doc.getroot()
    rootTag, rootClass = get_root_tag(rootNode)
    if rootClass is None:
        rootTag = 'AddressFix_Type'
        rootClass = supermod.AddressFix_Type
    rootObj = rootClass.factory()
    rootObj.build(rootNode)
    # Enable Python to collect the space used by the DOM.
    if not SaveElementTreeNode:
        doc = None
        rootNode = None
    if not silence:
        sys.stdout.write('#from ??? import *\n\n')
        sys.stdout.write('import ??? as model_\n\n')
        sys.stdout.write('rootObj = model_.rootClass(\n')
        rootObj.exportLiteral(sys.stdout, 0, name_=rootTag)
        sys.stdout.write(')\n')
    return rootObj


USAGE_TEXT = """
Usage: python ???.py <infilename>
"""


def usage():
    print(USAGE_TEXT)
    sys.exit(1)


def main():
    args = sys.argv[1:]
    if len(args) != 1:
        usage()
    infilename = args[0]
    parse(infilename)


if __name__ == '__main__':
    #import pdb; pdb.set_trace()
    main()
