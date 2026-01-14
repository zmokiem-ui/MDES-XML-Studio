<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
xmlns:stm="urn:oecd:ties:cbcstm:v2"
xmlns:oecd_ntj="urn:oecd:ties:ntj:v1"
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
exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	<xsl:variable name="recordid" select="//cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentid" select="//cas:property[cas:key='ParentId']/cas:value"/>
	
	
	<xsl:template match="/">
		<xsl:apply-templates select="//CurrentDocument/*"/>
	</xsl:template>
	
	<xsl:template match="a"/>
	
	<xsl:template match="*">
		<xsl:variable name="nodeName" select="local-name()"/>
		<xsl:variable name="identifier" select="@id"/>
		
		
		<xsl:element name="{$nodeName}">
			<xsl:if test="@id!=''">
				<xsl:attribute name="id"><xsl:value-of select="@id"/></xsl:attribute>		
			</xsl:if>
			<xsl:apply-templates/>
			<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value = $identifier]" mode="insert-attributeset"/>
			
		
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-attributeset">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:element name="{$nodeName}">
			<xsl:attribute name="id">
				<xsl:choose>
					<xsl:when test=".//cas:property[cas:key='RecordId']/cas:value!=''">
						<xsl:value-of select=".//cas:property[cas:key='RecordId']/cas:value"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:value-of select="$recordid"/>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:attribute>
			<xsl:apply-templates select="." mode="insert-attributes"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-attributes">
		<xsl:apply-templates select="cas:property" mode="insert-attribute"/>			
	</xsl:template>
	
	<xsl:template match="cas:label" mode="insert-attribute"/>
	
	<xsl:template match="cas:property[cas:key='XML']|cas:property[cas:key='Parent']|cas:property[cas:key='ParentId']|cas:property[cas:key='RecordId']|cas:property[cas:key='Operation']" mode="insert-attribute"/>
	
	<xsl:template match="cas:property" mode="insert-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	

	
	
</xsl:stylesheet>