<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
xmlns:stm="urn:oecd:ties:cbcstm:v2"
xmlns:oecd_crs="urn:oecd:ties:crs:v1"
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
xmlns:iso="urn:oecd:ties:cbcstm:isostmtypes:v1"
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
xmlns:stf="urn:oecd:ties:crsstf:v1"
    xmlns:csm="urn:oecd:ties:csm:v2"
exclude-result-prefixes="oecd_crs cas stm iso bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	<xsl:param name="ReceivingCountry"/>
	<xsl:param name="EnvironmentUsedForTest"/>
	<xsl:param name="MessageRefId"/>
	<xsl:param name="CurrentDateTimestamp"/>
	<xsl:variable name="recordid" select="//cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentid" select="//cas:property[cas:key='ParentId']/cas:value"/>
	
	
	<xsl:template match="/">
		
		<xsl:apply-templates select="*"/>
	</xsl:template>
	
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- Override for ValidationErrors: flatten RecordError -->
  <xsl:template match="csm:ValidationErrors">
    <xsl:copy>
      <xsl:for-each select="csm:RecordError/csm:DocRefIDInError">
        <csm:RecordError>
          <csm:Code>
            <xsl:value-of select="../csm:Code"/>
          </csm:Code>
          <csm:DocRefIDInError>
            <xsl:value-of select="."/>
          </csm:DocRefIDInError>
        </csm:RecordError>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>
	

</xsl:stylesheet>