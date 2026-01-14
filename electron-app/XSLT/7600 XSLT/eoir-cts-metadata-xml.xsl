<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:html="http://www.w3.org/1999/xhtml"  xmlns:bi="http://www.be-informed.nl/BeInformed" xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" xmlns:cmf="http://www.be-informed.nl/BeInformed/CMF" xmlns:case="http://www.be-informed.nl/BeInformed/Case" xmlns:form="http://www.be-informed.nl/BeInformed/Form" xmlns:report="http://www.be-informed.nl/BeInformed/Report" xmlns:search="http://www.be-informed.nl/BeInformed/Search" xmlns:assistant="http://www.be-informed.nl/BeInformed/Assistant" xmlns:today="http://www.be-informed.nl/BeInformed/Today" xmlns:dataeditor="http://www.be-informed.nl/BeInformed/DataEditor" xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" xmlns:usermanagement="http://www.be-informed.nl/BeInformed/UserManagement" xmlns:subscriptionmanagement="http://www.be-informed.nl/BeInformed/SubscriptionManagement" xmlns:organisationmanagement="http://www.be-informed.nl/BeInformed/OrganisationManagement" xmlns:serviceapplication="http://www.be-informed.nl/BeInformed/ServiceApplication" xmlns:met="urn:oecd:ctssenderfilemetadata" xmlns:iso="urn:oecd:ties:isoctstypes:v1" exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
    
	
	
	
	<xsl:template match="/">
	<CTSFileWrapper_OECD>
		<xsl:apply-templates select="//bi:page-set"/>
	</CTSFileWrapper_OECD>
	</xsl:template>
	
	<xsl:template match="bi:page-set[position()=1]">
		<MessageSpec>
			<xsl:apply-templates select=".//attributes:readonly-attribute"/>
		</MessageSpec>
	</xsl:template>
	<xsl:template match="bi:page-set[position()=2]">
		<version>
			<xsl:apply-templates select=".//attributes:readonly-attribute"/>
		</version>
	</xsl:template>
	<xsl:template match="bi:page-set[position()=2]">
		
			<xsl:apply-templates select=".//attributes:attributeset"/>
		
	</xsl:template>
	<xsl:template match="bi:page-set[position()=3]"/>
	<xsl:template match="attributes:attributeset">
		<FileAttach>
			<xsl:apply-templates select=".//attributes:readonly-attribute"/>
		</FileAttach>
	</xsl:template>
	
	<xsl:template match="attributes:readonly-attribute[attributes:id='CaseId']"/>
	
	<xsl:template match="attributes:readonly-attribute">
		<xsl:element name="{attributes:id}">
			<xsl:value-of select="attributes:value" />
		</xsl:element>
	</xsl:template>
	
	
</xsl:stylesheet>