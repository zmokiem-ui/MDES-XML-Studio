<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
 xmlns:csm="urn:oecd:ties:csm:v1"
 xmlns:iso="urn:oecd:ties:isocsmtypes:v1" 
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
		
		<csm:CRSStatusMessage_OECD xsi:schemaLocation="urn:oecd:ties:csm:v1 CrsStatusMessageXML_v1.0.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:csm="urn:oecd:ties:csm:v1" xmlns:iso="urn:oecd:ties:isocsmtypes:v1" >			
		<xsl:apply-templates select="attributes:attributes">
				<xsl:with-param name="prefix" select="$element-prefix" />
			</xsl:apply-templates>
		</csm:CRSStatusMessage_OECD>
	</xsl:template>

	<xsl:template name="resolve-namespace-uri">
		<xsl:param name="namespace-prefix" />
		<xsl:choose>
			<xsl:when test="$namespace-prefix='csm'">urn:oecd:ties:csm:v1</xsl:when>
			<xsl:when test="$namespace-prefix='iso'">urn:oecd:ties:isocsmtypes:v1</xsl:when>
		</xsl:choose>
	</xsl:template>
	
</xsl:stylesheet>