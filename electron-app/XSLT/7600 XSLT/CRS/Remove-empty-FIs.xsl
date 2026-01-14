<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
xmlns:stm="urn:oecd:ties:cbcstm:v2"
xmlns:oecd_ntj="urn:oecd:ties:ntj:v1"
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
xmlns:iso="urn:oecd:ties:isocrstypes:v1"
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
xmlns:crs="urn:oecd:ties:crs:v2"
xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2"
xmlns:stf="urn:oecd:ties:crsstf:v5"
xmlns:ftc="urn:oecd:ties:fatca:v2"
xmlns:sfa="urn:oecd:ties:stffatcatypes:v2"
xmlns:sfa_ftc="urn:oecd:ties:fatcacrstypes:v2"  
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 

exclude-result-prefixes="bi knowledge cas cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">


	
	<xsl:template match="/">
		<xsl:choose>
		<xsl:when test="count(//crs:CRS_OECD)"> 
		
		<crs:CRS_OECD xmlns:crs="urn:oecd:ties:crs:v2" xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2" xmlns:iso="urn:oecd:ties:isocrstypes:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:stf="urn:oecd:ties:crsstf:v5" xsi:schemaLocation="urn:oecd:ties:crs:v2 CrsXML_v2.0.xsd" version="2.0">
			<xsl:apply-templates select="/*"  mode="insert"/>
		</crs:CRS_OECD>
		</xsl:when>
		<xsl:otherwise>
			<ftc:FATCA_OECD xmlns:ftc="urn:oecd:ties:fatca:v2" xmlns:sfa_ftc="urn:oecd:ties:fatcacrstypes:v2" xmlns:iso="urn:oecd:ties:isocrstypes:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:sfa="urn:oecd:ties:stffatcatypes:v2" xsi:schemaLocation="urn:oecd:ties:fatca:v2 FatcaXML_v2.0.xsd" version="2.0">
				<xsl:apply-templates select="/*"  mode="insert"/>
			</ftc:FATCA_OECD>
		</xsl:otherwise>		
		</xsl:choose>
	</xsl:template>
	
	
	<xsl:template match="*" mode="insert">
			<xsl:apply-templates  />
		</xsl:template>
	<xsl:template match="crs:MessageSpec" >
		<xsl:copy-of select="."/>
	</xsl:template>
	
	<xsl:template match="ftc:MessageSpec" >
		<xsl:copy-of select="."/>
	
	</xsl:template>
	
	<xsl:template match="crs:CrsBody[count(crs:ReportingGroup/crs:AccountReport)=0]" />
	
	
	<xsl:template match="crs:CrsBody" >
		<xsl:copy-of select="."/>
	</xsl:template>

	
</xsl:stylesheet>