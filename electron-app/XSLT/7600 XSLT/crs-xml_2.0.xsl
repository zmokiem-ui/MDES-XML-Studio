<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
 xmlns:crs="urn:oecd:ties:crs:v2"
 xmlns:ftc="urn:oecd:ties:fatca:v1"
 xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2"
 xmlns:stf="urn:oecd:ties:crsstf:v5"
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
exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
    
	<xsl:import href="xml-base.xsl" />
	
	<xsl:template match="attributes:attributeset[contains(attributes:label,$xml-root-prefix)]">
		<xsl:variable name="element-prefix">
			<xsl:apply-templates select="." mode="element-prefix" />
		</xsl:variable>
		
		<crs:CRS_OECD xsi:schemaLocation="urn:oecd:ties:crs:v2 CrsXML_v2.0.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:crs="urn:oecd:ties:crs:v2" xmlns:ftc="urn:oecd:ties:fatca:v1" xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2" xmlns:stf="urn:oecd:ties:crsstf:v5" xmlns:iso="urn:oecd:ties:isocrstypes:v1">			
		<xsl:apply-templates select="attributes:attributes">
				<xsl:with-param name="prefix" select="$element-prefix" />
			</xsl:apply-templates>
		</crs:CRS_OECD>
	</xsl:template>

	<xsl:template name="resolve-namespace-uri">
		<xsl:param name="namespace-prefix" />
		<xsl:choose>
			<xsl:when test="$namespace-prefix='cfc'">urn:oecd:ties:commontypesfatcacrs:v2</xsl:when>
			<xsl:when test="$namespace-prefix='crs'">urn:oecd:ties:crs:v2</xsl:when>
			<xsl:when test="$namespace-prefix='ftc'">urn:oecd:ties:fatca:v1</xsl:when>
			<xsl:when test="$namespace-prefix='iso'">urn:oecd:ties:isocrstypes:v1</xsl:when>
			<xsl:when test="$namespace-prefix='stf'">urn:oecd:ties:crsstf:v5</xsl:when>
		</xsl:choose>
	</xsl:template>
	
</xsl:stylesheet>