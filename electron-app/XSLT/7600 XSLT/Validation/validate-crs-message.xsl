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
	<xsl:import href="crs-validation-templates.xsl"/>
	<xsl:import href="validation-templates.xsl"/>
	<xsl:param name="EnvironmentUsedForTest" />
	<xsl:param name="Country_Code_Provision" />
	<xsl:param name="PartnerJurisdictions" />
    <xsl:param name="IsDomestic" select="false()"/>
    <xsl:param name="IsForeign" select="true()"/>
	
	<xsl:variable name="AlleTweeLetterCodes" select="'SX,AS,AW,BQ,GF,PF,TF,GP,GU,HK,MO,MQ,YT,NC,PR,RE,BL,MF,PM,SJ,TW,UM,VI,WF,AX,VG,CW,GG,JE,MS,IM,AI,BV,IO,CX,CC,FO,FK,GI,GL,HM,KY,NU,NF,PN,SH,TK,TC,GS,AF,AL,DZ,AD,AO,AG,AR,AM,AU,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,MM,BO,BA,BW,BR,BN,BG,BF,BI,KH,CA,CF,CL,CN,CO,KM,CD,CG,CR,CU,CY,DK,DJ,DO,DM,DE,EC,EG,SV,GQ,ER,EE,ET,FJ,PH,FI,FR,GA,GM,GE,GH,GD,GR,GB,GT,GW,GN,GY,HT,HN,HU,IE,IS,IN,ID,IQ,IR,IL,IT,CI,JM,JP,YE,JO,CV,CM,KZ,KE,KG,KI,KW,HR,LA,LS,LV,LB,LR,LY,LI,LT,LU,MK,MG,MW,MV,MY,ML,MT,MA,MH,MR,MU,MX,FM,MD,MC,MN,ME,MZ,NA,NR,NL,NP,NI,NZ,NG,NE,KP,MP,NO,UA,UZ,OM,TL,AT,PK,PW,PA,PG,PY,PE,PL,PT,QA,RO,RW,RU,SB,SM,ST,SA,SN,RS,SC,SL,SG,KN,LC,VC,SI,SK,SO,ES,LK,SD,SR,SZ,SY,TJ,TZ,TH,TG,TO,TT,TD,CZ,TN,TR,TM,TV,UG,UY,VU,VA,VE,AE,US,VN,WS,ZM,ZW,ZA,KR,SE,CH,AQ,BM,CK,PS,SS,EH,XX'" />
	
	<xsl:variable name="MessageRefId" select="*/*[local-name()='MessageHeader']/*[local-name()='MessageRefId']"/>
	<xsl:variable name="TransmittingCountry" select="*/*[local-name()='MessageHeader']/*[local-name()='TransmittingCountry']"/>
	<xsl:variable name="ReceivingCountry" select="*/*[local-name()='MessageHeader']/*[local-name()='ReceivingCountry']"/>
	
	<xsl:variable name="ReportingPeriod" select="*/*[local-name()='MessageHeader']/*[local-name()='ReportingPeriod']"/>
	<xsl:variable name="MessageTypeIndic" select="*/*[local-name()='MessageHeader']/*[local-name()='MessageTypeIndic']"/>
	
	<xsl:variable name="allDocRefIds" select="//*[local-name()='DocRefId']"/>
	
    <xsl:variable name="TaxYear" select="substring($ReportingPeriod,0,5)"/>
    
    
	<xsl:template match="/">
		<cas:eventResponse>
			<cas:caseId />
	   		<xsl:apply-templates select="//*[local-name()='MessageHeader']" />
	   		<xsl:apply-templates select="//*[local-name()='MessageBody']" />
		</cas:eventResponse>
		
	</xsl:template>
	
</xsl:stylesheet>