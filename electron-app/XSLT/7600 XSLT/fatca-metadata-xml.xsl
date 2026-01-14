<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:html="http://www.w3.org/1999/xhtml"  xmlns:bi="http://www.be-informed.nl/BeInformed" xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" xmlns:cmf="http://www.be-informed.nl/BeInformed/CMF" xmlns:case="http://www.be-informed.nl/BeInformed/Case" xmlns:form="http://www.be-informed.nl/BeInformed/Form" xmlns:report="http://www.be-informed.nl/BeInformed/Report" xmlns:search="http://www.be-informed.nl/BeInformed/Search" xmlns:assistant="http://www.be-informed.nl/BeInformed/Assistant" xmlns:today="http://www.be-informed.nl/BeInformed/Today" xmlns:dataeditor="http://www.be-informed.nl/BeInformed/DataEditor" xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" xmlns:usermanagement="http://www.be-informed.nl/BeInformed/UserManagement" xmlns:subscriptionmanagement="http://www.be-informed.nl/BeInformed/SubscriptionManagement" xmlns:organisationmanagement="http://www.be-informed.nl/BeInformed/OrganisationManagement" xmlns:serviceapplication="http://www.be-informed.nl/BeInformed/ServiceApplication" xmlns:met="urn:fatca:idessenderfilemetadata" xmlns:iso="urn:oecd:ties:isoctstypes:v1" exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication html iso">
    
	
	
	
	<xsl:template match="/">
	<met:FATCAIDESSenderFileMetadata>
		<met:FATCAEntitySenderId><xsl:value-of select="//attributes:readonly-attribute[attributes:id='CTSSenderCountryCd']/attributes:value"/></met:FATCAEntitySenderId>
		<met:FATCAEntityReceiverId><xsl:value-of select="//attributes:readonly-attribute[attributes:id='CTSReceiverCountryCd']/attributes:value"/></met:FATCAEntityReceiverId>
		<met:FATCAEntCommunicationTypeCd>RPT</met:FATCAEntCommunicationTypeCd>
		<met:SenderFileId><xsl:value-of select="//attributes:readonly-attribute[attributes:id='SenderFileId']/attributes:value"/></met:SenderFileId>
		<met:FileFormatCd><xsl:value-of select="//attributes:readonly-attribute[attributes:id='FileFormatCd']/attributes:value"/></met:FileFormatCd>
		<met:BinaryEncodingSchemeCd><xsl:value-of select="//attributes:readonly-attribute[attributes:id='BinaryEncodingSchemeCd']/attributes:value"/></met:BinaryEncodingSchemeCd>
		<met:FileCreateTs><xsl:value-of select="//attributes:readonly-attribute[attributes:id='FileCreateTs']/attributes:value"/></met:FileCreateTs>
		<met:TaxYear><xsl:value-of select="//attributes:readonly-attribute[attributes:id='TaxYear']/attributes:value"/></met:TaxYear>
		<met:FileRevisionInd><xsl:value-of select="//attributes:readonly-attribute[attributes:id='FileRevisionInd']/attributes:value"/></met:FileRevisionInd>
	</met:FATCAIDESSenderFileMetadata>
	</xsl:template>
</xsl:stylesheet>