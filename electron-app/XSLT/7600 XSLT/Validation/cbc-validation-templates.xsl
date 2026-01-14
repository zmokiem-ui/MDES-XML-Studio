<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="2.0" 
   				
   				xmlns:xs="http://www.w3.org/2001/XMLSchema"
				xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
				xmlns:html="http://www.w3.org/1999/xhtml"  
				xmlns:bi="http://www.be-informed.nl/BeInformed" 
				xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
				xmlns:cmf="http://www.be-informed.nl/BeInformed/CMF" 
				xmlns:case="http://www.be-informed.nl/BeInformed/Case" 
				xmlns:form="http://www.be-informed.nl/BeInformed/Form" 
				xmlns:report="http://www.be-informed.nl/BeInformed/Report" 
				xmlns:search="http://www.be-informed.nl/BeInformed/Search" 
				xmlns:assistant="http://www.be-informed.nl/BeInformed/Assistant" 
				xmlns:today="http://www.be-informed.nl/BeInformed/Today" 
				xmlns:dataeditor="http://www.be-informed.nl/BeInformed/DataEditor" 
				xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" 
				xmlns:usermanagement="http://www.be-informed.nl/BeInformed/UserManagement" 
				xmlns:subscriptionmanagement="http://www.be-informed.nl/BeInformed/SubscriptionManagement" 
				xmlns:organisationmanagement="http://www.be-informed.nl/BeInformed/OrganisationManagement" 
				xmlns:serviceapplication="http://www.be-informed.nl/BeInformed/ServiceApplication"
				xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
			    xmlns:attachment="http://schemas.beinformed.nl/beinformed/v3/services/caseservice/attachments"
			    xmlns:xop="http://www.w3.org/2004/08/xop/include" 
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
		
	<xsl:template match="*[local-name()='MessageSpec']">
	   <xsl:apply-templates select="." mode="Error-80007" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='CbcBody']">
		<xsl:apply-templates select="*[local-name()='ReportingEntity']" />
	   	<xsl:apply-templates select="*[local-name()='CbcReports']" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='ReportingEntity']">
		<xsl:apply-templates select="*[local-name()='Entity']" />	
		<xsl:apply-templates select="*[local-name()='DocSpec']" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='Entity'] | *[local-name()='ConstEntity']">
		<xsl:apply-templates select="*[local-name()='Address']" />
		<xsl:apply-templates select="*[local-name()='Name']" />
		<xsl:apply-templates select="." mode="Error-TIN" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='CbcReports']">
		<xsl:apply-templates select="*[local-name()='ConstEntities']" />
		<xsl:apply-templates select="*[local-name()='DocSpec']" />		
	</xsl:template>
	
	<xsl:template match="*[local-name()='ConstEntities']">
		<xsl:apply-templates select="*[local-name()='ConstEntity']" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='DocSpec']">
		<xsl:apply-templates select="." mode="Error-50010" />
		<xsl:apply-templates select="." mode="Error-50011" />
		<xsl:apply-templates select="." mode="Error-80000" />
		<xsl:apply-templates select="." mode="Error-80001" />
		<xsl:apply-templates select="." mode="Error-80004" />
		<xsl:apply-templates select="." mode="Error-80005" />
		<xsl:apply-templates select="." mode="Error-80006" />
		<xsl:apply-templates select="." mode="Error-80008" />
		<xsl:apply-templates select="." mode="Error-80010" />
		<xsl:apply-templates select="." mode="Error-80011" />
	</xsl:template>
		
</xsl:stylesheet>