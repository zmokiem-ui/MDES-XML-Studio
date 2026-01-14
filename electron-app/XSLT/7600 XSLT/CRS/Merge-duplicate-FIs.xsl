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


	<xsl:variable name="MessageTypeIndic" select="//crs:MessageSpec/crs:MessageTypeIndic"/>
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
	
	<xsl:template match="crs:CrsBody" >
		<xsl:variable name="IN" select="crs:ReportingFI/crs:IN"/>
		<xsl:variable name="numberPrecedingDuplicates" select="count(preceding-sibling::*/crs:ReportingFI[crs:IN=$IN])"/>
		<xsl:variable name="numberFollowingDuplicates" select="count(following-sibling::*/crs:ReportingFI[crs:IN=$IN])"/>
		<xsl:if test="$numberPrecedingDuplicates=0 and $numberFollowingDuplicates=0">
			<xsl:copy-of select="."/>
		</xsl:if>
		<xsl:if test="$numberPrecedingDuplicates &gt; 0 and $numberFollowingDuplicates=0">
			<xsl:apply-templates select="." mode="add-duplicate-accountreports"/>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="ftc:FATCA" >
		<xsl:variable name="TIN" select="ftc:ReportingFI/sfa:TIN"/>
		<xsl:variable name="numberPrecedingDuplicates" select="count(preceding-sibling::*/ftc:ReportingFI[sfa:TIN=$TIN])"/>
		<xsl:variable name="numberFollowingDuplicates" select="count(following-sibling::*/ftc:ReportingFI[sfa:TIN=$TIN])"/>
		<xsl:if test="$numberPrecedingDuplicates=0 and $numberFollowingDuplicates=0">
			<xsl:copy-of select="."/>
		</xsl:if>
		<xsl:if test="$numberPrecedingDuplicates &gt; 0 and $numberFollowingDuplicates=0">
			<xsl:apply-templates select="." mode="add-duplicate-accountreports"/>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="crs:CrsBody" mode="add-duplicate-accountreports">
		<xsl:variable name="IN" select="crs:ReportingFI/crs:IN"/>
		<crs:CrsBody>
		
		
		<xsl:apply-templates select="crs:ReportingFI" mode="add-duplicate-accountreports-reportingFI"/>
		<crs:ReportingGroup>
			<xsl:copy-of select="crs:ReportingGroup/*"/>
			<xsl:copy-of select="preceding-sibling::*[crs:ReportingFI[crs:IN=$IN]]/crs:ReportingGroup/crs:AccountReport"/>
		</crs:ReportingGroup>
		</crs:CrsBody>
	</xsl:template>
	
	<xsl:template match="ftc:FATCA" mode="add-duplicate-accountreports">
		<xsl:variable name="TIN" select="ftc:ReportingFI/sfa:TIN"/>
		<ftc:FATCA>
		
		
		<xsl:apply-templates select="ftc:ReportingFI" mode="add-duplicate-accountreports-reportingFI"/>
		<ftc:ReportingGroup>
			<xsl:copy-of select="ftc:ReportingGroup/*"/>
			
			<xsl:copy-of select="preceding-sibling::*[ftc:ReportingFI[sfa:TIN=$TIN]]/ftc:ReportingGroup/ftc:AccountReport"/>
			
		</ftc:ReportingGroup>
		</ftc:FATCA>
	</xsl:template>
	
	
	<xsl:template match="crs:ReportingFI" mode="add-duplicate-accountreports-reportingFI">
		<crs:ReportingFI>
			<xsl:copy-of select="*[name()!='crs:DocSpec']"/>
		<xsl:apply-templates select="crs:DocSpec" mode="add-duplicate-accountreports-reportingFI-docspec"/>	

		</crs:ReportingFI>

	</xsl:template>

	<xsl:template match="ftc:ReportingFI" mode="add-duplicate-accountreports-reportingFI">
		<ftc:ReportingFI>
			<xsl:copy-of select="*[name()!='ftc:DocSpec']"/>
		<xsl:apply-templates select="ftc:DocSpec" mode="add-duplicate-accountreports-reportingFI-docspec"/>	

		</ftc:ReportingFI>

	</xsl:template>

	<xsl:template match="crs:DocSpec" mode="add-duplicate-accountreports-reportingFI-docspec">
		<crs:DocSpec>
			<stf:DocTypeIndic>
				<xsl:choose>
					<xsl:when test="stf:DocTypeIndic='OECD0' and $MessageTypeIndic='CRS701'">
						<xsl:text>OECD1</xsl:text>
					</xsl:when>
					<xsl:when test="stf:DocTypeIndic='OECD10' and $MessageTypeIndic='CRS701'">
						<xsl:text>OECD11</xsl:text>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text><xsl:value-of select="stf:DocTypeIndic"/></xsl:text>
					</xsl:otherwise>
				</xsl:choose>
			</stf:DocTypeIndic>
			<xsl:copy-of select="*[name()!='stf:DocTypeIndic']"/>
		</crs:DocSpec>
	</xsl:template>	
	
	<xsl:template match="ftc:DocSpec" mode="add-duplicate-accountreports-reportingFI-docspec">
		<ftc:DocSpec>
			<ftc:DocTypeIndic>
					<xsl:value-of select="ftc:DocTypeIndic"/>
					
			</ftc:DocTypeIndic>
			<xsl:copy-of select="*[name()!='ftc:DocTypeIndic']"/>
		</ftc:DocSpec>
	</xsl:template>	
	
	
</xsl:stylesheet>