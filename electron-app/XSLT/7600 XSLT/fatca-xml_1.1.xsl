<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
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
				xmlns:oecd_ftc="urn:fatcacrsesrr:ties:v1" 
				xmlns:sfa_ftc="urn:oecd:ties:fatcacrsesrrtypes:v1" 
				xmlns:sfa="urn:oecd:ties:stffatcatypes:v1" 
				xmlns:ftc="urn:oecd:ties:fatca:v1" 
				xmlns:met="urn:fatca:idessenderfilemetadata" 
				xmlns:n1="urn:fatca:fatcafileerrornotification" 
				xmlns:n2="urn:fatca:fatcavalidfilenotification" 
				xmlns:crs="urn:oecd:ties:crs:v1"
				xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v1"
				xmlns:stf="urn:oecd:ties:stf:v4"
				xmlns:iso="urn:oecd:ties:isocrstypes:v1"
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	<xsl:import href="xml-base.xsl" />

	<xsl:template match="attributes:attributeset[contains(attributes:label,$xml-root-prefix)]">
		<xsl:variable name="element-prefix">
			<xsl:apply-templates select="." mode="element-prefix" />
		</xsl:variable>

		<ftc:FATCA_OECD xsi:schemaLocation="urn:oecd:ties:fatca:v1 FatcaXML_v1.1.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ftc="urn:oecd:ties:fatca:v1" xmlns:sfa="urn:oecd:ties:stffatcatypes:v1">
			<xsl:apply-templates select="attributes:attributes">
				<xsl:with-param name="prefix" select="$element-prefix" />
			</xsl:apply-templates>
		</ftc:FATCA_OECD>
	</xsl:template>

	<xsl:template name="resolve-namespace-uri">
		<xsl:param name="namespace-prefix" />
		<xsl:choose>
			<xsl:when test="$namespace-prefix='ftc'">urn:oecd:ties:fatca:v1</xsl:when>
			<xsl:when test="$namespace-prefix='stf'">urn:oecd:ties:stf:v4</xsl:when>
			<xsl:when test="$namespace-prefix='sfa'">urn:oecd:ties:stffatcatypes:v1</xsl:when>
			<!--<xsl:when test="$namespace-prefix='oecd_ftc'">urn:fatcacrsesrr:ties:v1</xsl:when>
			<xsl:when test="$namespace-prefix='sfa_ftc'">urn:oecd:ties:fatcacrsesrrtypes:v1</xsl:when>
			<xsl:when test="$namespace-prefix='met'">urn:fatca:idessenderfilemetadata</xsl:when> 
			<xsl:when test="$namespace-prefix='n1'">urn:fatca:fatcafileerrornotification</xsl:when>
			<xsl:when test="$namespace-prefix='n2'">urn:fatca:fatcavalidfilenotification</xsl:when>
			<xsl:when test="$namespace-prefix='crs'">urn:oecd:ties:crs:v1</xsl:when>
			<xsl:when test="$namespace-prefix='cfc'">urn:oecd:ties:commontypesfatcacrs:v1</xsl:when>
			<xsl:when test="$namespace-prefix='iso'">urn:oecd:ties:isocrstypes:v1</xsl:when>
			<xsl:when test="$namespace-prefix=''">urn:fatca:fatcanotificationbase</xsl:when>-->
		</xsl:choose>
	</xsl:template>


</xsl:stylesheet>