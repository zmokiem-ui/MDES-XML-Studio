<?xml version="1.0" encoding="UTF-8"?>
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

	
	<xsl:variable name="recordid" select="1"/>
	<xsl:variable name="parentid" select="2"/>
	<xsl:variable name="reportingfis" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ReportingFI']"/>
	<xsl:variable name="reportinggroups" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ReportingGroup']"/>
	<xsl:variable name="accountreports" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='AccountReport']"/>
	
	<xsl:variable name="nilreports" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='NilReport']"/>
	<xsl:variable name="accountholders" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='AccountHolder']"/>
	<xsl:variable name="controllingpersons" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='ControllingPerson']"/>
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
	<xsl:variable name="MessageTypeIndic" select="/root/PartsToInsert/eventRequest/cas:dataset[cas:label='MessageSpec']/cas:property[cas:key='MessageTypeIndic']/cas:value"/>
	
	
	
	<xsl:template match="/">
		<crs:CRS_OECD xmlns:crs="urn:oecd:ties:crs:v2" xmlns:cfc="urn:oecd:ties:commontypesfatcacrs:v2" xmlns:iso="urn:oecd:ties:isocrstypes:v1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:stf="urn:oecd:ties:crsstf:v5" xsi:schemaLocation="urn:oecd:ties:crs:v2 CrsXML_v2.0.xsd" version="2.0">
			<xsl:apply-templates select="/root/PartsToInsert/eventRequest/cas:dataset[cas:property[cas:key='ParentId']/cas:value=-1]"/>
			<xsl:apply-templates select="/root/PartsToInsert/eventRequest/cas:dataset[cas:property[cas:key='ParentId']/cas:value=0]"/>
		</crs:CRS_OECD>
	</xsl:template>
	
	<xsl:template match="cas:dataset[cas:label='MessageSpec']">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="." mode="insert-attributes"/>
			
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:dataset">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
		<xsl:variable name="countPrecedingSiblingsWithSameId" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='RecordId']/cas:value=$recordId])"/>
		<xsl:variable name="reportingGroupId" select="$reportinggroups[cas:property[cas:key='ParentId']/cas:value=$recordId]/cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="countAccountReportsForFI" select="count(//cas:dataset[cas:property[cas:key='ParentId']/cas:value=$reportingGroupId])"/>
		<xsl:variable name="reportingFIDocRefId" select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$recordId]/cas:property[cas:key='DocRefId']/cas:value" />
		<xsl:variable name="countAccountReportsForFIFromCurrentDocument" select="count(/root/CurrentDocument/*/crs:CrsBody[crs:ReportingFI/crs:DocSpec/stf:DocRefId=$reportingFIDocRefId]/crs:ReportingGroup/*)"/>
		<xsl:if test="$countPrecedingSiblingsWithSameId=0 and ($countAccountReportsForFI &gt; 0 or $countAccountReportsForFIFromCurrentDocument &gt; 0)">
			<xsl:element name="crs:CrsBody" namespace="urn:oecd:ties:crs:v2">
			
				<xsl:apply-templates select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$recordId][position()=1]" mode="insert-reporting-fi"/>
				<xsl:apply-templates select="$reportinggroups[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-reporting-group"/>
				
			</xsl:element>
		</xsl:if>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-reporting-fi">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
	
				
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<crs:ResCountryCode><xsl:value-of select="$sendingCountryCode"/></crs:ResCountryCode>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Name']" mode="insert-attribute"/>
			
			<!-- xsl:apply-templates select="cas:property[cas:key='FilerCategory'][cas:value!='']" mode="insert-attribute"/-->	
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute-reportingFI"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-reporting-group">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="parentId" select="cas:property[cas:key='ParentId']/cas:value"/>
		<xsl:variable name="reportingFI" select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$parentId]" />
		<xsl:variable name="reportingFIDocRefId" select="$reportingfis[cas:property[cas:key='ParentId']/cas:value=$parentId]/cas:property[cas:key='DocRefId']/cas:value" />
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:if test="count($reportingFI/preceding-sibling::cas:dataset[cas:property[cas:key='DocRefId']/cas:value=$reportingFIDocRefId])=0">
				<xsl:copy-of select="/root/CurrentDocument/*/crs:CrsBody[crs:ReportingFI/crs:DocSpec/stf:DocRefId=$reportingFIDocRefId]/crs:ReportingGroup/*" />		
			</xsl:if>
			<xsl:apply-templates select="." mode="insert-attributes"/>
			
			<xsl:apply-templates select="$accountreports[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-account-reports"/>
			<xsl:apply-templates select="$nilreports[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-nil-reports"/>
		</xsl:element>
	</xsl:template>



	<xsl:template match="cas:dataset" mode="insert-nil-reports">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountNumber_1']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$accountholders[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-accountholder"/>
			<xsl:apply-templates select="$controllingpersons[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-controllingpersons"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountBalance']" mode="insert-attribute"/>
			<xsl:apply-templates select="$payments[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-payments"/>
		</xsl:element>
	</xsl:template>



	<xsl:template match="cas:dataset" mode="insert-account-reports">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			
			<xsl:apply-templates select="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountNumber_1']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$accountholders[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-accountholder"/>
			<xsl:apply-templates select="$controllingpersons[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-controllingpersons"/>
			<xsl:apply-templates select="cas:property[cas:key='AccountBalance']" mode="insert-attribute"/>
			<xsl:apply-templates select="$payments[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-payments"/>
		</xsl:element>
	</xsl:template>

	
	<xsl:template match="cas:dataset" mode="insert-payments">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			
			<xsl:apply-templates select="." mode="insert-attributes"/>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-controllingpersons">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		<xsl:variable name="individualCountryCode" select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]/cas:property[cas:key='Individual_CountryCode']/cas:value"/>
		<xsl:if test="contains($individualCountryCode,$deliveryCountryCode)">
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			
			<xsl:apply-templates select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-individuals"/>
			<xsl:apply-templates select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]/cas:property[cas:key='CtrlgPersonType'][cas:value!='']" mode="insert-attribute"/>
		</xsl:element>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-accountholder">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			
			
			<xsl:apply-templates select="$organisations[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-organisations"/>			
			<xsl:apply-templates select="$individuals[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-individuals"/>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="insert-organisations">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="cas:property[cas:key='Organisation_CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-INs"/>
			<xsl:apply-templates select="cas:property[cas:key='Organisation_Name']" mode="insert-attribute"/>	
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
		</xsl:element>
		<xsl:apply-templates select="cas:property[cas:key='AccountHolderTypeCRS']" mode="insert-attribute"/>
		<xsl:apply-templates select="cas:property[cas:key='AccountHolderTypeFATCA']" mode="insert-attribute"/>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-individuals">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="cas:property[cas:key='Individual_CountryCode']" mode="insert-attribute"/>
			<xsl:apply-templates select="$identificationnumbers[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-TINs"/>
			<xsl:apply-templates select="cas:property[cas:key='FirstName']" mode="insert-attribute"/>	
						
			
			<xsl:apply-templates select="$addresses[cas:property[cas:key='ParentId']/cas:value=$recordId]" mode="insert-addresses"/>
			<xsl:apply-templates select="cas:property[cas:key='BirthDate'][cas:value!='']" mode="insert-attribute"/>
						
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-addresses">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="cas:property[cas:key='AddressFix_AddressType'][cas:value!='']" mode="insert-xml-attribute"/>	
			<xsl:apply-templates select="cas:property[cas:key='CountryCode']" mode="insert-attribute-cfc"/>
			<xsl:apply-templates select="cas:property[cas:key='AddressFixAanwezig'][cas:value='true']" mode="insert-attribute-cfc"/>	
			<xsl:apply-templates select="cas:property[cas:key='AdresFree']" mode="insert-attribute-cfc"/>
			
						
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:dataset" mode="insert-TINs">
		<xsl:variable name="nodeName" select="'TIN'"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="cas:property[cas:key='TIN_issuedBy'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:property[cas:key='TIN']/cas:value"/>
						
		</xsl:element>
	</xsl:template>
	<xsl:template match="cas:dataset" mode="insert-INs">
		<xsl:variable name="nodeName" select="'IN'"/>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="recordId" select="cas:property[cas:key='RecordId']/cas:value"/>
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="cas:property[cas:key='TIN_issuedBy'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:property[cas:key='TIN']/cas:value"/>
						
		</xsl:element>
	</xsl:template>



	<xsl:template match="cas:dataset" mode="insert-attributeset">
		<xsl:variable name="nodeName" select="cas:label"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
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
	
	<xsl:template match="cas:property[cas:key='BirthDate']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'BirthDate'"/>
		<crs:BirthInfo>
			<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
				<xsl:value-of select="cas:value"/>
			</xsl:element>
			<xsl:apply-templates select="../cas:property[cas:key='BirthCity'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='BirthCitySubentity'][cas:value!='']" mode="insert-attribute-at-will"/>
			
			<xsl:apply-templates select="../cas:property[cas:key='BirthCountryCode']" mode="insert-attribute"/>
			
		</crs:BirthInfo>
	</xsl:template>
	
	
	
	
	<xsl:template match="cas:label" mode="insert-attribute"/>
	
	<xsl:template match="cas:property[cas:key='SendingCompanyIN']|cas:property[cas:key='PaymentAmntCurrCode']|cas:property[cas:key='AccountReportID']|cas:property[cas:key='CorrDocRefId']|cas:property[cas:key='CorrMessageRefId']|cas:property[cas:key='DocRefId']|cas:property[cas:key='XML']|cas:property[cas:key='Parent']|cas:property[cas:key='ParentId']|cas:property[cas:key='RecordId']|cas:property[cas:key='Operation']" mode="insert-attribute"/>
	
	<xsl:template match="cas:property[cas:key='DocRefId'][cas:value='']" mode="insert-attribute-at-will-stf">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:crsstf:v5">
			<xsl:value-of select="concat($sendingCountryCode, $reportingPeriod, $deliveryCountryCode,'.',$caseId,'.', ../cas:property[cas:key='RecordId']/cas:value)"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='DocRefId'][cas:value!='']" mode="insert-attribute-at-will-stf">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:crsstf:v5">
			<xsl:choose>
				<xsl:when test="../cas:property[cas:key='DocSpec_DocTypeIndic']/cas:value='OECD3' or ../cas:property[cas:key='DocSpec_DocTypeIndic']/cas:value='OECD13'">
					<xsl:value-of select="concat(cas:value,'.1')"/>
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="cas:value"/>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Name']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="../cas:property[cas:key='NameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	

	
	<xsl:template match="cas:property" mode="insert-attribute-cfc">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="cfc:{$nodeName}" namespace="urn:oecd:ties:commontypesfatcacrs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-attribute-at-will-cfc">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="cfc:{$nodeName}" namespace="urn:oecd:ties:commontypesfatcacrs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>

	<xsl:template match="cas:property" mode="insert-attribute-at-will-stf">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:crsstf:v5">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
		
		
	<xsl:template match="cas:property[cas:key='LastName']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="../cas:property[cas:key='LastName_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='MiddleName']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="../cas:property[cas:key='MiddleName_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='NamePrefix']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="cas:key"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:apply-templates select="../cas:property[cas:key='NamePrefix_XNLNameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="cas:key"/>
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
	<xsl:template match="cas:property[cas:key='AddressFix_AddressType']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'legalAddressType'"/>
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
	
	<xsl:template match="cas:property[cas:key='BirthCity']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="'City'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='BirthCitySubentity']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="'CitySubentity'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthFormerCountryName']" mode="insert-attribute-at-will">
		<xsl:variable name="nodeName" select="'FormerCountryName'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='AccountBalanceCurrCode']" mode="insert-xml-attribute">
		<xsl:variable name="nodeName" select="'currCode'"/>
		<xsl:attribute name="{$nodeName}">
			<xsl:value-of select="cas:value"/>
		</xsl:attribute>
	</xsl:template>
	
	
	
	<xsl:template match="cas:property[cas:key='LastName_XNLNameType' or cas:key='FirstName_XNLNameType' or cas:key='MiddleName_XNLNameType' or cas:key='NamePrefix_XNLNameType']" mode="insert-xml-attribute">
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
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
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
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
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
		
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
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
			<xsl:value-of select="../cas:property[cas:key='CountrySubentity']/cas:value" />
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
			<xsl:element name="cfc:{$nodeName}" namespace="urn:oecd:ties:commontypesfatcacrs:v2">
				<xsl:value-of select="$addressFreeValue"/>
			</xsl:element>
		</xsl:if>
	</xsl:template>
	
