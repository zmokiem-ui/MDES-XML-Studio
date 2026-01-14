<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="2.0" 
				xmlns:oecd_ftc="urn:fatcacrs:ties:v2" 
				xmlns:sfa="urn:oecd:ties:stffatcatypes:v2"
   				xmlns:sfa_ftc="urn:oecd:ties:fatcacrstypes:v2"
   				xmlns:xs="http://www.w3.org/2001/XMLSchema"
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
				xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
			    xmlns:attachment="http://schemas.beinformed.nl/beinformed/v3/services/caseservice/attachments"
			    xmlns:xop="http://www.w3.org/2004/08/xop/include" 
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	<xsl:param name="EnvironmentUsedForTest" />
	<xsl:param name="Country_Code_Provision" />
	<xsl:param name="PartnerJurisdictions" />
	<xsl:param name="IsDomestic" select="true()"/>
    <xsl:param name="IsForeign" select="false()"/>
    <xsl:param name="TypeUpload"/>
    <xsl:param name="CurrentDate"/>
	 <xsl:param name="Verdragen"/>
	
	
	<xsl:variable name="AlleTweeLetterCodes" select="'SX,AS,AW,BQ,GF,PF,TF,GP,GU,HK,MO,MQ,YT,NC,PR,RE,BL,MF,PM,SJ,TW,UM,VI,WF,AX,VG,CW,GG,JE,MS,IM,AI,BV,IO,CX,CC,FO,FK,GI,GL,HM,KY,NU,NF,PN,SH,TK,TC,GS,AF,AL,DZ,AD,AO,AG,AR,AM,AU,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,MM,BO,BA,BW,BR,BN,BG,BF,BI,KH,CA,CF,CL,CN,CO,KM,CD,CG,CR,CU,CY,DK,DJ,DO,DM,DE,EC,EG,SV,GQ,ER,EE,ET,FJ,PH,FI,FR,GA,GM,GE,GH,GD,GR,GB,GT,GW,GN,GY,HT,HN,HU,IE,IS,IN,ID,IQ,IR,IL,IT,CI,JM,JP,YE,JO,CV,CM,KZ,KE,KG,KI,KW,HR,LA,LS,LV,LB,LR,LY,LI,LT,LU,MK,MG,MW,MV,MY,ML,MT,MA,MH,MR,MU,MX,FM,MD,MC,MN,ME,MZ,NA,NR,NL,NP,NI,NZ,NG,NE,KP,MP,NO,UA,UZ,OM,TL,AT,PK,PW,PA,PG,PY,PE,PL,PT,QA,RO,RW,RU,SB,SM,ST,SA,SN,RS,SC,SL,SG,KN,LC,VC,SI,SK,SO,ES,LK,SD,SR,SZ,SY,TJ,TZ,TH,TG,TO,TT,TD,CZ,TN,TR,TM,TV,UG,UY,VU,VA,VE,AE,US,VN,WS,ZM,ZW,ZA,KR,SE,CH,AQ,BM,CK,PS,SS,EH,XX'" />
	
	<xsl:variable name="MessageRefId" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='MessageRefId']"/>
	<xsl:variable name="TransmittingCountry" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='TransmittingCountry']"/>
	<xsl:variable name="ReceivingCountry" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='ReceivingCountry']"/>
	
	
	<xsl:variable name="SendingCompanyIN" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='SendingCompanyIN']"/>
	<xsl:variable name="ReportingPeriod" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='ReportingPeriod']"/>
	<xsl:variable name="MessageTypeIndic" select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']/*[local-name()='MessageTypeIndic']"/>

	
	
    <xsl:variable name="TaxYear" select="substring($ReportingPeriod,0,5)"/>
    
	
	
	<xsl:variable name="allDocRefIds" select="//*[local-name()='DocRefId']"/>
	<xsl:variable name="allCorrDocRefIds" select="//*[local-name()='CorrDocRefId']"/>

	<xsl:variable name="DocIsCRS" select="$TypeUpload = 'TypeUpload_CRSXML'"/>
	<xsl:variable name="DocIsFC" select="$TypeUpload = 'TypeUpload_UploadFCEXML'"/>
	
	
	<xsl:variable name="CRSOnly" select="not(contains($Verdragen,'FATCA'))"/>
	
	<xsl:template match="*[local-name()='MessageBody' or local-name()='CrsBody']">		
	   <xsl:apply-templates select="*[local-name()='ReportingFI']" />
	   <xsl:apply-templates select="*[local-name()='ReportingGroup']" />
	   <xsl:apply-templates select="." mode="Error-50010" />
		<xsl:apply-templates select="." mode="Error-50011" />
	   <xsl:apply-templates select="." mode="Error-60007" />
	   <xsl:apply-templates select="." mode="Error-80000" />
	   <xsl:apply-templates select="." mode="Error-80011" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='ReportingFI']">
		<xsl:apply-templates select="*[local-name()='Address']" />
		<xsl:apply-templates select="*[local-name()='DocSpec']" />
		<xsl:apply-templates select="*[local-name()='Name']" />
		<xsl:if test="$DocIsFC">
			<xsl:apply-templates select="." mode="Error-TIN" />
			<xsl:apply-templates select="." mode="Error-FilerCategory" />

			<xsl:apply-templates select="." mode="Error-FilerCategoryValueForReportingFI" />
			<xsl:apply-templates select="." mode="Error-FilerCategoryForbiddenForReportingFI" />
			<xsl:apply-templates select="." mode="Error-FilerCategoryIsVerplichtVoorReportingFI" />

			
		</xsl:if>
		<xsl:if test="$DocIsCRS">
			<xsl:apply-templates select="." mode="Error-IN" />
		</xsl:if>
		<xsl:apply-templates select="." mode="Error-60013" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='ReportingGroup']">
		<xsl:apply-templates select="*[local-name()='AccountReport']" />
		<xsl:apply-templates select="*[local-name()='Sponsor']" />
		<xsl:apply-templates select="*[local-name()='NilReport']" />		
		
		<xsl:apply-templates select="." mode="Error-60009" />
		<xsl:apply-templates select="." mode="Error-60010" />
	</xsl:template>
	<xsl:template match="*[local-name()='Sponsor']">	
		<xsl:apply-templates select="." mode="Error-60008" />
		<xsl:apply-templates select="." mode="Error-FilerCategoryVerplichtVoorSponsor" />
		<xsl:apply-templates select="." mode="Error-FilerCategoryValueForSponsor" />
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='NilReport']">	
		<xsl:apply-templates select="." mode="Error-AlsMessageTypeIndicCRS701DanMagDeReportingGroupGeenNilReportBevatten" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountReport']">
		<xsl:apply-templates select="*[local-name()='AccountNumber']" />
		<xsl:apply-templates select="*[local-name()='AccountHolder']" />
		<xsl:apply-templates select="*[local-name()='SubstantialOwner']" />
		<xsl:apply-templates select="*[local-name()='ControllingPerson']" />
		<xsl:apply-templates select="*[local-name()='AccountBalance']" />
		<xsl:apply-templates select="*[local-name()='Payment']" />
	 	
	 	<xsl:apply-templates select="*[local-name()='DocSpec']" />
	 	<xsl:apply-templates select="." mode="Error-NietlegeLeveringInCRS703Bestand" />
	 	
	 	<xsl:if test="$IsForeign">
		 	<xsl:apply-templates select="." mode="Error-ResCountryCodeNotReceivingCountry" />
	 	</xsl:if>
	 	<xsl:apply-templates select="." mode="Error-60005" />
	 	<xsl:apply-templates select="." mode="Error-60006" />
	 	<xsl:apply-templates select="." mode="Error-60014" />
	 	
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountHolder']">
	 	<xsl:apply-templates select="*[local-name()='Individual']" />
	 	<xsl:apply-templates select="*[local-name()='Organisation']" />
	 	<xsl:apply-templates select="." mode="Error-98002" />
	 	<xsl:apply-templates select="." mode="Error-60016" />	 		 	
	</xsl:template>

	<xsl:template match="*[local-name()='SubstantialOwner']">
	 	<xsl:apply-templates select="*[local-name()='Individual']" /> 	 		 	
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountNumber']">
		<xsl:apply-templates select="." mode="Error-70019" />
		<xsl:apply-templates select="." mode="Error-98001" />	
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountBalance']">
		<xsl:apply-templates select="." mode="Error-60002" />
		<xsl:apply-templates select="." mode="Error-60003" />		
		<xsl:apply-templates select="." mode="Error-98004" />	
		<xsl:apply-templates select="." mode="Error-98006" />
			
	</xsl:template>
	
	<xsl:template match="*[local-name()='Payment']">
		<xsl:apply-templates select="*[local-name()='PaymentAmnt']" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='PaymentAmnt']">
		<xsl:apply-templates select="." mode="Error-98005" />	
	</xsl:template>
	
	<xsl:template match="*[local-name()='ControllingPerson']">
		
	 	<xsl:apply-templates select="*[local-name()='Individual']" />
	 	<xsl:apply-templates select="*[local-name()='Name']" />
	</xsl:template>
	
		
	<xsl:template match="*[local-name()='SubstantialOwner']">
	 	<xsl:apply-templates select="*[local-name()='Individual']" />
	 	<xsl:apply-templates select="." mode="Error-SubstantialOwnerNotUS" />
	 	
	</xsl:template>
	
	<xsl:template match="*[local-name()='Individual']">
		<xsl:apply-templates select="*[local-name()='ResCountryCode']" mode="Error-GerapporteerdLandIsGeenDoorgeefland"/>
		<xsl:apply-templates select="*[local-name()='Name']" />
	 	<xsl:apply-templates select="*[local-name()='Address']" />
	 	<xsl:apply-templates select="*[local-name()='BirthInfo']" />
	 	
	 	<xsl:if test="$DocIsFC">
			<xsl:apply-templates select="." mode="Error-TIN" />
		</xsl:if>
		<xsl:if test="$DocIsCRS">
			<xsl:apply-templates select="." mode="Error-TIN" />
		</xsl:if>
		
		
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='Organisation']">
	 	<xsl:apply-templates select="*[local-name()='Address']" />
	 	<xsl:apply-templates select="*[local-name()='Name']" />
	 	
		<xsl:if test="$DocIsFC">
			<xsl:apply-templates select="." mode="Error-TIN" />
			<xsl:if test="not($CRSOnly)">
			 <xsl:apply-templates select="." mode="Error-AcctHolderTypeFATCA" />
			</xsl:if>
		</xsl:if>
		<xsl:apply-templates select="." mode="Error-AcctHolderTypeCRS" />
		
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='Address']">
		<xsl:apply-templates select="*[local-name()='CountryCode']" mode="Error-CountryCode" />
		<xsl:apply-templates select="." mode="Error-AddressFix" />
		<xsl:apply-templates select="." mode="Error-AddressFree" />
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='BirthInfo']">
		<xsl:apply-templates select="." mode="Error-60014" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='DocSpec']">		
		<xsl:apply-templates select="*[local-name()='DocRefId']" mode="Error-80001" />
		<xsl:apply-templates select="*[local-name()='CorrDocRefId']" mode="Error-80001" />
		<xsl:apply-templates select="." mode="Error-80004" />
		<xsl:apply-templates select="." mode="Error-CorrDocRefIdMagGeenSpatiesBevatten" />
		<xsl:apply-templates select="." mode="Error-DocRefIdMagGeenSpatiesBevatten" />
		<xsl:apply-templates select="." mode="Error-CorrDocRefIdMagNietGevuldZijnBijOECD0OfOECD10" />
		<xsl:apply-templates select="." mode="Error-80005" />
		<xsl:apply-templates select="." mode="Error-80006" />
		<xsl:apply-templates select="." mode="Error-80008" />
		<xsl:apply-templates select="." mode="Error-80009" />
		<xsl:if test="not($MessageTypeIndic = 'CRS703')">
			<xsl:apply-templates select="." mode="Error-80010" />
		</xsl:if>
		
		
				
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='Name']">
	 	<xsl:apply-templates select="." mode="Error-NameType" />
	 	<xsl:apply-templates select="." mode="Error-Name" />
		<xsl:apply-templates select="." mode="Error-FirstName" />
		<xsl:apply-templates select="." mode="Error-LastName" />
	</xsl:template>
	
	<!-- Error code 500xx -->
	<xsl:template match="*" mode="doctypeindic">
		
		<xsl:value-of select="concat('%',.,'%')"/>
	</xsl:template>
	<xsl:template match="*" mode="Error-50010"> <!-- CRSProductiegegevensInTestomgeving -->
	
		<xsl:if test="$EnvironmentUsedForTest = 'true'">
			<xsl:variable name="doctypeindics">
				<xsl:apply-templates select="//*[local-name()='DocSpec']/*[local-name()='DocTypeIndic']" mode="doctypeindic" />
			</xsl:variable>
			<xsl:if test="contains($doctypeindics,'%OECD0%') or contains($doctypeindics,'%OECD1%') or contains($doctypeindics,'%OECD2%') or contains($doctypeindics,'%OECD3%')">
				<xsl:apply-templates select="." mode="Error" >
	                <xsl:with-param name="MeldingId" select="'CRSProductiegegevensInTestomgeving'"/>
					<xsl:with-param name="ErrorId" select="50010"/>
				</xsl:apply-templates>
			</xsl:if>
		</xsl:if>
		
	</xsl:template>
	
	<xsl:template match="*" mode="Error-50011"> <!-- CCRSTestgegevensInProductieomgeving -->
		<xsl:if test="$EnvironmentUsedForTest = 'false'">
			<xsl:variable name="doctypeindics">
				<xsl:apply-templates select="//*[local-name()='DocSpec']/*[local-name()='DocTypeIndic']" mode="doctypeindic" />
			</xsl:variable>
			<xsl:if test="contains($doctypeindics,'%OECD10%') or contains($doctypeindics,'%OECD11%') or contains($doctypeindics,'%OECD12%') or contains($doctypeindics,'%OECD13%')">
				<xsl:apply-templates select="." mode="Error" >
	                <xsl:with-param name="MeldingId" select="'CCRSTestgegevensInProductieomgeving'"/>
					<xsl:with-param name="ErrorId" select="50011"/>
				</xsl:apply-templates>
			</xsl:if>
		</xsl:if>
	</xsl:template>
	
	<!-- Error codes 600xx -->
	
	
	
	<xsl:template match="*" mode="Error-60002"> <!-- CrsAccountBalanceNiet000 -->
		<xsl:if test="not(. &gt;= 0)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountBalanceMoetPositiefGetalZijn'"/>
				<xsl:with-param name="ErrorId" select="60002"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>		
	
	<xsl:template match="*" mode="Error-60003"> <!-- OECDAccountBalanceAndClosedAccount -->
		<xsl:if test="$DocIsCRS and parent::*/*[local-name()='AccountNumber']/@*[local-name()='ClosedAccount'] = 'true' and not(. = 0)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'OECDAccountBalanceAndClosedAccount'"/>
				<xsl:with-param name="ErrorId" select="60003"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
		
	<xsl:template match="*" mode="Error-NameType">
		<xsl:if test="@*[local-name()='nameType'] = 'OECD201'">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">CRSAccountholderOrganisationNameTypeInvalid</xsl:when> <!-- CRSAccountholderOrganisationNameTypeInvalid -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">CRSControllingPersonNameTypeInvalid</xsl:when> <!-- CRSControllingpersonNameTypeInvalid -->
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">CRSReportingFINameTypeInvalid</xsl:when> <!-- CRSReportingFINameTypeInvalid -->
					<xsl:when test="count(ancestor::*[local-name()='Individual']) = 1">CRSAccountholderIndividualNameTypeInvalid</xsl:when> <!-- CRSAccountholderIndividualNameTypeInvalid -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="60004"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>

	
	<xsl:template match="*" mode="Error-60005"> <!-- ControllingPersonTypeMustBeOmitted -->
		<xsl:if test="*[local-name()='AccountHolder']/*[local-name()='Organisation']">
			<xsl:variable name="AcctHolderTypeCRS" select="*[local-name()='AccountHolder']/*[local-name()='AcctHolderTypeCRS' or local-name()='AcctHolderType']"/>
			<xsl:if test="($AcctHolderTypeCRS='CRS102' or $AcctHolderTypeCRS='CRS103') and *[local-name()='ControllingPerson']">
					
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'ControllingPersonTypeMustBeOmitted'"/>
				<xsl:with-param name="ErrorId" select="60005"/>
			</xsl:apply-templates>
			</xsl:if>		
		</xsl:if>		
	</xsl:template>			
	
	<xsl:template match="*" mode="Error-60006"> <!-- ControllingPersonTypeMustBeProvided -->
		<xsl:if test="*[local-name()='AccountHolder']/*[local-name()='Organisation']">
			<xsl:variable name="AcctHolderTypeCRS" select="*[local-name()='AccountHolder']/*[local-name()='AcctHolderTypeCRS' or local-name()='AcctHolderType']"/>
			<xsl:if test="$AcctHolderTypeCRS='CRS101' and count(*[local-name()='ControllingPerson']) = 0">
				<xsl:apply-templates select="." mode="Error" >
	                <xsl:with-param name="MeldingId" select="'ControllingPersonTypeMustBeProvided'"/>
					<xsl:with-param name="ErrorId" select="60006"/>
				</xsl:apply-templates>
			</xsl:if>
		</xsl:if>		
	</xsl:template>				
	
	<xsl:template match="*" mode="Error-60007"> <!-- CRSReportingGroupCannotBeRepeated -->
		<xsl:if test="count(*[local-name()='ReportingGroup']) &gt; 1">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'CRSReportingGroupCannotBeRepeated'"/>
				<xsl:with-param name="ErrorId" select="60007"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>					
	
	<xsl:template match="*" mode="Error-60008"> <!-- SponsorCannotBeProvided -->
		<xsl:if test="not(contains(../../*[local-name()='ReportingFI']/*[local-name()='TIN'],'.SP.'))">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'SponsorCannotBeProvided'"/>
				<xsl:with-param name="ErrorId" select="60008"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<xsl:template match="*" mode="Error-FilerCategoryVerplichtVoorSponsor"> <!-- Error-FilerCategoryVerplichtVoorSponsor -->
		<xsl:if test="count(*[local-name()='FilerCategory'])=0">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'FilerCategoryVerplichtVoorSponsor'"/>
				<xsl:with-param name="ErrorId" select="98008"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	

	<xsl:template match="*" mode="Error-FilerCategoryValueForReportingFI"> <!-- Error-FilerCategoryValueForReportingFI -->
		<xsl:if test="*[local-name()='FilerCategory']='FATCA607' or *[local-name()='FilerCategory']='FATCA608' or *[local-name()='FilerCategory']='FATCA609'">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'NietCorrecteWaardesGebruiktBijFilerCategory'"/>
				<xsl:with-param name="ErrorId" select="98008"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>
	
	<xsl:template match="*" mode="Error-FilerCategoryValueForSponsor"> <!-- FilerCategoryVerplichtVoorSponsor -->
		<xsl:if test="not(*[local-name()='FilerCategory']='FATCA607' or *[local-name()='FilerCategory']='FATCA608' or *[local-name()='FilerCategory']='FATCA609')">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'FilerCategoryVerplichtVoorSponsor'"/>
				<xsl:with-param name="ErrorId" select="98008"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	
	<xsl:template match="*" mode="Error-FilerCategoryForbiddenForReportingFI"> <!-- Error-FilerCategoryIsGevuldVoorSponsorEnReportingFI -->
		<xsl:if test="count(*[local-name()='FilerCategory'])=1 and contains(*[local-name()='TIN'],'.SP.') and count(../*[local-name()='ReportingGroup']/*[local-name()='Sponsor']) = 1">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'FilerCategoryIsGevuldVoorSponsorEnReportingFI'"/>
				<xsl:with-param name="ErrorId" select="98008"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	

	<xsl:template match="*" mode="Error-AlsMessageTypeIndicCRS701DanMagDeReportingGroupGeenNilReportBevatten"> <!-- Error-AlsMessageTypeIndicCRS701DanMagDeReportingGroupGeenNilReportBevattenr -->
		<xsl:if test="$MessageTypeIndic = 'CRS701'">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'AlsMessageTypeIndicCRS701DanMagDeReportingGroupGeenNilReportBevatten'"/>
				<xsl:with-param name="ErrorId" select="98009"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>
	
	<xsl:template match="*" mode="Error-NietlegeLeveringInCRS703Bestand"> <!-- Error-NietlegeLeveringInCRS703Bestand -->
		<xsl:if test="$MessageTypeIndic = 'CRS703'">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'NietlegeLeveringInCRS703Bestand'"/>
				<xsl:with-param name="ErrorId" select="98010"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>						
	
	<xsl:template match="*" mode="Error-FilerCategoryIsVerplichtVoorReportingFI"> <!-- Error-FilerCategoryIsVerplichtVoorReportingFI -->
		<xsl:if test="contains(*[local-name()='TIN'],'.') and not(contains(*[local-name()='TIN'],'.SP.')) and count(*[local-name()='FilerCategory'])=0 and $TaxYear &gt; 2015">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'FilerCategoryIsVerplichtVoorReportingFI'"/>
				<xsl:with-param name="ErrorId" select="98011"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>				
	
	<xsl:template match="*" mode="Error-60009"> <!-- IntermediaryCannotBeProvided -->
		<xsl:if test="*[local-name()='Intermediary']">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'IntermediaryCannotBeProvided'"/>
				<xsl:with-param name="ErrorId" select="60009"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>							
	
	<xsl:template match="*" mode="Error-60010"> <!-- PoolReportCannotBeProvided -->
		<xsl:if test="*[local-name()='PoolReport']">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'PoolReportCannotBeProvided'"/>
				<xsl:with-param name="ErrorId" select="60010"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>		
	
	<xsl:template match="*" mode="Error-60016"> <!-- ControllingPersonTypeMustBeOmittedWithIndividual -->
		<xsl:if test="count(*[local-name()='Individual']) = 1
					and count(parent::*/*[local-name()='ControllingPerson']) &gt; 0">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'ControllingPersonTypeMustBeOmittedWithIndividual'"/>
				<xsl:with-param name="ErrorId" select="60016"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<!-- TODO -->
	<!-- Need to get local sysdate for comparison -->
	
	<xsl:template match="*" mode="Error-60014"> <!-- CrsBirthdateAccountholderNotValid -->
		<xsl:variable name="BirthDate" select="*[local-name()='BirthDate']"/>
	    <!-- <xsl:variable name="date" select="10000 * substring($BirthDate, 7, 4) + 100 * substring($BirthDate, 4, 2) + substring($BirthDate, 1, 2)"/>  -->
	    
	    <xsl:variable name="dateIsBefore1900" select="number(substring($BirthDate, 1, 4)) &lt; 1900"/>
	    
	    <xsl:variable name="date" select="10000 * substring($BirthDate, 1, 4) + 100 * substring($BirthDate, 6, 2) + substring($BirthDate, 8, 2)"/>
	    
	    <xsl:variable name="dateIsAfterCurrentDate" select="$date &gt;= $CurrentDate"/>
	
		<xsl:if test="$BirthDate and ($dateIsBefore1900 or $dateIsAfterCurrentDate)">
		    
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CrsBirthdateAccountholderNotValid'"/>
				<xsl:with-param name="ErrorId" select="$CurrentDate"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>	
	
	<xsl:template match="*" mode="Error-ResCountryCodeNotReceivingCountry"> 
		<xsl:if test="$IsForeign = 'true' and count(.//*[local-name()='ResCountryCode'][text()=$ReceivingCountry]) = 0">
		    <xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test=".//*[local-name()='Organisation']">VerifyDataSortingOrganisationResCountryCode</xsl:when> <!-- VerifyDataSortingOrganisationResCountryCode -->
					<xsl:when test="not(.//*[local-name()='Organisation'])">VerifyDataSortingPersonResCountryCode</xsl:when> <!-- VerifyDataSortingPersonResCountryCode -->
				</xsl:choose>
			</xsl:variable>
		    <xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test=".//*[local-name()='Organisation']">60012</xsl:when> <!-- VerifyDataSortingOrganisationResCountryCode -->
					<xsl:when test="not(.//*[local-name()='Organisation'])">60011</xsl:when> <!-- VerifyDataSortingPersonResCountryCode -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>			
	
	<xsl:template match="*" mode="Error-60013"> <!-- CRSVerifyDataSortingReportingFIResCountryCode -->
		<xsl:if test="not($TransmittingCountry = *[local-name()='ResCountryCode'])">
			
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'CRSVerifyDataSortingReportingFIResCountryCode'"/>
				<xsl:with-param name="ErrorId" select="60013"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<!-- Error codes 700xx -->
	
	<xsl:template match="*" mode="Error-AddressFix">
		<xsl:if test="*[local-name()='AddressFix'] 
					and (not(*[local-name()='AddressFix']/*[local-name()='City'])
					or *[local-name()='AddressFix']/*[local-name()='City'] = '')">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">CRSCityOrTownNotProvidedForReportingFI</xsl:when> <!-- CRSCityOrTownNotProvidedForReportingFI -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">CrsCityOrTownNotProvidedForAccountHolderOrganisationOrRecipient</xsl:when> <!-- CrsCityOrTownNotProvidedForAccountHolderOrganisationOrRecipient -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">CrsCityOrTownNotProvidedForControllingPerson</xsl:when> <!-- CrsCityOrTownNotProvidedForControllingPerson -->
					<xsl:when test="count(ancestor::*[local-name()='Individual']) = 1">CrsCityOrTownNotProvidedForAccountHolderIndividualOrRecipient</xsl:when> <!-- CrsCityOrTownNotProvidedForAccountHolderIndividualOrRecipient -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">70017</xsl:when> <!-- CRSCityOrTownNotProvidedForReportingFI -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">70013</xsl:when> <!-- CrsCityOrTownNotProvidedForAccountHolderOrganisationOrRecipient -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">70009</xsl:when> <!-- CrsCityOrTownNotProvidedForControllingPerson -->
					<xsl:when test="count(ancestor::*[local-name()='Individual']) = 1">70004</xsl:when> <!-- CrsCityOrTownNotProvidedForAccountHolderIndividualOrRecipient -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-CountryCode">
		<xsl:if test="count(ancestor::*[local-name()='ReportingFI']) = 1 and . != $Country_Code_Provision">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'ReportingFIsMoetenCountryCodeCWInAdresHebben'"/>
				<xsl:with-param name="ErrorId" select="98008"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-AddressFree">
		<xsl:if test="count(*[local-name()='AddressFree'])=1 and *[local-name()='AddressFree'] = ''">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">CrsAddressFreeNotProvidedForReportingFI</xsl:when> <!-- CrsAddressFreeNotProvidedForReportingFI -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">CrsAddressFreeNotProvidedForAccountHolderOrganisation</xsl:when> <!-- CrsAddressFreeNotProvidedForAccountHolderOrganisation -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">CrsAddressFreeNotProvidedForControllingPerson</xsl:when> <!-- CrsAddressFreeNotProvidedForControllingPerson -->
					<xsl:when test="count(ancestor::*[local-name()='Individual']) = 1">CrsAddressFreeNotProvidedForAccountHolderIndividual</xsl:when> <!-- CrsAddressFreeNotProvidedForAccountHolderIndividual -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">70018</xsl:when> <!-- CrsAddressFreeNotProvidedForReportingFI -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">70014</xsl:when> <!-- CrsAddressFreeNotProvidedForAccountHolderOrganisation -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">70010</xsl:when> <!-- CrsAddressFreeNotProvidedForControllingPerson -->
					<xsl:when test="count(ancestor::*[local-name()='Individual']) = 1">70005</xsl:when> <!-- CrsAddressFreeNotProvidedForAccountHolderIndividual -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>		
	
	<xsl:template match="*" mode="Error-AcctHolderTypeCRS">		
		<xsl:variable name="OtherResCountriesThanUS" select="count(*[local-name()='ResCountryCode'][.!='US']) &gt; 0"/>
		<xsl:variable name="NoSubstantialOwnersFromUSPresent" select="not(../../*[local-name()='SubstantialOwner'])"/>
		<xsl:variable name="AcctHolderTypeCRS-is-empty" select="(not(../*[local-name()='AcctHolderTypeCRS']) or ../*[local-name()='AcctHolderTypeCRS'] = '') and (not(../*[local-name()='AcctHolderType']) or ../*[local-name()='AcctHolderType'] = '')"/>
		<xsl:if test="$NoSubstantialOwnersFromUSPresent and $OtherResCountriesThanUS and $AcctHolderTypeCRS-is-empty">
			<xsl:apply-templates select="parent::*" mode="Error" >
			    <xsl:with-param name="MeldingId" select="'AcctHolderTypeCRSMoetGevuldZijn'"/>
				<xsl:with-param name="ErrorId" select="'90023'"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-AcctHolderTypeFATCA">
		<xsl:variable name="ResCountryIsUS" select="count(*[local-name()='ResCountryCode'][.='US']) &gt; 0"/>
		<xsl:variable name="SubstantialOwnersFromUSPresent" select="count(../../*[local-name()='SubstantialOwner']) &gt; 0"/>
		<xsl:variable name="AcctHolderTypeFATCA-is-empty" select="not(../*[local-name()='AcctHolderTypeFATCA']) or ../*[local-name()='AcctHolderTypeFATCA'] = ''"/>
		<xsl:if test="($ResCountryIsUS or $SubstantialOwnersFromUSPresent) and $AcctHolderTypeFATCA-is-empty">
			<xsl:apply-templates select="parent::*" mode="Error" >
			    <xsl:with-param name="MeldingId" select="'AcctHolderTypeFATCAMoetGevuldZijn'"/>
				<xsl:with-param name="ErrorId" select="'90023'"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-SubstantialOwnerNotUS">
		<xsl:variable name="SubstantialOwnerResCountryIsUS" select="count(*/*[local-name()='ResCountryCode'][.='US']) &gt; 0"/>
		
		<xsl:if test="not($SubstantialOwnerResCountryIsUS)">
			<xsl:apply-templates select="parent::*" mode="Error" >
			    <xsl:with-param name="MeldingId" select="'SubstantialOwnerResCountryIsNotUS'"/>
				<xsl:with-param name="ErrorId" select="'90024'"/>
			</xsl:apply-templates>
			
		</xsl:if>
		
		
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-TIN"> 
		<xsl:variable name="tin-is-empty" select="not(*[local-name()='TIN']) or *[local-name()='TIN'] = ''"/>
		<xsl:if test="(*[local-name()='ResCountryCode'] = 'US' or local-name()='ReportingFI') and ($tin-is-empty)">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="local-name()='ReportingFI'">CRSTINReportingFINotPopulated</xsl:when> <!-- CRSTINReportingFINotPopulated -->
					<xsl:when test="local-name()='Organisation'">CrsINAccountholderOrganisationNotPopulated</xsl:when> <!-- CrsINAccountholderOrganisationNotPopulated -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">TINControllingPersonIndividualNotPopulated</xsl:when> <!-- TINControllingPersonIndividualNotPopulated -->
					<xsl:when test="local-name()='Individual'">CrsTINAccountholderIndividualNotPopulated</xsl:when> <!-- CrsTINAccountholderIndividualNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="local-name()='ReportingFI'">70015</xsl:when> <!-- CRSTINReportingFINotPopulated -->
					<xsl:when test="local-name()='Organisation'">70011</xsl:when> <!-- CrsINAccountholderOrganisationNotPopulated -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">70006</xsl:when> <!-- TINControllingPersonIndividualNotPopulated -->
					<xsl:when test="local-name()='Individual'">70001</xsl:when> <!-- CrsTINAccountholderIndividualNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
			    <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<xsl:template match="*" mode="Error-FilerCategory">
		<xsl:if test="*[local-name()='FilerCategory']='FATCA606' and count(//*[local-name()='AcctHolderTypeFATCA'][.!='FATCA105']) &gt; 0">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountHolderOrganisationAcctHolderTpeFATCAMoetFATCA105Zijn'"/>
				<xsl:with-param name="ErrorId" select="80034"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<!-- FOR CRS -->
	<xsl:template match="*" mode="Error-IN"> 
		<xsl:if test="not(*[local-name()='IN']) or *[local-name()='IN'] = ''">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="local-name()='ReportingFI'">CRSTINReportingFINotPopulated</xsl:when> <!-- CRSTINReportingFINotPopulated -->
					<xsl:when test="local-name()='Organisation'">CrsINAccountholderOrganisationNotPopulated</xsl:when> <!-- CrsINAccountholderOrganisationNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="local-name()='ReportingFI'">70015</xsl:when> <!-- CRSTINReportingFINotPopulated -->
					<xsl:when test="local-name()='Organisation'">70011</xsl:when> <!-- CrsINAccountholderOrganisationNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<xsl:template match="*" mode="Error-FirstName">
		<xsl:if test="*[local-name()='FirstName'] = ''">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='AccountHolder']) = 1">CrsFirstNameOfAccountHolderIndividualNotProvided</xsl:when> <!-- CrsFirstNameOfAccountHolderIndividualNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">CrsFirstNameOfControllingPersonNotProvided</xsl:when> <!-- CrsFirstNameOfControllingPersonNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='SubstantialOwner']) = 1">SubstantialOwner_FirstNameIsVerplicht</xsl:when> <!-- SubstantialOwner_FirstNameIsVerplicht -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='AccountHolder']) = 1">70002</xsl:when> <!-- CrsFirstNameOfAccountHolderIndividualNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">70007</xsl:when> <!-- CrsFirstNameOfControllingPersonNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='SubstantialOwner']) = 1">80007</xsl:when> <!-- SubstantialOwner_FirstNameIsVerplicht -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	<xsl:template match="*" mode="Error-LastName">
		<xsl:if test="*[local-name()='LastName'] = ''">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='AccountHolder']) = 1">CrsLastNameOfAccountHolderIndividualNotProvided</xsl:when> <!-- CrsLastNameOfAccountHolderIndividualNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">CrsLastNameOfControllingPersonNotProvided</xsl:when> <!-- CrsLastNameOfControllingPersonNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='SubstantialOwner']) = 1">SubstantialOwner_LastNameIsVerplicht</xsl:when> <!-- SubstantialOwner_LastNameIsVerplicht -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='AccountHolder']) = 1">70003</xsl:when> <!-- CrsLastNameOfAccountHolderIndividualNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='ControllingPerson']) = 1">70008</xsl:when> <!-- CrsLastNameOfControllingPersonNotProvided -->
					<xsl:when test="count(ancestor::*[local-name()='SubstantialOwner']) = 1">80007</xsl:when> <!-- SubstantialOwner_LastNameIsVerplicht -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>
	
	<xsl:template match="*" mode="Error-Name"> <!-- CrsNameOfAccountHolderOrganisationNotProvided -->
		<xsl:if test=". = ''">
			<xsl:variable name="MeldingCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">CRSNameOfReportingFINotPopulated</xsl:when> <!-- CRSNameOfReportingFINotPopulated -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">CrsTINAccountholderIndividualNotPopulated</xsl:when> <!-- CrsTINAccountholderIndividualNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:variable name="ErrorCode">
				<xsl:choose>
					<xsl:when test="count(ancestor::*[local-name()='ReportingFI']) = 1">70016</xsl:when> <!-- CRSNameOfReportingFINotPopulated -->
					<xsl:when test="count(ancestor::*[local-name()='Organisation']) = 1">70012</xsl:when> <!-- CrsTINAccountholderIndividualNotPopulated -->
				</xsl:choose>
			</xsl:variable>
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="$MeldingCode"/>
				<xsl:with-param name="ErrorId" select="$ErrorCode"/>
				
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>
	

	<xsl:template match="*" mode="Error-70019">  <!-- CrsAccountNumberMoetAanwezigZijn  -->
		<xsl:if test=". = ''">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountnumberMoetGevuldZijn'"/>
				<xsl:with-param name="ErrorId" select="70019"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>	
	
	
	<!-- Error codes 800xx -->
	
	<xsl:template match="*" mode="Error-80000"> <!-- DocRefIDAlreadyUsed -->
		
		
		<xsl:for-each select="$allDocRefIds[not(.=preceding::*)]">
			<xsl:variable name="DocRefId" select="."/>
	    	<xsl:if test="count($allDocRefIds[.=$DocRefId]) &gt; 1">
				<xsl:apply-templates select="parent::*/parent::*" mode="Error" >
	                <xsl:with-param name="MeldingId" select="'DocRefIDAlreadyUsed'"/>
					<xsl:with-param name="ErrorId" select="80000"/>
				</xsl:apply-templates>
			</xsl:if>
         </xsl:for-each>    
		
		
		
		
		
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-80011"> <!-- DocRefIDAlreadyUsed -->
		
		
		<xsl:for-each select="$allCorrDocRefIds[not(.=preceding::*)]">
			<xsl:variable name="CorrDocRefId" select="."/>
	    	<xsl:if test="count($allCorrDocRefIds[.=$CorrDocRefId]) &gt; 1">
				<xsl:apply-templates select="parent::*/parent::*" mode="Error" >
	                <xsl:with-param name="MeldingId" select="'CorrDocRefIDTwiceInSameMessage'"/>
					<xsl:with-param name="ErrorId" select="80011"/>
				</xsl:apply-templates>
			</xsl:if>
         </xsl:for-each>    
			
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='DocRefId']" mode="Error-80001"> <!-- CRS_DocRefIdPrefixIsNotEqualToMessageRefIdPrefix -->
		<xsl:if test="substring(.,0,7) != substring($MessageRefId,0,7)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CRS_DocRefIdPrefixIsNotEqualToMessageRefIdPrefix'"/>
				<xsl:with-param name="ErrorId" select="80001"/>
			</xsl:apply-templates>
		</xsl:if>
		
		<xsl:if test="not(substring(.,0,3) = $TransmittingCountry)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'DocRefIdNotInTheCorrectFormat'"/>
				<xsl:with-param name="ErrorId" select="80001"/>
			</xsl:apply-templates>
		</xsl:if>
		
	</xsl:template>

	<xsl:template match="*[local-name()='CorrDocRefId']" mode="Error-80001"> <!-- CRS_DocRefIdPrefixIsNotEqualToMessageRefIdPrefix -->
		<xsl:if test="substring(.,0,7) != substring($MessageRefId,0,7)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CRS_CorrDocRefIdPrefixIsNotEqualToMessageRefIdPrefix'"/>
				<xsl:with-param name="ErrorId" select="80001"/>
			</xsl:apply-templates>
		</xsl:if>
		
		<xsl:if test="not(substring(.,0,3) = $TransmittingCountry)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CorrDocRefIdNotInTheCorrectFormat'"/>
				<xsl:with-param name="ErrorId" select="80001"/>
			</xsl:apply-templates>
		</xsl:if>
		
	</xsl:template>
	
	<xsl:template match="*" mode="Error-80004"> <!-- CorrDocRefIdForNewData -->
		<xsl:if test="*[local-name()='CorrDocRefId'] and *[local-name()='CorrDocRefId'] !='' and $MessageTypeIndic = 'CRS701'">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CorrDocRefIdForNewData'"/>
				<xsl:with-param name="ErrorId" select="80004"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-CorrDocRefIdMagGeenSpatiesBevatten"> <!-- CorrDocRefIdMagGeenSpatiesBevatten -->
		<xsl:if test="contains(*[local-name()='CorrDocRefId'],' ')">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CorrDocRefIdMagGeenSpatiesBevatten'"/>
				<xsl:with-param name="ErrorId" select="80024"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	
		<xsl:template match="*" mode="Error-DocRefIdMagGeenSpatiesBevatten"> <!-- DocRefIdMagGeenSpatiesBevatten -->
		<xsl:if test="contains(*[local-name()='DocRefId'],' ')">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'DocRefIdMagGeenSpatiesBevatten'"/>
				<xsl:with-param name="ErrorId" select="80025"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
		<xsl:template match="*" mode="Error-CorrDocRefIdMagNietGevuldZijnBijOECD0OfOECD10"> <!-- CorrDocRefIdMagNietGevuldZijnBijOECD0OfOECD10 -->
		<xsl:if test="*[local-name()='CorrDocRefId']!='' and (*[local-name()='DocTypeIndic']='OECD10' or *[local-name()='DocTypeIndic']='OECD0')">  
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CorrDocRefIdMagNietGevuldZijnBijOECD0OfOECD10'"/>
				<xsl:with-param name="ErrorId" select="80026"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-80005"> <!-- MissingCorrDocRefId -->
		<xsl:if test="(*[local-name()='DocTypeIndic'] = 'OECD2' or *[local-name()='DocTypeIndic'] = 'OECD12') 
						and (not(*[local-name()='CorrDocRefId']) or *[local-name()='CorrDocRefId'] = '')">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'MissingCorrDocRefId'"/>
				<xsl:with-param name="ErrorId" select="80005"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-80006"> <!-- DocSpecCorrMessageRefIDForbidden -->
		<xsl:if test="*[local-name()='CorrMessageRefId']">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'DocSpecCorrMessageRefIDForbidden'"/>
				<xsl:with-param name="ErrorId" select="80006"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	 <xsl:template match="*" mode="Error-80007"> <!-- MessageSpecCorrMessageRefIDForbidden --> 
		<xsl:if test="*[local-name()='CorrMessageRefId'] and $MessageTypeIndic='CRS701'">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'MessageSpecCorrMessageRefIDForbidden'"/>
				<xsl:with-param name="ErrorId" select="80007"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-80008"> <!-- ResendOptionMayOnlyBeUsedForReportingFI -->
		<xsl:variable name="isReportingFI" select="count(ancestor::*[local-name()='ReportingEntity']) = 1 or count(ancestor::*[local-name()='ReportingFI']) = 1"/>
		<xsl:variable name="isResend" select="*[local-name()='DocTypeIndic'] = 'OECD0' or *[local-name()='DocTypeIndic'] = 'OECD10'"/>
		<xsl:if test="not($isReportingFI) and $isResend">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'ResendOptionMayOnlyBeUsedForReportingFI'"/>
				<xsl:with-param name="ErrorId" select="80008"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-80009"> <!-- ReportingFICannotBeDeletedWithNilreport -->
		<xsl:variable name="isReportingFI" select="count(ancestor::*[local-name()='ReportingEntity']) = 1 or count(ancestor::*[local-name()='ReportingFI']) = 1"/>
		<xsl:variable name="isReportingFIDeleted" select="*[local-name()='DocTypeIndic'] = 'OECD13' or *[local-name()='DocTypeIndic'] = 'OECD3'"/>
	<xsl:if test="$isReportingFI">
		<xsl:variable name="AllDocTypeIndicsReportingGroup" select="../following-sibling::*[local-name()='ReportingGroup']//*[local-name()='DocTypeIndic'][.!='OECD13']"/>
		<xsl:variable name="error-occurred">
		<xsl:choose>
			
			<xsl:when test="$isReportingFI and $isReportingFIDeleted and (contains($AllDocTypeIndicsReportingGroup,'OECD2') or contains($AllDocTypeIndicsReportingGroup,'OECD12'))" >true</xsl:when>
			<xsl:when test="$isReportingFI and $isReportingFIDeleted and (contains($AllDocTypeIndicsReportingGroup,'OECD1') or contains($AllDocTypeIndicsReportingGroup,'OECD11'))" >true</xsl:when>
			<xsl:when test="$isReportingFI and $isReportingFIDeleted and (contains($AllDocTypeIndicsReportingGroup,'OECD0') or contains($AllDocTypeIndicsReportingGroup,'OECD10'))" >true</xsl:when>
			<xsl:otherwise>false</xsl:otherwise>
		</xsl:choose>
		</xsl:variable>
		
	
		<xsl:if test="$error-occurred = 'true'" >
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'ReportingFICannotBeDeletedWithNilreport'"/>
				<xsl:with-param name="ErrorId" select="80010"/> <!-- MessageTypeIndicDocTypeIndicIncompatible -->
			</xsl:apply-templates>
		</xsl:if>
	</xsl:if>		
	</xsl:template>
	
	
	
	<xsl:template match="*" mode="Error-80010"> <!-- MessageTypeIndicDocTypeIndicIncompatible -->
		
		<xsl:variable name="isResend" select="*[local-name()='DocTypeIndic'] = 'OECD0' or *[local-name()='DocTypeIndic'] = 'OECD10'"/>
		<xsl:variable name="isNew" select="*[local-name()='DocTypeIndic'] = 'OECD11' or *[local-name()='DocTypeIndic'] = 'OECD1'"/>
		<xsl:variable name="isCorrection" select="*[local-name()='DocTypeIndic'] = 'OECD12' or *[local-name()='DocTypeIndic'] = 'OECD2'"/>
		<xsl:variable name="isDeletion" select="*[local-name()='DocTypeIndic'] = 'OECD13' or *[local-name()='DocTypeIndic'] = 'OECD3'"/>
		<xsl:variable name="error-occurred">
		<xsl:choose>
			<xsl:when test="$MessageTypeIndic = 'CRS701' and ($isCorrection or $isDeletion)" >true</xsl:when>
			<xsl:when test="$MessageTypeIndic = 'CRS702' and ($isNew)">true</xsl:when>
			<xsl:when test="$MessageTypeIndic = 'CRS703' and (($isNew or $isCorrection) and not(ancestor::*[local-name()='ReportingFI']))">true</xsl:when>
		
		</xsl:choose>
		</xsl:variable>
		
	
		<xsl:if test="$error-occurred = 'true'" >
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'MessageTypeIndicDocTypeIndicIncompatible'"/>
				<xsl:with-param name="ErrorId" select="80010"/> <!-- MessageTypeIndicDocTypeIndicIncompatible -->
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	

	
	
	<!-- Error codes 980xx -->
	
	<xsl:template match="*" mode="Error-98001"> <!-- CRSResCountryCodeNietGelijkAanCountryCodeProvision -->
		<xsl:if test="@*[local-name()='UndocumentedAccount'] = 'true' 
						and not(../*[local-name()='AccountHolder']/*[local-name()='Organisation' or local-name()='Individual']/*[local-name()='ResCountryCode'] = $Country_Code_Provision)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CRSResCountryCodeNietGelijkAanCountryCodeProvision'"/>
				<xsl:with-param name="ErrorId" select="98001"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-98002"> <!-- AccountReportZonderUS_personsMagGeenSubstantialOwnerBevatten 
		<xsl:if test="not(*[local-name()='Organisation']/*[local-name()='ResCountryCode'] = 'US' )
					and parent::*/*[local-name()='SubstantialOwner']">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountReportZonderUS_personsMagGeenSubstantialOwnerBevatten'"/>
				<xsl:with-param name="ErrorId" select="98002"/>
			</xsl:apply-templates>
		</xsl:if>
		-->
	</xsl:template>
	

	
	<xsl:template match="*" mode="Error-98004"> <!-- AccountBalanceMaximaal1016 -->
		<xsl:if test=". &gt; 10000000000000000">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountBalanceMaximaal1016'"/>
				<xsl:with-param name="ErrorId" select="98004"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-98005"> <!-- PaymentAmountMaximaal1016 -->
		<xsl:if test=". &gt; 10000000000000000">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'PaymentAmountMaximaal1016'"/>
				<xsl:with-param name="ErrorId" select="98005"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountBalance']" mode="Error-98006"> <!-- AccountBalanceNietMeerDan50000 -->
		<xsl:if test="parent::*/*[local-name()='AccountHolder']//*[local-name()='ResCountryCode'] = 'US'
					and @*[local-name()='currCode'] = 'USD'
					and . &lt;= 50000">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountBalanceNietMeerDan50000'"/>
				<xsl:with-param name="ErrorId" select="98006"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*[local-name()='ResCountryCode']" mode="Error-GerapporteerdLandIsGeenDoorgeefland"> <!-- AccountBalanceNietMeerDan50000 -->
		<xsl:variable name="isUndocumentedAccount" select="../../../*[local-name()='AccountNumber']/@UndocumentedAccount"/>
		<xsl:variable name="undocumentedToCountryCodeProvision" select=".=$Country_Code_Provision and ($isUndocumentedAccount='true' or $isUndocumentedAccount='1')" />
		<xsl:if test="not(contains($PartnerJurisdictions,.)) and not ($undocumentedToCountryCodeProvision)">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'GerapporteerdLandIsGeenDoorgeefland'"/>
				<xsl:with-param name="ErrorId" select="98007"/>
				<xsl:with-param name="ResCountryCode" select="."/>
			</xsl:apply-templates>
			<!-- removed temp -->
			
		</xsl:if>
		<xsl:if test="count(ancestor::*[local-name()='ControllingPerson'])=1 and .='US'">
				<xsl:apply-templates select="parent::*" mode="Error" >
	                <xsl:with-param name="MeldingId" select="'ResCountryCodesVanDeControllingPersonsMoetEenVanDeMCAA_landenZijnWaarmeeCRS_gegevensWordenUitgewisseldEnMagNietUSZijn'"/>
					<xsl:with-param name="ErrorId" select="98007"/>
					<xsl:with-param name="ResCountryCode" select="."/>
				</xsl:apply-templates>
			</xsl:if>
	</xsl:template>
	
	<!-- TODO -->
	<!--  
	
	

	
	<xsl:template match="*" mode="Error-98013"> <!- OECDAccountBalanceAndClosedAccount ->
		<xsl:if test="1 = 2">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="''"/>
				<xsl:with-param name="ErrorId" select="60003"/>
			</xsl:apply-templates>
		</xsl:if>		
	</xsl:template>
	-->
	<!-- Error key value template -->
	
	<xsl:template match="*" mode="Error">
		<xsl:param name="MeldingId" />
		<xsl:param name="ErrorId" />
		
		<xsl:param name="ResCountryCode" />
		<xsl:variable name="ContextPath">
			 <xsl:call-template name="genPath"/>
		</xsl:variable>
		<xsl:variable name="DocRefId" >
			<xsl:choose>
				<xsl:when test="count(ancestor-or-self::*[local-name()='AccountReport']) &gt;0">
					<xsl:value-of select="ancestor-or-self::*[local-name()='AccountReport']//*[local-name()='DocRefId']"/>
				</xsl:when>
				<xsl:when test="count(ancestor-or-self::*[local-name()='ReportingFI']) &gt; 0">
					<xsl:value-of select="ancestor-or-self::*[local-name()='ReportingFI']//*[local-name()='DocRefId']"/>
				</xsl:when>
			</xsl:choose>
					
		</xsl:variable>
		
	    <cas:dataset id="InstructionSet">
	        <cas:label>InstructionSet</cas:label>
		    <cas:property>
	            <cas:key>CreateRecord</cas:key>
	            <cas:value>Error</cas:value>
	        </cas:property>
	   			<cas:property>
                       <cas:key>MeldingId</cas:key>
                       <cas:value><xsl:value-of select="$MeldingId"/></cas:value>
                   </cas:property>  
                   <cas:property>
                       <cas:key>ErrorId</cas:key>
                       <cas:value><xsl:value-of select="$ErrorId"/></cas:value>
                   </cas:property>   
                   <cas:property>
                       <cas:key>DocRefId</cas:key>
                       <cas:value><xsl:value-of select="$DocRefId"/></cas:value>
                   </cas:property>   	   	
                   <cas:property>
                       <cas:key>ResCountryCode</cas:key>
                       <cas:value><xsl:value-of select="$ResCountryCode"/></cas:value>
                   </cas:property>
                    <cas:property>
                       <cas:key>ContextPath</cas:key>
                       <cas:value><xsl:value-of select="$ContextPath"/></cas:value>
                   </cas:property>   	   	
   		</cas:dataset>
	</xsl:template>
	<xsl:template name="genPath">
	    <xsl:param name="prevPath"/>
	    <xsl:variable name="currPath" select="concat('/',local-name(),'[',
	      count(preceding-sibling::*[name() = name(current())])+1,']',$prevPath)"/>
	    <xsl:for-each select="parent::*">
	      <xsl:call-template name="genPath">
	        <xsl:with-param name="prevPath" select="$currPath"/>
	      </xsl:call-template>
	    </xsl:for-each>
	    <xsl:if test="not(parent::*)">
	      <xsl:value-of select="$currPath"/>      
	    </xsl:if>
  </xsl:template>
	
	
</xsl:stylesheet>