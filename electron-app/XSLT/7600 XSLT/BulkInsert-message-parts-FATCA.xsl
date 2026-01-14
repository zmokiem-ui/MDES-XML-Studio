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
xmlns:ftc="urn:oecd:ties:fatca:v2"
xmlns:sfa="urn:oecd:ties:stffatcatypes:v2"
xmlns:sfa_ftc="urn:oecd:ties:fatcacrstypes:v2"
exclude-result-prefixes="bi knowledge cmf cas iso ntj case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	
	<xsl:variable name="recordid" select="1"/>
	<xsl:variable name="parentid" select="2"/>
	<xsl:variable name="reportingfis" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ReportingFI']"/>
	<xsl:variable name="reportinggroups" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ReportingGroup']"/>
	<xsl:variable name="sponsors" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Sponsor']"/>
	<xsl:variable name="accountreports" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='AccountReport']"/>
	<xsl:variable name="nilreports" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='NilReport']"/>
	<xsl:variable name="accountholders" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='AccountHolder']"/>
	<xsl:variable name="controllingpersons" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ControllingPerson']"/>
	<xsl:variable name="substantialowners" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='SubstantialOwner']"/>
	<xsl:variable name="payments" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Payment']"/>
	<xsl:variable name="organisations" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Organisation']"/>
	<xsl:variable name="individuals" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Individual']"/>
	<xsl:variable name="addresses" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Address']"/>
	<xsl:variable name="identificationnumbers" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='IdentificationNumber']"/>
	
	<xsl:variable name="sendingCountryCode" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Global']/cas:property[cas:key='SendingCountryCode']/cas:value"/>
	<xsl:variable name="deliveryCountryCode" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Global']/cas:property[cas:key='DeliveryCountryCode']/cas:value"/>
	
	<xsl:variable name="caseId" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Global']/cas:property[cas:key='CaseId']/cas:value"/>
	<xsl:variable name="reportingPeriod" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Global']/cas:property[cas:key='ReportingPeriodYear']/cas:value"/>
	<xsl:variable name="environmentUsedForTest" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='Global']/cas:property[cas:key='EnvironmentUsedForTest']/cas:value"/>
	
	
	<xsl:template match="/">
		<ftc:FATCA_OECD xmlns:iso="urn:oecd:ties:isocrstypes:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ftc="urn:oecd:ties:fatca:v2" xmlns:sfa="urn:oecd:ties:stffatcatypes:v2" xsi:schemaLocation="urn:oecd:ties:fatca:v2 FatcaXML_v2.0.xsd" version="2.0">
			<xsl:apply-templates select="/root/PartsToInsert/eventRequest/cas:dataset[cas:property[cas:key='ParentId']/cas:value=-1]"/>
			<xsl:apply-templates select="/root/PartsToInsert/eventRequest/cas:dataset[cas:property[cas:key='ParentId']/cas:value=0]"/>
		</ftc:FATCA_OECD>
	</xsl:template>
	
	<xsl:template match="cas:dataset[cas:label='MessageSpec']">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="." mode="insert-attributes-sfa"/>
			
		</xsl:element>
	</xsl:template>
	

	
	<xsl:template match="*" mode="add-corr-messageRefIds">
		<sfa:CorrMessageRefId><xsl:value-of select=".//cas:value"/></sfa:CorrMessageRefId>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Warning']|cas:property[cas:key='Contact']" mode="insert-attributes-sfa"/>
	
	<xsl:template match="cas:dataset">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:FATCA" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$recordId][position()=1]" mode="insert-reporting-fi"/>
			<xsl:apply-templates select="$reportinggroups[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-reporting-group"/>
			
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-reporting-fi">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="cas:property[cas:key='CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Name']" mode="insert-attribute-sfa"/>
			
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
			<xsl:apply-templates select="cas:property[cas:key='FilerCategory'][cas:value!='']" mode="insert-attribute"/>
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-reporting-group">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
		<xsl:variable name="reportingFI" select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$parentId]" />
		<xsl:variable name="reportingFIDocRefId" select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$parentId][position()=1]/cas:property[cas:key='DocRefId']/cas:value" />
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:if test="count($reportingFI/preceding-sibling::cas:dataset[cas:property[cas:key='DocRefId']/cas:value=$reportingFIDocRefId])=0">
				<xsl:copy-of select="/root/CurrentDocument/*/ftc:FATCA[ftc:ReportingFI/ftc:DocSpec/ftc:DocRefId=$reportingFIDocRefId]/ftc:ReportingGroup/*" />
			</xsl:if>
			<xsl:apply-templates select="." mode="insert-attributes"/>
			<xsl:apply-templates select="$sponsors[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-sponsors"/>
			<xsl:apply-templates select="$accountreports[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-account-reports"/>
			<xsl:apply-templates select="$nilreports[cas:property[cas:key='ParentId']/cas:value=$recordId][position()=1]" mode="insert-nil-reports"/>
		</xsl:element>
	</xsl:template>
	
		<xsl:template match="cas:dataset" mode="insert-sponsors">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			
			<sfa:ResCountryCode><xsl:value-of select="cas:property[cas:key='Sponsor_CountryCode']/cas:value" /></sfa:ResCountryCode>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Sponsor_Name']" mode="insert-attribute-sfa"/>
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
			<xsl:apply-templates select="cas:property[cas:key='FilerCategory'][cas:value!='']" mode="insert-attribute"/>	
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
			
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-account-reports">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountNumber_1']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$accountholders[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-accountholder"/>
			<xsl:apply-templates select="$substantialowners[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-substantialowners"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountBalance']" mode="insert-attribute"/>
			<xsl:apply-templates select="$payments[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-payments"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-nil-reports">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
			<ftc:NoAccountToReport>	
				<xsl:text>yes</xsl:text>
			</ftc:NoAccountToReport>
		</xsl:element>
	</xsl:template>	
	<xsl:template match="cas:dataset" mode="insert-payments">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			
			<xsl:apply-templates select="." mode="insert-attributes"/>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-substantialowners">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			
			<xsl:apply-templates select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-individuals"/>
			<xsl:apply-templates select="$organisations[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-organisations-substantial-owner"/>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-accountholder">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			
			
			<xsl:apply-templates select="$organisations[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-organisations"/>			
			<xsl:apply-templates select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-individuals"/>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-organisations">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="cas:property[cas:key='Organisation_CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Organisation_Name']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
		</xsl:element>
		<xsl:apply-templates select="cas:property[cas:key='AccountHolderTypeCRS']" mode="insert-attribute"/>
		<xsl:apply-templates select="cas:property[cas:key='AccountHolderTypeFATCA']" mode="insert-attribute"/>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-organisations-substantial-owner">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="cas:property[cas:key='Organisation_CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Organisation_Name']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
		</xsl:element>
		
	</xsl:template>


	<xsl:template match="cas:dataset" mode="insert-individuals">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:apply-templates select="cas:property[cas:key='Individual_CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-TINs"/>
			<xsl:apply-templates select="cas:property[cas:key='FirstName']" mode="insert-attribute-sfa"/>	
						
			
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
			<xsl:apply-templates select="cas:property[cas:key='BirthDate'][cas:value!='']" mode="insert-attribute-sfa"/>
						
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-addresses">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="addressContent">
			<xsl:apply-templates select="cas:property[cas:key='AddressFixAanwezig'][cas:value='true']" mode="insert-attribute-cfc"/>	
			<xsl:apply-templates select="cas:property[cas:key='AdresFree']" mode="insert-attribute-cfc"/>
		</xsl:variable>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="cas:property[cas:key='AddressFix_AddressType'][cas:value!='']" mode="insert-xml-attribute"/>	
			<xsl:apply-templates select="cas:property[cas:key='CountryCode']" mode="insert-attribute-cfc"/>
			<xsl:apply-templates select="cas:property[cas:key='AddressFixAanwezig'][cas:value='true']" mode="insert-attribute-cfc"/>	
			<xsl:apply-templates select="cas:property[cas:key='AdresFree']" mode="insert-attribute-cfc"/>
			<xsl:if test="$addressContent=''">
				<xsl:variable name="nodeName" select="'AddressFree'"/>				
				<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
					<xsl:text>No address available</xsl:text>
				</xsl:element>
			</xsl:if>
						
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-TINs">
		<xsl:variable name="nodeName" select="'TIN'"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="cas:property[cas:key='TIN_issuedBy'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:property[cas:key='TIN']/cas:value"/>
						
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:dataset" mode="insert-INs">
		<xsl:variable name="nodeName" select="'TIN'"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="cas:property[cas:key='TIN_issuedBy'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:property[cas:key='TIN']/cas:value"/>
						
		</xsl:element>
	</xsl:template>



	<xsl:template match="cas:dataset" mode="insert-attributeset">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
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
	
	<xsl:template match="cas:dataset" mode="insert-attributeset-sfa">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
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
			<xsl:apply-templates select="." mode="insert-attributes-sfa"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-attributes-sfa">
		<xsl:apply-templates select="cas:property" mode="insert-attribute-sfa"/>			
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='BirthDate']" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="'BirthDate'"/>
		<sfa:BirthInfo>
			<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
				<xsl:value-of select="cas:value"/>
			</xsl:element>
			<xsl:apply-templates select="../cas:property[cas:key='BirthCity'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='BirthCitySubentity'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='BirthFormerCountryName'][cas:value!='']"/>
			<xsl:apply-templates select="../cas:property[cas:key='BirthCountryCode']" mode="insert-attribute-sfa"/>
			
		</sfa:BirthInfo>
	</xsl:template>
	
	
	
	
	<xsl:template match="cas:label" mode="insert-attribute"/>
	
	<xsl:template match="cas:property[cas:key='MessageTypeIndic']|cas:property[cas:key='PaymentAmntCurrCode']|cas:property[cas:key='AccountReportID']|cas:property[cas:key='CorrDocRefId']|cas:property[cas:key='CorrMessageRefId']|cas:property[cas:key='DocRefId']|cas:property[cas:key='XML']|cas:property[cas:key='Parent']|cas:property[cas:key='ParentId']|cas:property[cas:key='RecordId']|cas:property[cas:key='Operation']" mode="insert-attribute"/>
	<xsl:template match="cas:property[cas:key='Warning']|cas:property[cas:key='Contact']|cas:property[cas:key='MessageTypeIndic']|cas:property[cas:key='PaymentAmntCurrCode']|cas:property[cas:key='AccountReportID']|cas:property[cas:key='CorrDocRefId']|cas:property[cas:key='CorrMessageRefId']|cas:property[cas:key='DocRefId']|cas:property[cas:key='XML']|cas:property[cas:key='Parent']|cas:property[cas:key='ParentId']|cas:property[cas:key='RecordId']|cas:property[cas:key='Operation']" mode="insert-attribute-sfa"/>
	
	<xsl:template match="cas:property[cas:key='DocRefId'][cas:value='']" mode="insert-attribute-at-will-stf">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="concat($sendingCountryCode, $reportingPeriod, $deliveryCountryCode,'.',$caseId,'.', ../cas:property[cas:key='RecordId']/cas:value)"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:property[cas:key='Name']" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="../cas:property[cas:key='NameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
		
	</xsl:template>
		<xsl:template match="cas:property[cas:key='Sponsor_Name']" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="'Name'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-cfc">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-at-will-sfa">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:property" mode="insert-attribute-at-will-stf">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
		
		
	<xsl:template match="cas:property[cas:key='LastName']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="../cas:property[cas:key='LastName_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:property[cas:key='ClosedAccount']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AccountClosed'"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:property[cas:key='MiddleName']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:apply-templates select="../cas:property[cas:key='MiddleName_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='AddressFix_AddressType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'legalAddressType'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='AccountReport_AccountNumberType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'AcctNumberType'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='PaymentAmntCurrCode']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'currCode'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='TIN_issuedBy']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'issuedBy'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	
	
	<xsl:template match="cas:property[cas:key='BirthCity']" mode="insert-attribute-at-will-sfa">
		<xsl:variable name="nodeName" select="'City'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='BirthCitySubentity']" mode="insert-attribute-at-will-sfa">
		<xsl:variable name="nodeName" select="'CitySubentity'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthFormerCountryName']" mode="insert-attribute-at-will-sfa">
		<xsl:variable name="nodeName" select="'FormerCountryName'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='AccountBalanceCurrCode']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'currCode'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	
	
	<xsl:template match="cas:property[cas:key='LastName_XNLNameType' or cas:key='FirstName_XNLNameType' or cas:key='MiddleName_XNLNameType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'xnlNameType'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
		
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Organisation_NameType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'nameType'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
		
	</xsl:template>
	
		<xsl:template match="cas:property[cas:key='Individual_NameType' or cas:key='NameType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'nameType'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
		
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='CountryCode' or cas:key='Individual_CountryCode' or cas:key='Organisation_CountryCode']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'ResCountryCode'"/>
		<xsl:apply-templates select="cas:value" name="split">
			<xsl:with-param name="pText" select="cas:value"/>
			<xsl:with-param name="nodeName">ResCountryCode</xsl:with-param>
		</xsl:apply-templates>
		
		
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='PaymentType']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'Type'"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:choose>
					<xsl:when test="cas:value='CRS501'">FATCA501</xsl:when>
					<xsl:when test="cas:value='CRS502'">FATCA502</xsl:when>
					<xsl:when test="cas:value='CRS503'">FATCA503</xsl:when>
					<xsl:when test="cas:value='CRS504'">FATCA504</xsl:when>
					<xsl:when test="cas:value='CRS505'">FATCA505</xsl:when>
					<xsl:when test="cas:value='CRS506'">FATCA506</xsl:when>
				</xsl:choose>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='AccountHolderTypeFATCA'][$deliveryCountryCode!='US']" mode="insert-attribute"/>
	<xsl:template match="cas:property[cas:key='AccountHolderTypeFATCA'][$deliveryCountryCode='US']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AcctHolderType'"/>
		<xsl:variable name="AcctHolderTypeValue">
			<xsl:choose>
			
			<xsl:when test="cas:value=''">
				<xsl:text>FATCA102</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="cas:value"/>
			</xsl:otherwise>
			</xsl:choose>
			
		</xsl:variable>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="$AcctHolderTypeValue"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='AccountHolderTypeCRS'][$deliveryCountryCode='US']" mode="insert-attribute"/>
	<xsl:template match="cas:property[cas:key='AccountHolderTypeCRS'][$deliveryCountryCode!='US']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AcctHolderType'"/>
		<xsl:variable name="AcctHolderTypeValue">
			<xsl:choose>
			
			<xsl:when test="cas:value=''">
				<xsl:text>CRS102</xsl:text>
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="cas:value"/>
			</xsl:otherwise>
			</xsl:choose>
			
		</xsl:variable>
		
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
			<xsl:value-of select="$AcctHolderTypeValue"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:property[cas:key='AdresFree']" mode="insert-attribute-cfc">
		<xsl:variable name="nodeName" select="'AddressFree'"/>
		<xsl:variable name="addressFixValue">
			<xsl:value-of select="../cas:property[cas:key='Street']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='BuildingIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='SuiteIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='FloorIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='DistrictName']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='POB']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='Postcode']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='City']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='CountrySubEntity']/cas:value" />
		</xsl:variable>
		
		<xsl:variable name="addressFreeValue">
			<xsl:choose>
				<xsl:when test="cas:value!=''">
					<xsl:value-of select="cas:value"/>
				</xsl:when>
				<xsl:when test="cas:value=''">
					<xsl:if test="$addressFixValue=''">
						<xsl:text>No address available</xsl:text>
					</xsl:if>
				</xsl:when>
			</xsl:choose>			
		</xsl:variable>
		<xsl:if test="$addressFreeValue!=''">
			<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
				<xsl:value-of select="$addressFreeValue"/>
			</xsl:element>
		</xsl:if>
	</xsl:template>
	
