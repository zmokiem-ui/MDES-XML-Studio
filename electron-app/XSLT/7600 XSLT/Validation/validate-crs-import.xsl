<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="2.0" 
   				
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
	<xsl:param name="IsDomestic" select="true()"/>
    <xsl:param name="IsForeign" select="false()"/>
    
	<xsl:variable name="AlleTweeLetterCodes" select="'SX,AS,AW,BQ,GF,PF,TF,GP,GU,HK,MO,MQ,YT,NC,PR,RE,BL,MF,PM,SJ,TW,UM,VI,WF,AX,VG,CW,GG,JE,MS,IM,AI,BV,IO,CX,CC,FO,FK,GI,GL,HM,KY,NU,NF,PN,SH,TK,TC,GS,AF,AL,DZ,AD,AO,AG,AR,AM,AU,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,MM,BO,BA,BW,BR,BN,BG,BF,BI,KH,CA,CF,CL,CN,CO,KM,CD,CG,CR,CU,CY,DK,DJ,DO,DM,DE,EC,EG,SV,GQ,ER,EE,ET,FJ,PH,FI,FR,GA,GM,GE,GH,GD,GR,GB,GT,GW,GN,GY,HT,HN,HU,IE,IS,IN,ID,IQ,IR,IL,IT,CI,JM,JP,YE,JO,CV,CM,KZ,KE,KG,KI,KW,HR,LA,LS,LV,LB,LR,LY,LI,LT,LU,MK,MG,MW,MV,MY,ML,MT,MA,MH,MR,MU,MX,FM,MD,MC,MN,ME,MZ,NA,NR,NL,NP,NI,NZ,NG,NE,KP,MP,NO,UA,UZ,OM,TL,AT,PK,PW,PA,PG,PY,PE,PL,PT,QA,RO,RW,RU,SB,SM,ST,SA,SN,RS,SC,SL,SG,KN,LC,VC,SI,SK,SO,ES,LK,SD,SR,SZ,SY,TJ,TZ,TH,TG,TO,TT,TD,CZ,TN,TR,TM,TV,UG,UY,VU,VA,VE,AE,US,VN,WS,ZM,ZW,ZA,KR,SE,CH,AQ,BM,CK,PS,SS,EH,XX'" />
	
	<xsl:variable name="MessageRefId" select="*/*[local-name()='MessageHeader']/*[local-name()='MessageRefId']"/>
	<xsl:variable name="TransmittingCountry" select="*/*[local-name()='MessageHeader']/*[local-name()='TransmittingCountry']"/>
	<xsl:variable name="ReceivingCountry" select="*/*[local-name()='MessageHeader']/*[local-name()='ReceivingCountry']"/>
	
	<xsl:variable name="ReportingPeriod" select="*/*[local-name()='MessageHeader']/*[local-name()='ReportingPeriod']"/>
	<xsl:variable name="MessageTypeIndic" select="*/*[local-name()='MessageHeader']/*[local-name()='MessageTypeIndic']"/>
	
	<xsl:variable name="allDocRefIds" select="//*[local-name()='DocRefId']"/>
	
    <xsl:variable name="TaxYear" select="substring($ReportingPeriod,0,5)"/>
    
    <xsl:template match="*"/>
    
	<xsl:template match="/">
		<cas:eventResponse>
			<cas:caseId />
	   		<xsl:apply-templates select="*/*[local-name()='MessageHeader']" />
	   		<xsl:apply-templates select="*/*[local-name()='MessageBody']" />
		</cas:eventResponse>
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='MessageHeader']">
	   <xsl:apply-templates select="." mode="Error-80007" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='MessageBody']">
		
	   <xsl:apply-templates select="*[local-name()='ReportingFI']" />
	   <xsl:apply-templates select="*[local-name()='ReportingGroup']" />
	   <xsl:apply-templates select="." mode="Error-60007" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='ReportingFI']">
		<xsl:apply-templates select="*[local-name()='Address']" />
		<xsl:apply-templates select="*[local-name()='DocSpec']" />
		<xsl:apply-templates select="*[local-name()='Name']" />
		<xsl:apply-templates select="." mode="Error-TIN" />
		<xsl:apply-templates select="." mode="Error-60013" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='ReportingGroup']">
		<xsl:apply-templates select="*[local-name()='AccountReport']" />
		
		<xsl:apply-templates select="." mode="Error-60008" />
		<xsl:apply-templates select="." mode="Error-60009" />
		<xsl:apply-templates select="." mode="Error-60010" />
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='AccountReport']">
		<xsl:apply-templates select="*[local-name()='AccountNumber']" />
		<xsl:apply-templates select="*[local-name()='AccountHolder']" />
		<xsl:apply-templates select="*[local-name()='ControllingPerson']" />
		<xsl:apply-templates select="*[local-name()='AccountBalance']" />
	 	<xsl:apply-templates select="*[local-name()='DocSpec']" />
	 	<xsl:if test="$IsForeign">
		 	<xsl:apply-templates select="." mode="Error-ResCountryCodeNotReceivingCountry" />
	 	</xsl:if>
		 	<xsl:apply-templates select="." mode="Error-60005" />
		 	<xsl:apply-templates select="." mode="Error-60006" />
		 	<xsl:apply-templates select="." mode="Error-60014" />
		 	<xsl:apply-templates select="." mode="Error-98003" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='AccountHolder']">
	 	<xsl:apply-templates select="*[local-name()='Individual']" />
	 	<xsl:apply-templates select="*[local-name()='Organisation']" />
	 	<xsl:apply-templates select="." mode="Error-98002" />
	 	<xsl:apply-templates select="." mode="Error-60016" />	 		 	
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
	</xsl:template>
	
	<xsl:template match="*[local-name()='Individual']">
		<xsl:apply-templates select="*[local-name()='Name']" />
	 	<xsl:apply-templates select="*[local-name()='Address']" />
	 	<xsl:apply-templates select="*[local-name()='BirthInfo']" />
	 	
	 	<xsl:apply-templates select="." mode="Error-TIN" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='Organisation']">
	 	<xsl:apply-templates select="*[local-name()='Address']" />
	 	<xsl:apply-templates select="*[local-name()='Name']" />
	 	<xsl:apply-templates select="." mode="Error-TIN" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='Address']">
		<xsl:apply-templates select="." mode="Error-AddressFix" />
		<xsl:apply-templates select="." mode="Error-AddressFree" />
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='BirthInfo']">
		<xsl:apply-templates select="." mode="Error-60014" />
	</xsl:template>
	
	<xsl:template match="*[local-name()='DocSpec']">
		<xsl:apply-templates select="." mode="Error-50010" />
		<xsl:apply-templates select="." mode="Error-50011" />
		<xsl:apply-templates select="." mode="Error-80000" />
		<xsl:apply-templates select="." mode="Error-80001" />
		<xsl:apply-templates select="." mode="Error-80004" />
		<xsl:apply-templates select="." mode="Error-80005" />
		<xsl:apply-templates select="." mode="Error-80006" />
		<xsl:apply-templates select="." mode="Error-80008" />
		<xsl:apply-templates select="." mode="Error-80010" />
		<xsl:apply-templates select="." mode="Error-80011" />
				
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='Name']">
	 	<xsl:apply-templates select="." mode="Error-NameType" />
	 	<xsl:apply-templates select="." mode="Error-Name" />
		<xsl:apply-templates select="." mode="Error-FirstName" />
		<xsl:apply-templates select="." mode="Error-LastName" />
	</xsl:template>
	
	
</xsl:stylesheet>