<xsl:template match="cas:property[cas:key='Postcode']" mode="insert-attribute-at-will-cfc">
		<xsl:variable name="nodeName" select="'PostCode'"/>
		<xsl:element name="cfc:{$nodeName}" >
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Organisation_Name']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'Name'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
		<xsl:apply-templates select="../cas:property[cas:key='Organisation_NameType'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthFormerCountryName']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'FormerCountryName'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
			<xsl:value-of select="cas:value"/>
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='BirthCountryCode']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'CountryCode'"/>
		<xsl:variable name="birthCountryValue">
			<xsl:value-of select="../cas:property[cas:key='BirthFormerCountryName']/cas:value" />
			<xsl:value-of select="../cas:property[cas:key='BirthCountryCode']/cas:value" />
		</xsl:variable>
		<xsl:if test="$birthCountryValue!=''">
			<crs:CountryInfo>
				<xsl:if test="cas:value!=''">
					<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
						<xsl:value-of select="cas:value"/>
					</xsl:element>
				</xsl:if>
				<xsl:apply-templates select="../cas:property[cas:key='BirthFormerCountryName'][cas:value!='']" mode="insert-attribute"/>
			</crs:CountryInfo>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='AccountBalance']" mode="insert-attribute">
		<xsl:variable name="accountClosed" select="../cas:property[cas:key='ClosedAccount']/cas:value"/>
		<xsl:variable name="nodeName" select="'AccountBalance'"/>
		<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
		
		<xsl:apply-templates select="../cas:property[cas:key='AccountBalanceCurrCode'][cas:value!='']" mode="insert-xml-attribute"/>
			<xsl:choose>
				<xsl:when test="$accountClosed='true'">
					<xsl:text>0.00</xsl:text>
				</xsl:when>
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
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD10</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
						<xsl:if test="$MessageTypeIndic='CRS702'">
							<xsl:text>OECD10</xsl:text>
						</xsl:if>
						<xsl:if test="$MessageTypeIndic!='CRS702'">
							<xsl:text>OECD11</xsl:text>
						</xsl:if>
						
					</xsl:when>
					<xsl:when test=".='OECD2' or .='OECD12'">
						<xsl:text>OECD12</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD3' or .='OECD13'">
						<xsl:text>OECD13</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
			<xsl:when test="$environmentUsedForTest='false'">
				<xsl:choose>
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD0</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
						<xsl:if test="$MessageTypeIndic='CRS702'">
							<xsl:text>OECD0</xsl:text>
						</xsl:if>
						<xsl:if test="$MessageTypeIndic!='CRS702'">
							<xsl:text>OECD1</xsl:text>
						</xsl:if>
					</xsl:when>
					<xsl:when test=".='OECD2' or .='OECD12'">
						<xsl:text>OECD2</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD3' or .='OECD13'">
						<xsl:text>OECD3</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
		</xsl:choose>
	
	</xsl:template>
	
	<xsl:template match="cas:value" mode="insert-correct-DocTypeIndic-ReportingFI">
		<xsl:choose>
			<xsl:when test="$environmentUsedForTest='true'">
				<xsl:choose>
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD10</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
						<xsl:if test="$MessageTypeIndic='CRS702'">
							<xsl:text>OECD10</xsl:text>
						</xsl:if>
						<xsl:if test="$MessageTypeIndic!='CRS702'">
							<xsl:text>OECD11</xsl:text>
						</xsl:if>
						
					</xsl:when>
					<xsl:when test=".='OECD2' or .='OECD12'">
						<xsl:text>OECD12</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD3' or .='OECD13'">
						<xsl:text>OECD12</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
			<xsl:when test="$environmentUsedForTest='false'">
				<xsl:choose>
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD0</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
						<xsl:if test="$MessageTypeIndic='CRS702'">
							<xsl:text>OECD0</xsl:text>
						</xsl:if>
						<xsl:if test="$MessageTypeIndic!='CRS702'">
							<xsl:text>OECD1</xsl:text>
						</xsl:if>
					</xsl:when>
					<xsl:when test=".='OECD2' or .='OECD12'">
						<xsl:text>OECD2</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD3' or .='OECD13'">
						<xsl:text>OECD2</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
		</xsl:choose>
	
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute-reportingFI">
		<xsl:variable name="nodeName" select="'DocTypeIndic'"/>
		<crs:DocSpec>
			<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:crsstf:v5">
				<xsl:apply-templates select="cas:value" mode="insert-correct-DocTypeIndic-ReportingFI"/>
			</xsl:element>
			<xsl:apply-templates select="../cas:property[cas:key='DocRefId']" mode="insert-attribute-at-will-stf"/>
			<xsl:apply-templates select="../cas:property[cas:key='CorrDocRefId'][cas:value!='']" mode="insert-attribute-at-will-stf"/>
			
		</crs:DocSpec>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='DocSpec_DocTypeIndic']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'DocTypeIndic'"/>
		<crs:DocSpec>
			<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:crsstf:v5">
				<xsl:apply-templates select="cas:value" mode="insert-correct-DocTypeIndic"/>
			</xsl:element>
			<xsl:apply-templates select="../cas:property[cas:key='DocRefId']" mode="insert-attribute-at-will-stf"/>
			<xsl:apply-templates select="../cas:property[cas:key='CorrDocRefId'][cas:value!='']" mode="insert-attribute-at-will-stf"/>
			
		</crs:DocSpec>
	</xsl:template>

	<xsl:template match="cas:property[cas:key='AccountNumber_1']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'AccountNumber'"/>
		
			<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
				<xsl:apply-templates select="../cas:property[cas:key='AccountReport_AccountNumberType'][cas:value!='']" mode="insert-xml-attribute"/>	
				<xsl:apply-templates select="../cas:property[cas:key='ClosedAccount'][cas:value!='']" mode="insert-xml-attribute"/>
				<xsl:apply-templates select="../cas:property[cas:key='DormantAccount'][cas:value!='']" mode="insert-xml-attribute"/>
				<xsl:apply-templates select="../cas:property[cas:key='UndocumentedAccount'][cas:value!='']" mode="insert-xml-attribute"/>
				<xsl:value-of select="cas:value"/>
			</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='PaymentAmnt']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'PaymentAmnt'"/>
		
			<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
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

	<xsl:template match="cas:property[cas:key='FirstName']" mode="insert-attribute">
		<xsl:variable name="nodeName" select="'FirstName'"/>
		<crs:Name>
			<xsl:apply-templates select="../cas:property[cas:key='Individual_NameType'][cas:value!='']" mode="insert-xml-attribute"/>	
			<xsl:apply-templates select="../cas:property[cas:key='PrecedingTitle'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='Title'][cas:value!='']" mode="insert-attribute-at-will"/>
				<xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">
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
			<xsl:apply-templates select="../cas:property[cas:key='MiddleName'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='NamePrefix'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='LastName']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='GenerationIdentifier'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='Suffix'][cas:value!='']" mode="insert-attribute-at-will"/>
			<xsl:apply-templates select="../cas:property[cas:key='GeneralSuffix'][cas:value!='']" mode="insert-attribute-at-will"/>
		</crs:Name>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='LastName'][cas:value='']" mode="insert-attribute-at-will">
		<crs:LastName>No lastname available</crs:LastName>
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
			<xsl:value-of select="../cas:property[cas:key='CountrySubentity']/cas:value" />
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
		
			<cfc:AddressFix>
				<xsl:apply-templates select="../cas:property[cas:key='Street'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='BuildingIdentifier'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='SuiteIdentifier'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='FloorIdentifier'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='DistrictName'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='POB'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<xsl:apply-templates select="../cas:property[cas:key='Postcode'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
				<cfc:City><xsl:value-of select="$cityValue" /></cfc:City>
				<xsl:apply-templates select="../cas:property[cas:key='CountrySubentity'][cas:value!='']" mode="insert-attribute-at-will-cfc"/>
			</cfc:AddressFix>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="cas:property[cas:key='City'][cas:value=' ']" mode="insert-attribute-at-will">
		<cfc:City>No City available</cfc:City>
	</xsl:template>
	
	<xsl:template match="cas:property[cas:key='Warning'][cas:value='']|cas:property[cas:key='Contact'][cas:value='']" mode="insert-attribute"/>
	
	<xsl:template match="text()" name="split">
	    <xsl:param name="pText" select="."/>
	    <xsl:param name="nodeName" select="'nonode'"/>
	    <xsl:if test="string-length($pText)">
	     <xsl:element name="crs:{$nodeName}" namespace="urn:oecd:ties:crs:v2">    
          	<xsl:value-of select="substring-before(concat($pText,','),',')"/>
	      </xsl:element>
	  		  <xsl:call-template name="split">
        <xsl:with-param name="pText" select="substring-after($pText, ',')"/>
        <xsl:with-param name="nodeName" select="$nodeName"/>
      </xsl:call-template>
	    </xsl:if>
  </xsl:template>
</xsl:stylesheet>