<xsl:template match="cas:property[cas:key='Postcode']" mode="insert-attribute-at-will-sfa">
		<xsl:variable name="nodeName" select="'PostCode'"/>
		<xsl:element name="sfa:{$nodeName}"  namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Organisation_Name']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'Name'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
		<xsl:apply-templates select="../cas:property[cas:key='Organisation_NameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthFormerCountryName']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'FormerCountryName'"/>
		<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthCountryCode']" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="'CountryCode'"/>
		<xsl:variable name="birthCountryValue">
			<xsl:value-of select="../cas:property[cas:key='BirthFormerCountryName']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='BirthCountryCode']/cas:value" />
		</xsl:variable>
		<xsl:if test="$birthCountryValue!=''">
			<sfa:CountryInfo>
				<xsl:if test="cas:value!=''">
					<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
						<xsl:value-of select="cas:value"/>
					</xsl:element>
				</xsl:if>
				<xsl:apply-templates select="../cas:property[cas:key='BirthFormerCountryName'][cas:value!='']" mode="insert-attribute"/>
			</sfa:CountryInfo>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='AccountBalance']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AccountBalance'"/>
		<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
		<xsl:apply-templates select="../cas:property[cas:key='AccountBalanceCurrCode'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:choose>
				<xsl:when test="contains(cas:value,'.')">
					<xsl:value-of select="cas:value"/>	
				</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="concat(cas:value,'.00')"/>
			</xsl:otherwise>
			</xsl:choose>
			
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:value" mode="insert-correct-DocTypeIndic">
		<xsl:choose>
			<xsl:when test="$environmentUsedForTest='true'">
				<xsl:choose>
					<xsl:when test=".='FATCA1' or .='FATCA10'">
						<xsl:text>FATCA11</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA2' or .='FATCA12'">
						<xsl:text>FATCA12</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA3' or .='FATCA13'">
						<xsl:text>FATCA13</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA4' or .='FATCA14'">
						<xsl:text>FATCA14</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
			<xsl:when test="$environmentUsedForTest='false'">
				<xsl:choose>
						<xsl:when test=".='FATCA1' or .='FATCA10'">
						<xsl:text>FATCA1</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA2' or .='FATCA12'">
						<xsl:text>FATCA2</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA3' or .='FATCA13'">
						<xsl:text>FATCA3</xsl:text>
					</xsl:when>
					<xsl:when test=".='FATCA4' or .='FATCA14'">
						<xsl:text>FATCA4</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
		</xsl:choose>
	
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'DocTypeIndic'"/>
		<ftc:DocSpec>
			<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
				<xsl:apply-templates select="cas:value" mode="insert-correct-DocTypeIndic"/>
				
			</xsl:element>
			<xsl:apply-templates select="../cas:property[cas:key='DocRefId']" mode="insert-attribute-at-will-stf"/>
			<xsl:if test="cas:value!='FATCA1' and cas:value!='FATCA11'">
				<xsl:apply-templates select="../cas:property[cas:key='CorrMessageRefId'][cas:value!='']" mode="insert-attribute-at-will-stf"/>
			</xsl:if>
			<xsl:apply-templates select="../cas:property[cas:key='CorrDocRefId'][cas:value!='']" mode="insert-attribute-at-will-stf"/>
			
		</ftc:DocSpec>
	</xsl:template>

	<xsl:template match="cas:property[cas:key='AccountNumber_1']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AccountNumber'"/>
		
			<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
				<xsl:apply-templates select="../cas:property[cas:key='AccountReport_AccountNumberType'][cas:value!='']" mode="insert-xml-attribute"/>	
			
				<xsl:value-of select="cas:value"/>
			</xsl:element>
			<xsl:variable name="AccountClosed">
				<xsl:choose>
					<xsl:when test="../cas:property[cas:key='ClosedAccount']/cas:value!=''">
						<xsl:value-of select="../cas:property[cas:key='ClosedAccount']/cas:value"/>
					</xsl:when>
					<xsl:otherwise>false</xsl:otherwise>
				</xsl:choose>
			</xsl:variable>
			<ftc:AccountClosed><xsl:value-of select="$AccountClosed"/></ftc:AccountClosed>		
		
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='PaymentAmnt']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'PaymentAmnt'"/>
		
			<xsl:element name="ftc:{$nodeName}" namespace="urn:oecd:ties:fatca:v2">
				<xsl:apply-templates select="../cas:property[cas:key='PaymentAmntCurrCode'][cas:value!='']" mode="insert-xml-attribute"/>	
				
				<xsl:choose>
					<xsl:when test="contains(cas:value,'.')">
						<xsl:value-of select="cas:value"/>	
					</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="concat(cas:value,'.00')"/>
				</xsl:otherwise>
				</xsl:choose>
			</xsl:element>
		
	</xsl:template>

	<xsl:template match="cas:property[cas:key='FirstName']" mode="insert-attribute-sfa">
		<xsl:variable name="nodeName" select="'FirstName'"/>
		<sfa:Name>
			<xsl:apply-templates select="../cas:property[cas:key='Individual_NameType'][cas:value!='']" mode="insert-xml-attribute"/>	
			<xsl:apply-templates select="../cas:property[cas:key='PrecedingTitle'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='Title'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			
			<xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">
				<xsl:apply-templates select="../cas:property[cas:key='FirstName_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>	
				
				<xsl:choose>
					<xsl:when test="cas:value!=''">
						<xsl:value-of select="cas:value"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:text>No firstname available</xsl:text>
					</xsl:otherwise>
				</xsl:choose>	
			</xsl:element>
		
			<xsl:apply-templates select="../cas:property[cas:key='MiddleName'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='MiddleName'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='LastName'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='GenerationIdentifier'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='Suffix'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			<xsl:apply-templates select="../cas:property[cas:key='GeneralSuffix'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			
		</sfa:Name>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='LastName'][cas:value='']" mode="insert-attribute-at-will">
		<sfa:LastName>No lastname available</sfa:LastName>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='AddressFixAanwezig']" mode="insert-attribute-cfc">
		
		<xsl:variable name="addressFixValue">
			<xsl:value-of select="../cas:property[cas:key='Street']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='BuildingIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='SuiteIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='FloorIdentifier']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='DistrictName']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='POB']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='Postcode']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='City']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='CountrySubEntity']/cas:value" />
		</xsl:variable>
		
		
		
		
		
		<xsl:if test="$addressFixValue!=''">
		<xsl:variable name="cityValue">
				<xsl:choose>
					<xsl:when test="../cas:property[cas:key='City']/cas:value=''">
						<xsl:text>No city</xsl:text>
					</xsl:when>
					<xsl:otherwise>
						<xsl:value-of select="../cas:property[cas:key='City']/cas:value" />
					</xsl:otherwise>
				</xsl:choose>
			
			</xsl:variable>
		
			<sfa:AddressFix>
				<xsl:apply-templates select="../cas:property[cas:key='Street'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='BuildingIdentifier'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='SuiteIdentifier'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='FloorIdentifier'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='DistrictName'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='POB'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<xsl:apply-templates select="../cas:property[cas:key='Postcode'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
				<sfa:City><xsl:value-of select="$cityValue" /></sfa:City>
				<xsl:apply-templates select="../cas:property[cas:key='CountrySubentity'][cas:value!='']" mode="insert-attribute-at-will-sfa"/>
			</sfa:AddressFix>
		</xsl:if>
	</xsl:template>
	
	
	
	<xsl:template match="cas:property[cas:key='Warning'][cas:value='']|cas:property[cas:key='Contact'][cas:value='']" mode="insert-attribute"/>
	
	<xsl:template match="text()" name="split">
	    <xsl:param name="pText" select="."/>
	    <xsl:param name="nodeName" select="'nonode'"/>
	    <xsl:if test="string-length($pText)">
	     <xsl:element name="sfa:{$nodeName}" namespace="urn:oecd:ties:stffatcatypes:v2">    
          	<xsl:value-of select="substring-before(concat($pText,','),',')"/>
	      </xsl:element>
	  		  <xsl:call-template name="split">
        <xsl:with-param name="pText" select="substring-after($pText, ',')"/>
        <xsl:with-param name="nodeName" select="$nodeName"/>
      </xsl:call-template>
	    </xsl:if>
  </xsl:template>
  
  	<xsl:template match="cas:property[cas:key='MessageRefId']" mode="insert-attribute-sfa">
  		<xsl:variable name="messagerefid" select="cas:value"/>
		<sfa:MessageRefId><xsl:value-of select="$messagerefid"/></sfa:MessageRefId>
		<xsl:apply-templates select="//cas:dataset[@id='MessageSpecCorrMessageRefId' and .//cas:value!=$messagerefid]" mode="add-corr-messageRefIds"/>
	</xsl:template>
</xsl:stylesheet>