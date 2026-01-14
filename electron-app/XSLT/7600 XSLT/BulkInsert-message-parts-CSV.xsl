<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
xmlns:stm="urn:oecd:ties:cbcstm:v2"
xmlns:oecd_ntj="urn:oecd:ties:ntj:v1"
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
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
xmlns:iso="urn:oecd:ties:isocrstypes:v1"
xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2"
xmlns:stf="urn:oecd:ties:crsstf:v5"
exclude-result-prefixes="bi knowledge cmf iso cas case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	<xsl:output method="text" encoding="UTF-8"/>
	<xsl:variable name="recordid" select="1"/>
	<xsl:variable name="parentid" select="2"/>
	<xsl:variable name="reportingfis" select="//cas:dataset[cas:label='ReportingFI']"/>
	<xsl:variable name="reportinggroups" select="//cas:dataset[cas:label='ReportingGroup']"/>
	<xsl:variable name="accountreports" select="//cas:dataset[cas:label='AccountReport']"/>
	
	<xsl:variable name="nilreports" select="//cas:dataset[cas:label='NilReport']"/>
	<xsl:variable name="accountholders" select="//cas:dataset[cas:label='AccountHolder']"/>
	<xsl:variable name="controllingpersons" select="//cas:dataset[cas:label='ControllingPerson']"/>
	<xsl:variable name="payments" select="//cas:dataset[cas:label='Payment']"/>
	<xsl:variable name="organisations" select="//cas:dataset[cas:label='Organisation']"/>
	<xsl:variable name="individuals" select="//cas:dataset[cas:label='Individual']"/>
	<xsl:variable name="addresses" select="//cas:dataset[cas:label='Address']"/>
	<xsl:variable name="identificationnumbers" select="//cas:dataset[cas:label='IdentificationNumber']"/>
	
	<xsl:variable name="sendingCountryCode" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='SendingCountryCode']/cas:value"/>
	<xsl:variable name="deliveryCountryCode" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='DeliveryCountryCode']/cas:value"/>
	
	<xsl:variable name="caseId" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='CaseId']/cas:value"/>
	<xsl:variable name="reportingPeriod" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='ReportingPeriodYear']/cas:value"/>
	<xsl:variable name="environmentUsedForTest" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='EnvironmentUsedForTest']/cas:value"/>
	<xsl:variable name="MessageTypeIndic" select="//cas:dataset[cas:label='MessageSpec']/cas:property[cas:key='MessageTypeIndic']/cas:value"/>
	<xsl:variable name="spanish" select="document('../../9000 Algemeen/Vertalingen/messages_es.xml')"/>
	<xsl:variable name="english" select="document('../../9000 Algemeen/Vertalingen/messages_en.xml')"/>
	<xsl:variable name="reportLanguage" select="//cas:dataset[cas:label='Global']/cas:property[cas:key='ReportLanguage']/cas:value"/>
	
<xsl:template match="/">
			<xsl:apply-templates select="//cas:dataset[cas:label='AccountReport']" mode="object"/>
</xsl:template>
<xsl:template match="cas:dataset[cas:label='AccountHolder']" mode="header">
</xsl:template>
<xsl:template match="cas:dataset[cas:label='AccountHolder']" mode="value">
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<!--Druk af de header van de organisation of de indivudual-->
		<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId][1]" mode="object"/>
</xsl:template>
		<!-- this is for organisation-->
<xsl:template match="cas:dataset[cas:label='Organisation']" mode="header">
	<xsl:apply-templates select=".//cas:key" mode="header"/>
</xsl:template>
<xsl:template match="cas:dataset[cas:label='Individual']" mode="header">
	<xsl:apply-templates select=".//cas:key" mode="header"/>
</xsl:template>
<xsl:template match="cas:dataset[cas:label='Organisation']" mode="value">
<xsl:text>
</xsl:text>
	<xsl:apply-templates select="." mode="kommas"/>
	<xsl:apply-templates select=".//cas:value" mode="value"/>
	<!-- this is for address -->
	<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='Address'][1]" mode="object"/>
	<!-- this is for getting identifcation number -->
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='IdentificationNumber'][1]" mode="object"/>
</xsl:template>
<!-- This is for controllingperson-->
<xsl:template match="cas:dataset[cas:label='ControllingPerson']" mode="header">
</xsl:template>
<xsl:template match="cas:dataset[cas:label='ControllingPerson']" mode="value">
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<!--Druk af de header van de indiv af -->
		<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId][1]" mode="object"/>
</xsl:template>
	<!--THis is for an individual-->
<xsl:template match="cas:dataset[cas:label='Individual']" mode="value">
<xsl:text>
</xsl:text>
	<xsl:apply-templates select="." mode="kommas"/>
	<xsl:apply-templates select=".//cas:value" mode="value"/>
	<!-- this is for address -->
	<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='Address'][1]" mode="object"/>
	<!-- this is for getting identifcation number -->		
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='IdentificationNumber'][1]" mode="object"/>
</xsl:template>
<xsl:template match="cas:dataset[cas:label='ControllingPerson' or cas:label='SubstantialOwner']" mode="object">
	<xsl:variable name="label" select="cas:label"/>
	<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$parentId and cas:label=$label]" mode="value"/>
</xsl:template>

