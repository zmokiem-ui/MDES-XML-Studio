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
xmlns:ntj="urn:oecd:ties:ntj:v1" 
xmlns:stf="urn:oecd:ties:ntjstf:v1"

exclude-result-prefixes="oecd_ntj cas stm iso bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	
	<xsl:param name="EnvironmentUsedForTest"/>
	<xsl:param name="MessageRefId"/>
	<xsl:param name="CurrentDateTimestamp"/>
	
	<xsl:variable name="ReceivingCountry" select="//*[local-name()='Message_ReceivingCountry']"/>
	<xsl:variable name="SubmittingCountry" select="//*[local-name()='Message_TransmittingCountry']"/>
	<xsl:variable name="recordid" select="//cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentid" select="//cas:property[cas:key='ParentId']/cas:value"/>
	
	
	
	<xsl:template match="/">
		<xsl:apply-templates select="*" />
	</xsl:template>
	
	<xsl:template match="NTJ_OECD">
		<ntj:NTJ_OECD version="1.0">
			<xsl:apply-templates select="//MessageSpec" />
			<xsl:apply-templates select="//NtjBody" />
		</ntj:NTJ_OECD>
	</xsl:template>
	
	
	<xsl:template match="Message_ReportingPeriodYear|Person_BirthCitySubentity|Person_BirthCity|Summary_Attribute_Language|Person_Individual_NameType|Person_NameLabel|Person_PersonRole|Address_Address|Message_Version|Message_SendingEntityIN|Message_TransmittingCountryName|Organisation_UniqueIdentifier|Organisation_OrganisationRole"/>
	<xsl:template match="*[contains(local-name(),'HelpText')]|*[contains(local-name(),'NationalityName')]|*[contains(local-name(),'CountryCodeName')]|*[contains(local-name(),'issuedByName')]" priority="100"/>
	
	<xsl:template match="*">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="nodeValue">
			<xsl:value-of select="."/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:if test="$nodeValue!=''">
			<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
				<xsl:if test="$nodeName='NTJ_OECD'">
					<xsl:attribute name="version">1.0</xsl:attribute>
				</xsl:if>
				<xsl:if test="$nodeName='Summary'">
					<xsl:attribute name="language">
							<xsl:choose>
								<xsl:when test="not(../Summary_Attribute_Language) or ../Summary_Attribute_Language=''">EN</xsl:when>
								<xsl:otherwise><xsl:value-of select="../Summary_Attribute_Language"/></xsl:otherwise>
							</xsl:choose>
						</xsl:attribute>
				</xsl:if>
				<xsl:if test="$nodeName='LastName' and ../Person_LastNameType!=''">
					<xsl:attribute name="xnlNameType">
						<xsl:value-of select="../Person_LastNameType"/>
					</xsl:attribute>
				</xsl:if>
				<xsl:if test="$nodeName='FirstName' and ../Person_FirstNameType!=''">
					<xsl:attribute name="xnlNameType">
						<xsl:value-of select="../Person_FirstNameType"/>
					</xsl:attribute>
				</xsl:if>
				<xsl:if test="$nodeName='MiddleName' and ../Person_MiddleNameType!=''">
					<xsl:attribute name="xnlNameType">
						<xsl:value-of select="../Person_MiddleNameType"/>
					</xsl:attribute>
				</xsl:if>
				<xsl:if test="$nodeName='NamePrefix' and ../Person_NamePrefixType!=''">
					<xsl:attribute name="xnlNameType">
						<xsl:value-of select="../Person_NamePrefixType"/>
					</xsl:attribute>
				</xsl:if>
				
				<xsl:apply-templates select="*[count(*) &gt; 0]"/>
				<xsl:apply-templates select="*[count(*) = 0]"/>
				<xsl:if test="count(*) = 0">
					<xsl:value-of select="."/>
				</xsl:if>
			</xsl:element>		
		</xsl:if>
	</xsl:template>
	<xsl:template match="Person">
		<ntj:UBO>
			<xsl:if test="Person_UBOType!=''">
				<ntj:UboType><xsl:value-of select="Person_UBOType"/></ntj:UboType>
			</xsl:if>
			
			<xsl:apply-templates select="Person_ResCountryCode"/>
			<xsl:apply-templates select="Person_TIN"/>
			<ntj:Name>
				<xsl:apply-templates select="Person_PrecedingTitle"/>			
				<xsl:apply-templates select="Person_Title"/>
				<xsl:apply-templates select="Person_FirstName"/>
				<xsl:apply-templates select="Person_MiddleName"/>
				<xsl:apply-templates select="Person_NamePrefix"/>
				<xsl:apply-templates select="Person_LastName"/>
				<xsl:apply-templates select="Person_GenerationIdentifier"/>
				<xsl:apply-templates select="Person_Suffix"/>
				<xsl:apply-templates select="Person_GeneralSuffix"/>
			</ntj:Name>
			<xsl:apply-templates select="Address"/>
			<xsl:apply-templates select="Person_Nationality"/>
			
			
			<xsl:variable name="BirthInfoText">
				<xsl:value-of select="Person_BirthDate"/>
				<xsl:value-of select="Person_BirthCity"/>
			</xsl:variable>
			<xsl:if test="$BirthInfoText != ''">
				<ntj:BirthInfo>
					<xsl:variable name="Person_BirthDate" select="Person_BirthDate"/>
					<xsl:variable name="Person_BirthCity" select="Person_BirthCity"/>
					<xsl:if test="$Person_BirthCity!=''">
							<ntj:City><xsl:value-of select="$Person_BirthCity"/></ntj:City>
					</xsl:if>
					<xsl:variable name="Person_BirthCitySubentity" select="Person_BirthCitySubentity"/>
					<xsl:if test="$Person_BirthCitySubentity!=''">
							<ntj:CitySubentity><xsl:value-of select="$Person_BirthCitySubentity"/></ntj:CitySubentity>
					</xsl:if>
					<xsl:variable name="Person_BirthCountryCode" select="Person_BirthCountryCode"/>
					<xsl:variable name="Person_FormerCountryName" select="Person_FormerCountryName"/>
					<xsl:if test="$Person_BirthCountryCode!='' or Person_FormerCountryName!=''">
					
						<ntj:CountryInfo>
							<xsl:if test="$Person_BirthCountryCode!=''">
								<ntj:CountryCode><xsl:value-of select="$Person_BirthCountryCode"/></ntj:CountryCode>
							</xsl:if>
							<xsl:if test="$Person_FormerCountryName!='' and $Person_BirthCountryCode=''">
								<xsl:apply-templates select="Person_FormerCountryName"/>	
							</xsl:if>
							
						</ntj:CountryInfo>
					</xsl:if>
				</ntj:BirthInfo>	
			</xsl:if>
						
		</ntj:UBO>
	</xsl:template>
	<xsl:template match="NtjBody">
		<ntj:NtjBody>
			<xsl:apply-templates select="*[local-name()!='DocSpec']"/>
			<xsl:apply-templates select="*[local-name()='DocSpec']"/>
		</ntj:NtjBody>
	</xsl:template>
	
	
	
	<xsl:template match="Address">
	
		<xsl:variable name="LegalAddressType">
			<xsl:value-of select="Address_LegalAddressType"/>
		</xsl:variable>
		<ntj:Address>
			<xsl:if test="$LegalAddressType!=''">
				<xsl:attribute name="legalAddressType">
					<xsl:value-of select="Address_LegalAddressType"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:apply-templates select="Address_CountryCode"/>
			<xsl:if test="Address_City != ''">
				<ntj:AddressFix>
					<xsl:apply-templates select="*[local-name() != 'Address_CountryCode' and local-name() != 'Address_LegalAddressType' and local-name() != 'Address_AddressFree']"/>
				</ntj:AddressFix>
			</xsl:if>
			<xsl:apply-templates select="Address_AddressFree"/>			
		</ntj:Address>		
	</xsl:template>
	
	<xsl:template match="ReportableEntity">
		<ntj:ReportableEntity>
			<xsl:apply-templates select="Organisation"/>
			<xsl:apply-templates select="ReportableEntity_NameGroup"/>
			<xsl:apply-templates select="ReportableEntity_ReportingReason"/>
			<ntj:Period>
				<xsl:apply-templates select="ReportableEntity_StartDate"/>
				<xsl:apply-templates select="ReportableEntity_EndDate"/>
			</ntj:Period>
			<xsl:apply-templates select="Activities"/>
			<xsl:apply-templates select="Summary"/>
		</ntj:ReportableEntity>
	</xsl:template>
	
	
	<xsl:template match="Activities">
		<xsl:variable name="nodeName">
				<xsl:value-of select="KeyData/KeyData_KeyDataType"/>
		</xsl:variable>
		<xsl:if test="$nodeName!=''">
			<ntj:Activities>
				
				
				<ntj:KeyData>
					<xsl:apply-templates select="KeyData" mode="group-keydatatype"/>
					
				</ntj:KeyData>
				<ntj:AnnualIncome>
					<xsl:attribute name="currCode">
						<xsl:value-of select="Activities_AnnualIncomeCurrency"/>
					</xsl:attribute>
					<xsl:value-of select="Activities_AnnualIncome"/>
				</ntj:AnnualIncome>
				
				<xsl:if test="Activities_NetbookValue != ''">
					<ntj:NetBookValue>
						<xsl:attribute name="currCode">
							<xsl:value-of select="Activities_NetbookValueCurrency"/>
						</xsl:attribute>
						<xsl:value-of select="Activities_NetbookValue"/>
					</ntj:NetBookValue>
				</xsl:if>
				
			</ntj:Activities>
		</xsl:if>
	</xsl:template>
	<xsl:template match="KeyData" mode="group-keydatatype">
		<xsl:variable name="nodeName">
			<xsl:value-of select="KeyData_KeyDataType"/>
		</xsl:variable>
		<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
			<xsl:apply-templates select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="KeyData">		
			<xsl:apply-templates select="KeyData_TypeIncome"/>
			<xsl:if test="KeyData_GrossIncome != ''">
				<ntj:GrossIncome>
					<xsl:attribute name="currCode">
						<xsl:value-of select="KeyData_GrossIncomeCurrency"/>
					</xsl:attribute>
					<xsl:value-of select="KeyData_GrossIncome"/>
				</ntj:GrossIncome>
			</xsl:if>
			<xsl:if test="KeyData_Expenses_Direct != '' or KeyData_Expenses_Outsourcing!=''">
			<ntj:Expenses>
				<ntj:Direct>
					<xsl:choose>
						<xsl:when test="KeyData_Expenses_Direct != ''">
							<xsl:attribute name="currCode">
								<xsl:value-of select="KeyData_Expenses_Direct_CurrCode"/>
							</xsl:attribute>
							<xsl:value-of select="KeyData_Expenses_Direct"/>
						</xsl:when>
						<xsl:otherwise>
							<xsl:attribute name="currCode">
								<xsl:value-of select="KeyData_Expenses_Outsourcing_CurrCode"/>
							</xsl:attribute>
							<xsl:text>0</xsl:text>
						</xsl:otherwise>
					</xsl:choose>				
				</ntj:Direct>
				
				<ntj:Outsourcing>
					<xsl:choose>
						<xsl:when test="KeyData_Expenses_Outsourcing= ''">
								<xsl:attribute name="currCode">
									<xsl:value-of select="KeyData_Expenses_Direct_CurrCode"/>
								</xsl:attribute>
								<xsl:text>0</xsl:text>
						</xsl:when>
						<xsl:otherwise>
							<xsl:attribute name="currCode">
								<xsl:value-of select="KeyData_Expenses_Outsourcing_CurrCode"/>
							</xsl:attribute>
							<xsl:value-of select="KeyData_Expenses_Outsourcing"/>
						</xsl:otherwise>
					</xsl:choose>
				</ntj:Outsourcing>
				
				
			</ntj:Expenses>
			</xsl:if>
			<xsl:apply-templates select="KeyData_Employees"/>
		
	</xsl:template>
	
	<xsl:template match="Organisation/Name|ReportableEntity/Summary">
		<xsl:apply-templates/>
	</xsl:template>
	
	<xsl:template match="*[local-name()='DocSpec_DocTypeIndic']">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:ntjstf:v1">
			<xsl:choose>
			<xsl:when test="$EnvironmentUsedForTest='true'">
				<xsl:choose>
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD10</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
							<xsl:text>OECD11</xsl:text>
						
					</xsl:when>
					<xsl:when test=".='OECD2' or .='OECD12'">
						<xsl:text>OECD12</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD3' or .='OECD13'">
						<xsl:text>OECD13</xsl:text>
					</xsl:when>
				</xsl:choose>	
			</xsl:when>
			<xsl:when test="$EnvironmentUsedForTest='false'">
				<xsl:choose>
					<xsl:when test=".='OECD0' or .='OECD10'">
						<xsl:text>OECD0</xsl:text>
					</xsl:when>
					<xsl:when test=".='OECD1' or .='OECD11'">
						<xsl:text>OECD1</xsl:text>
						
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
			
			
				
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="*[local-name()='DocSpec_DocRefId']">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:element name="stf:{$nodeName}" namespace="urn:oecd:ties:ntjstf:v1">
			<xsl:value-of select="concat($SubmittingCountry,$ReceivingCountry,.)"/>
		</xsl:element>
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='Message_Timestamp']">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
			<xsl:value-of select="$CurrentDateTimestamp"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_issuedBy')]"/>
		
		
	<xsl:template match="IN">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:variable name="IN_IdentificationNumber" select="IN_IdentificationNumber"/>
		<xsl:if test="$IN_IdentificationNumber!=''">
			<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
				<xsl:if test="IN_INissuedBy!=''">
					<xsl:attribute name="issuedBy">
						<xsl:value-of select="IN_INissuedBy"/>
					</xsl:attribute>
				</xsl:if>
				<xsl:if test="IN_INType!=''">
					<xsl:attribute name="INType">
						<xsl:value-of select="IN_INType"/>
					</xsl:attribute>
				</xsl:if>
				<xsl:value-of select="$IN_IdentificationNumber"/>
			</xsl:element>
		</xsl:if>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_TIN')]">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
			<xsl:variable name="issuedby" select="../*[contains(local-name(),'_issuedBy')]|../*[contains(local-name(),'_TINissuedBy')]"/>
			<xsl:if test="$issuedby!=''">
				<xsl:attribute name="issuedBy">
					<xsl:value-of select="$issuedby"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:value-of select="."/>
		</xsl:element>		
	</xsl:template>
	
	
		
	<xsl:template match="*[contains(local-name(),'_ReceivingCountry')]">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
			<xsl:value-of select="$ReceivingCountry"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_MessageRefId')]">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">
			<xsl:value-of select="."/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*" mode="nodeName">
		<xsl:choose>
			<xsl:when test="contains(local-name(),'_') and local-name()!='NTJ_OECD'">
				<xsl:value-of select="substring-after(local-name(),'_')"/>
			</xsl:when>
			<xsl:otherwise><xsl:value-of select="local-name()"/></xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<xsl:template match="PersonType[PersonType_PersonRole='ExchangeNexus']">
		<ntj:ExchangeNexus>
			<ntj:ID>
				<xsl:apply-templates select="Person|Organisation"/>
				<xsl:apply-templates select="NexusType"/>
			</ntj:ID>
			<ntj:Nexus><xsl:value-of select="PersonType_NexusType"/></ntj:Nexus>
		</ntj:ExchangeNexus>
	
	</xsl:template>
	
	<xsl:template match="PersonType[PersonType_PersonRole='RelatedPerson']">
		<ntj:RelatedPerson>
			<ntj:ID>
				<xsl:apply-templates select="Person|Organisation"/>
				<xsl:apply-templates select="NexusType"/>
			</ntj:ID>
			<ntj:Nexus><xsl:value-of select="PersonType_NexusType"/></ntj:Nexus>
		</ntj:RelatedPerson>
	
	</xsl:template>

	
	<xsl:template match="Organisation">
		<ntj:Entity>
			<xsl:apply-templates select="Organisation_ResCountryCode"/>
			<xsl:apply-templates select="Organisation_TIN"/>
			<xsl:apply-templates select="IN"/>
			<xsl:apply-templates select="Name"/>
			<xsl:apply-templates select="Address"/>
	
		</ntj:Entity>
	</xsl:template>
	
	<xsl:template match="NexusType">
		<ntj:Nexus>
			<xsl:apply-templates/>
		</ntj:Nexus>
	</xsl:template>
	
	<xsl:template match="PersonRole|PersonType"/>
	
	<xsl:template match="Person_Nationality">
		<xsl:apply-templates select="text()" name="split">
			<xsl:with-param name="pText" select="."/>
			<xsl:with-param name="nodeName">Nationality</xsl:with-param>
		</xsl:apply-templates>	
	
	</xsl:template>
	<xsl:template match="Organisation_ResCountryCode|Person_ResCountryCode">
		<xsl:apply-templates select="text()" name="split">
			<xsl:with-param name="pText" select="."/>
			<xsl:with-param name="nodeName"><xsl:apply-templates select="." mode="nodeName"/></xsl:with-param>
		</xsl:apply-templates>	
	
	</xsl:template>
	
	<xsl:template match="text()" name="split">
	    <xsl:param name="pText" select="."/>
	    <xsl:param name="nodeName" select="'nonode'"/>
	    <xsl:if test="string-length($pText)">
	     <xsl:element name="ntj:{$nodeName}" namespace="urn:oecd:ties:ntj:v1">    
          	<xsl:value-of select="substring-before(concat($pText,','),',')"/>
	      </xsl:element>
	  		  <xsl:call-template name="split">
        <xsl:with-param name="pText" select="substring-after($pText, ',')"/>
        <xsl:with-param name="nodeName" select="$nodeName"/>
      </xsl:call-template>
	    </xsl:if>
  </xsl:template>
  
 
	
	

</xsl:stylesheet>