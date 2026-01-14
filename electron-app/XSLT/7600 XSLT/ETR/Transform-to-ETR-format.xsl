<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:bi="http://www.be-informed.nl/BeInformed" 
xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
xmlns:stm="urn:oecd:ties:cbcstm:v2"
xmlns:oecd_etr="urn:oecd:ties:etr:v1"
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
xmlns:etr="urn:oecd:ties:etr:v1" 
xmlns:stf="urn:oecd:ties:etrstf:v1"

exclude-result-prefixes="oecd_etr cas stm iso bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

	<xsl:param name="ReceivingCountry"/>
	<xsl:param name="EnvironmentUsedForTest"/>
	<xsl:param name="MessageRefId"/>
	<xsl:param name="CurrentDateTimestamp"/>
	<xsl:variable name="recordid" select="//cas:property[cas:key='RecordId']/cas:value"/>
	<xsl:variable name="parentid" select="//cas:property[cas:key='ParentId']/cas:value"/>
	
	
	<xsl:template match="/">
		
		<xsl:apply-templates select="*" />
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
			<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
				<xsl:if test="$nodeName='ETR_OECD'">
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
		<etr:UBO>
			<xsl:if test="Person_UBOType!=''">
				<etr:UboType><xsl:value-of select="Person_UBOType"/></etr:UboType>
			</xsl:if>
			
			<xsl:apply-templates select="Person_ResCountryCode"/>
			<xsl:apply-templates select="Person_TIN"/>
			<etr:Name>
				<xsl:apply-templates select="Person_PrecedingTitle"/>			
				<xsl:apply-templates select="Person_Title"/>
				<xsl:apply-templates select="Person_FirstName"/>
				<xsl:apply-templates select="Person_MiddleName"/>
				<xsl:apply-templates select="Person_NamePrefix"/>
				<xsl:apply-templates select="Person_LastName"/>
				<xsl:apply-templates select="Person_GenerationIdentifier"/>
				<xsl:apply-templates select="Person_Suffix"/>
				<xsl:apply-templates select="Person_GeneralSuffix"/>
			</etr:Name>
			<xsl:apply-templates select="Address"/>
			<xsl:apply-templates select="Person_Nationality"/>
			<etr:BirthInfo>
				<xsl:apply-templates select="Person_BirthDate"/>
				<xsl:apply-templates select="Person_BirthCity"/>
				<xsl:if test="Person_BirthCity!=''">
						<etr:City><xsl:value-of select="Person_BirthCity"/></etr:City>
				</xsl:if>
				<xsl:apply-templates select="Person_BirthCitySubentity"/>
				<xsl:if test="Person_BirthCitySubentity!=''">
						<etr:CitySubentity><xsl:value-of select="Person_BirthCitySubentity"/></etr:CitySubentity>
				</xsl:if>
				<xsl:if test="Person_BirthCountryCode!='' or Person_FormerCountryName!=''">
				
				<etr:CountryInfo>
					<xsl:if test="Person_BirthCountryCode!=''">
						<etr:CountryCode><xsl:value-of select="Person_BirthCountryCode"/></etr:CountryCode>
					</xsl:if>
					<xsl:if test="Person_FormerCountryName!='' and Person_BirthCountryCode=''">
						<xsl:apply-templates select="Person_FormerCountryName"/>	
					</xsl:if>
					
				</etr:CountryInfo>
				</xsl:if>
			</etr:BirthInfo>	
						
		</etr:UBO>
	</xsl:template>
	<xsl:template match="etrBody">
		<etr:etrBody>
			<xsl:apply-templates />			
			<etr:DocSpec>
				<stf:DocTypeIndic>
					<xsl:choose>
						<xsl:when test="$EnvironmentUsedForTest='true'">
							<xsl:text>OECD11</xsl:text>
						</xsl:when>
						<xsl:otherwise>OECD1</xsl:otherwise>
					</xsl:choose>
				</stf:DocTypeIndic>
				<stf:DocRefId><xsl:value-of select="concat($MessageRefId,@id)"/></stf:DocRefId>
			</etr:DocSpec>			
		</etr:etrBody>
	</xsl:template>
	<xsl:template match="Address">
	
		<xsl:variable name="LegalAddressType">
			<xsl:value-of select="Address_LegalAddressType"/>
		</xsl:variable>
		<etr:Address>
			<xsl:if test="$LegalAddressType!=''">
				<xsl:attribute name="legalAddressType">
					<xsl:value-of select="Address_LegalAddressType"/>
				</xsl:attribute>
			</xsl:if>
			<xsl:apply-templates select="Address_CountryCode"/>
			<xsl:if test="Address_City != ''">
				<etr:AddressFix>
					<xsl:apply-templates select="*[local-name() != 'Address_CountryCode' and local-name() != 'Address_LegalAddressType' and local-name() != 'Address_AddressFree']"/>
				</etr:AddressFix>
			</xsl:if>
			<xsl:apply-templates select="Address_AddressFree"/>			
		</etr:Address>		
	</xsl:template>
	
	<xsl:template match="ReportableEntity">
		<etr:ReportableEntity>
			<xsl:apply-templates select="Organisation"/>
			<xsl:apply-templates select="ReportableEntity_NameGroup"/>
			<xsl:apply-templates select="ReportableEntity_ReportingReason"/>
			<etr:Period>
				<xsl:apply-templates select="ReportableEntity_StartDate"/>
				<xsl:apply-templates select="ReportableEntity_EndDate"/>
			</etr:Period>
			<xsl:apply-templates select="Activities"/>
			<xsl:apply-templates select="Summary"/>
		</etr:ReportableEntity>
	</xsl:template>
	
	
	<xsl:template match="Activities">
		<etr:Activities>
			<xsl:variable name="nodeName">
				<xsl:value-of select="KeyData/KeyData_KeyDataType"/>
			</xsl:variable>
			
			<etr:KeyData>
				<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
					<xsl:apply-templates select="KeyData"/>
				</xsl:element>
			</etr:KeyData>
			<etr:AnnualIncome>
				<xsl:attribute name="currCode">
					<xsl:value-of select="Activities_AnnualIncomeCurrency"/>
				</xsl:attribute>
				<xsl:value-of select="Activities_AnnualIncome"/>
			</etr:AnnualIncome>
			
			<xsl:if test="Activities_NetbookValue != ''">
				<etr:NetBookValue>
					<xsl:attribute name="currCode">
						<xsl:value-of select="Activities_NetbookValueCurrency"/>
					</xsl:attribute>
					<xsl:value-of select="Activities_NetbookValue"/>
				</etr:NetBookValue>
			</xsl:if>
			
		</etr:Activities>
	
	</xsl:template>
	
	<xsl:template match="KeyData">		
			<xsl:apply-templates select="KeyData_TypeIncome"/>
			<xsl:if test="KeyData_GrossIncome != ''">
				<etr:GrossIncome>
					<xsl:attribute name="currCode">
						<xsl:value-of select="KeyData_GrossIncomeCurrency"/>
					</xsl:attribute>
					<xsl:value-of select="KeyData_GrossIncome"/>
				</etr:GrossIncome>
			</xsl:if>
			<xsl:if test="KeyData_Expenses_Direct != '' and KeyData_Expenses_Outsourcing!=''">
			<etr:Expenses>
				<etr:Direct>
					<xsl:choose>
						<xsl:when test="KeyData_Expenses_Direct != ''">
							<xsl:attribute name="currCode">
								<xsl:value-of select="KeyData_Expenses_Direct_CurrCode"/>
							</xsl:attribute>
							<xsl:value-of select="KeyData_Expenses_Direct"/>
						</xsl:when>
						<xsl:otherwise>
							<etr:Direct>
								<xsl:choose>
									<xsl:when test="KeyData_Expenses_Direct= ''">
											<xsl:attribute name="currCode">
												<xsl:value-of select="KeyData_Expenses_Outsourcing_CurrCode"/>
											</xsl:attribute>
											<xsl:text>0</xsl:text>
									</xsl:when>
									<xsl:otherwise>
										<xsl:attribute name="currCode">
											<xsl:value-of select="KeyData_Expenses_Direct_CurrCode"/>
										</xsl:attribute>
										<xsl:value-of select="KeyData_Expenses_Direct"/>
									</xsl:otherwise>
								</xsl:choose>
							</etr:Direct>
						</xsl:otherwise>
					</xsl:choose>				
				</etr:Direct>
				
				<etr:Outsourcing>
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
				</etr:Outsourcing>
				
				
			</etr:Expenses>
			</xsl:if>
			<xsl:apply-templates select="KeyData_Employees"/>
		
	</xsl:template>
	
	<xsl:template match="Organisation/Name|ReportableEntity/Summary">
		<xsl:apply-templates/>
	</xsl:template>
	
	<xsl:template match="*[local-name()='Message_Timestamp']">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
			<xsl:value-of select="$CurrentDateTimestamp"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_issuedBy')]"/>
		
		
	<xsl:template match="IN">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
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
			<xsl:value-of select="IN_IdentificationNumber"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_TIN')]">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
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
		<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
			<xsl:value-of select="$ReceivingCountry"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*[contains(local-name(),'_MessageRefId')]">
		<xsl:variable name="nodeName">
			<xsl:apply-templates select="." mode="nodeName"/>
		</xsl:variable>
		<xsl:variable name="identifier" select="@id"/>
		<xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">
			<xsl:value-of select="$MessageRefId"/>
		</xsl:element>
		
	</xsl:template>
	
	<xsl:template match="*" mode="nodeName">
		<xsl:choose>
			<xsl:when test="contains(local-name(),'_') and local-name()!='etr_OECD'">
				<xsl:value-of select="substring-after(local-name(),'_')"/>
			</xsl:when>
			<xsl:otherwise><xsl:value-of select="local-name()"/></xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<xsl:template match="PersonType[PersonType_PersonRole='ExchangeNexus']">
		<etr:ExchangeNexus>
			<etr:ID>
				<xsl:apply-templates select="Person|Organisation"/>
				<xsl:apply-templates select="NexusType"/>
			</etr:ID>
			<etr:Nexus><xsl:value-of select="PersonType_NexusType"/></etr:Nexus>
		</etr:ExchangeNexus>
	
	</xsl:template>
	
	<xsl:template match="PersonType[PersonType_PersonRole='RelatedPerson']">
		<etr:RelatedPerson>
			<etr:ID>
				<xsl:apply-templates select="Person|Organisation"/>
				<xsl:apply-templates select="NexusType"/>
			</etr:ID>
			<etr:Nexus><xsl:value-of select="PersonType_NexusType"/></etr:Nexus>
		</etr:RelatedPerson>
	
	</xsl:template>

	
	<xsl:template match="Organisation">
		<etr:Entity>
			<xsl:apply-templates select="Organisation_ResCountryCode"/>
			<xsl:apply-templates select="Organisation_TIN"/>
			<xsl:apply-templates select="IN"/>
			<xsl:apply-templates select="Name"/>
			<xsl:apply-templates select="Address"/>
	
		</etr:Entity>
	</xsl:template>
	
	<xsl:template match="NexusType">
		<etr:Nexus>
			<xsl:apply-templates/>
		</etr:Nexus>
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
	     <xsl:element name="etr:{$nodeName}" namespace="urn:oecd:ties:etr:v1">    
          	<xsl:value-of select="substring-before(concat($pText,','),',')"/>
	      </xsl:element>
	  		  <xsl:call-template name="split">
        <xsl:with-param name="pText" select="substring-after($pText, ',')"/>
        <xsl:with-param name="nodeName" select="$nodeName"/>
      </xsl:call-template>
	    </xsl:if>
  </xsl:template>
  
 
	
	

</xsl:stylesheet>