<xsl:template match="cas:dataset" mode="object">
	<xsl:variable name="label" select="cas:label"/>
	<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
<xsl:text>
</xsl:text>
	<xsl:apply-templates select="." mode="kommas"/>	
	<xsl:apply-templates select="." mode="header"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$parentId and cas:label=$label]" mode="value"/>
</xsl:template>

<xsl:template match="cas:dataset" mode="kommas">
<xsl:variable name="translated-object">
				<xsl:apply-templates select="cas:label" mode="translate-text"/>
			</xsl:variable>
			
	<xsl:value-of select="concat($translated-object,',')"/>
	<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='RecordId']/cas:value=$parentId]" mode="komma"/>
</xsl:template>

<xsl:template match="cas:dataset[cas:label='AccountHolder' or cas:label ='ControllingPerson' or cas:label='SubstantialOwner' or cas:label='ReportingGroup' or cas:label='Body']" mode="komma">
	<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='RecordId']/cas:value=$parentId]" mode="komma"/>
</xsl:template>

<xsl:template match="cas:dataset" mode="komma">
	<xsl:text>,</xsl:text>
	<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='RecordId']/cas:value=$parentId]" mode="komma"/>
</xsl:template>
<xsl:template match="cas:dataset[cas:label='AccountReport']" mode="value">
<xsl:text>
</xsl:text>
	<xsl:apply-templates select="." mode="kommas"/>
	<xsl:apply-templates select=".//cas:value" mode="value"/>
	<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='AccountHolder'][1]" mode="value"/>
	<!-- This is for controllingpersons or substantialowner -->
  	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and (cas:label='ControllingPerson' or cas:label='SubstantialOwner')][1]" mode="object"/>
	<!--This is for Payments -->
<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId and cas:label='Payment'][1]" mode="object"/>
</xsl:template>
<xsl:template match="cas:dataset" mode="header">
    <xsl:apply-templates select=".//cas:key" mode="header"/>
    <xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
    <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId][1]" mode="header"/>
</xsl:template>
<xsl:template match="cas:dataset" mode="value">
<xsl:text>
</xsl:text>
    <xsl:apply-templates select="." mode="kommas"/>
    <xsl:apply-templates select=".//cas:value" mode="value"/>
    <xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
    <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="value"/>
</xsl:template>

<xsl:template match="cas:key[text()='ParentId'
		or text()='RecordId' 
		or text()='Operation' 
		or text()='IndividualRecordId' 
		or text()='OrganisationRecordId' 
		or text()='ReportingFIRecordId'
		or text()='AddressFixAanwezig'
		or text()='AccountdataVerified' 
		or text()='SponsorRecordId' 
		or text()='IntermediaryRecordId' 
		or text()='AddressRecordId' 
		or text()='VerificationRecordId'
		or text()='Recalcitrant'  
		or text()='BronbelastingIngehouden'
		or text()='AccountReportID'
		or text()='ReportingGroupID'
		or text()='MessageRefId']" mode="header"/>

		<xsl:template match="cas:key" mode="header">
			<xsl:variable name="translated-header">
				<xsl:apply-templates select="." mode="translate-text"/>
			</xsl:variable>
			<xsl:value-of select="concat($translated-header,',')"/>
</xsl:template>
	<xsl:template match="cas:value[../cas:key='ParentId'  
	 or ../cas:key='RecordId' 
	 or ../cas:key='Operation' 
	 or ../cas:key='IndividualRecordId' 
	 or ../cas:key='OrganisationRecordId' 
	 or ../cas:key='ReportingFIRecordId' 
	 or ../cas:key='SponsorRecordId'
	 or ../cas:key='AddressFixAanwezig'  
	 or ../cas:key='IntermediaryRecordId'
	 or ../cas:key='AddressRecordId' 
	 or ../cas:key='VerificationRecordId'
	 or ../cas:key='AccountdataVerified' 
	 or ../cas:key='Recalcitrant' 
	 or ../cas:key='BronbelastingIngehouden'
	 or ../cas:key='AccountReportID'
	 or ../cas:key='ReportingGroupID'
	 or ../cas:key='MessageRefId']" mode="value"/>   

    	<xsl:template match="cas:value" mode="value">
        <xsl:value-of select="concat(translate(normalize-space(translate(., '&#xA;', '')), ',', ' '),',')"/>
</xsl:template>
<xsl:template match="*" mode="translate-text">
		<xsl:variable name="org-label" select="."/>
		<xsl:variable name="label" select="."/>
		<xsl:variable name="label-text">
			<xsl:choose>
				<xsl:when test="$reportLanguage='EN'">
					<xsl:value-of select="$english/*/message[@key=$label]"/>
				</xsl:when>
				<xsl:when test="$reportLanguage='ES'">
					<xsl:value-of select="$spanish/*/message[@key=$label]"/>
				</xsl:when>
			</xsl:choose>
		</xsl:variable>
		<xsl:choose>
			<xsl:when test="$label=''">
				<xsl:value-of select="$org-label"/>
			</xsl:when>
			<xsl:when test="$label-text=''">
				<xsl:value-of select="$label"/>
			</xsl:when>
			
			<xsl:otherwise>
				<xsl:value-of select="$label-text"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

</xsl:stylesheet>