<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="1.0" 
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
	
	
	<xsl:variable name="ExchangeCountries" select="'SX,AS,AW,BQ,GF,PF,TF,GP,GU,HK,MO,MQ,YT,NC,PR,RE,BL,MF,PM,SJ,TW,UM,VI,WF,AX,VG,CW,GG,JE,MS,IM,AI,BV,IO,CX,CC,FO,FK,GI,GL,HM,KY,NU,NF,PN,SH,TK,TC,GS,AF,AL,DZ,AD,AO,AG,AR,AM,AU,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,MM,BO,BA,BW,BR,BN,BG,BF,BI,KH,CA,CF,CL,CN,CO,KM,CD,CG,CR,CU,CY,DK,DJ,DO,DM,DE,EC,EG,SV,GQ,ER,EE,ET,FJ,PH,FI,FR,GA,GM,GE,GH,GD,GR,GB,GT,GW,GN,GY,HT,HN,HU,IE,IS,IN,ID,IQ,IR,IL,IT,CI,JM,JP,YE,JO,CV,CM,KZ,KE,KG,KI,KW,HR,LA,LS,LV,LB,LR,LY,LI,LT,LU,MK,MG,MW,MV,MY,ML,MT,MA,MH,MR,MU,MX,FM,MD,MC,MN,ME,MZ,NA,NR,NL,NP,NI,NZ,NG,NE,KP,MP,NO,UA,UZ,OM,TL,AT,PK,PW,PA,PG,PY,PE,PL,PT,QA,RO,RW,RU,SB,SM,ST,SA,SN,RS,SC,SL,SG,KN,LC,VC,SI,SK,SO,ES,LK,SD,SR,SZ,SY,TJ,TZ,TH,TG,TO,TT,TD,CZ,TN,TR,TM,TV,UG,UY,VU,VA,VE,AE,US,VN,WS,ZM,ZW,ZA,KR,SE,CH,AQ,BM,CK,PS,SS,EH,XX'" />
	
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="UploadData">
		        <cas:label>UploadData</cas:label>
		        <xsl:apply-templates select="//*[local-name()='CRS_OECD']" mode="UploadDocumentType"/>
    			<xsl:apply-templates select="//*[local-name()='FATCA_CRS']" mode="UploadDocumentType"/>
    			<xsl:apply-templates select="//*[local-name()='CBC_OECD']" mode="UploadDocumentType"/>
		   		<xsl:apply-templates select="//*[local-name()='CRSStatusMessage_OECD']" mode="UploadDocumentType"/>
    			<xsl:apply-templates select="//*[local-name()='CbCStatusMessage_OECD']" mode="UploadDocumentType"/>
    			<xsl:apply-templates select="//*[local-name()='NTJ_OECD']" mode="UploadDocumentType"/>
    			<!-- <xsl:apply-templates select="//*[local-name()='FATCA_Notification']" mode="UploadDocumentType"/> -->
    			
		   		<xsl:apply-templates select="//*[local-name()='CRS_OECD']" mode="version"/>
    			<xsl:apply-templates select="//*[local-name()='FATCA_CRS']" mode="version"/>
    			<xsl:apply-templates select="//*[local-name()='CBC_OECD']" mode="version"/>
    			<xsl:apply-templates select="//*[local-name()='CRSStatusMessage_OECD']" mode="version"/>
    			<xsl:apply-templates select="//*[local-name()='CbCStatusMessage_OECD']" mode="version"/>
    			<xsl:apply-templates select="//*[local-name()='NTJ_OECD']" mode="version"/>
    			<!-- <xsl:apply-templates select="//*[local-name()='FATCA_Notification']" mode="version"/>-->
		   		
		   	
    		</cas:dataset>
    		<xsl:apply-templates select="//*[local-name()='CRS_OECD']" mode="MessageHeader"/>
    		<xsl:apply-templates select="//*[local-name()='FATCA_CRS']" mode="MessageHeader"/>
    		<xsl:apply-templates select="//*[local-name()='CBC_OECD']" mode="MessageHeader_CBC"/>
    		<xsl:apply-templates select="//*[local-name()='CRSStatusMessage_OECD']" mode="MessageHeader"/>
    		<xsl:apply-templates select="//*[local-name()='CbCStatusMessage_OECD']" mode="MessageHeader"/>
    		<xsl:apply-templates select="//*[local-name()='NTJ_OECD']" mode="MessageHeader"/>
    		<!-- <xsl:apply-templates select="//*[local-name()='FATCA_Notification']" mode="MessageHeader"/> -->
		</cas:eventResponse>
	</xsl:template>
	
	
	<xsl:template match="*" mode="MessageHeader_CBC">
		<cas:dataset id="MessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageHeader']/*" mode="attribute"/>
			<xsl:apply-templates select="*[local-name()='MessageSpec']/*" mode="attribute"/>
			
			
	<xsl:variable name="NoOfConstituentEntities"  select="count(//*[local-name()='ConstEntity'])"/>
	<xsl:variable name="NoOfConstituentEntityAddresses"  select="count(//*[local-name()='ConstEntity']/*[local-name()='Address'])"/>
	<xsl:variable name="NoOfReportingEntities"  select="count(//*[local-name()='ReportingEntity'])"/>
	 <xsl:variable name="NoOfConstituentEntitiesPlusNoOfReportingEntities"><xsl:value-of select="$NoOfConstituentEntities + $NoOfReportingEntities"/></xsl:variable>
	<xsl:variable name="NoOfCbcReports"  select="count(//*[local-name()='CbcReports'])"/>
	
	<xsl:variable name="ResCountryCodes">
				<xsl:apply-templates select="//*[local-name()='ResCountryCode']" mode="concat"/>
	</xsl:variable>
	
	<xsl:variable name="DistinctCountries">
			 <xsl:call-template name="tokenize">
                <xsl:with-param name="InputExchangeCountries" select="normalize-space($ExchangeCountries)" />
                <xsl:with-param name="InputResCountryCodes" select="normalize-space($ResCountryCodes)" />
            </xsl:call-template>
	</xsl:variable>
			
	<xsl:variable name="NoOfNOTIN"  select="count(//*[local-name()='TIN'][.='NOTIN'])"/>
    <xsl:variable name="NoOfTIN"  select="count(//*[local-name()='TIN'])"/>
	
	<xsl:variable name="NoOfCompleteAddressCE" select="count(//*[local-name()='ConstEntity']/*[local-name()='Address'][*[local-name()='AddressFix'][count(*[local-name()='Street' or local-name()='City' or local-name()='BuildingIdentifier' or  local-name()='PostCode']) = 4]])"/>
	<xsl:variable name="NoOfCompleteAddressRE" select="count(//*[local-name()='ReportingEntity'][*/*[local-name()='Address']/*[local-name()='AddressFix'][count(*[local-name()='Street' or local-name()='City' or local-name()='BuildingIdentifier']) = 3]])"/>
	<xsl:variable name="NoOfCompleteAddress" select="$NoOfCompleteAddressCE + $NoOfCompleteAddressRE"/>
	
	<xsl:variable name="ReportingRole"  select="//*[local-name()='ReportingRole']"/>
	
	<xsl:variable name="PercentageAddress"><xsl:value-of select="round($NoOfCompleteAddress div ($NoOfConstituentEntityAddresses + $NoOfReportingEntities)*100)"/></xsl:variable>

	<xsl:variable name="PercentageNOTIN">
			<xsl:choose>
			<xsl:when test="$NoOfConstituentEntitiesPlusNoOfReportingEntities != 0">
				<xsl:value-of select="round((($NoOfTIN - $NoOfNOTIN) div $NoOfConstituentEntitiesPlusNoOfReportingEntities)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
	
	<cas:property>
            	<cas:key>NoOfConstituentEntities</cas:key>
            	<cas:value><xsl:value-of select="$NoOfConstituentEntities"/>
            	</cas:value>
    </cas:property>
      
      
      <cas:property>
            	<cas:key>NoOfReportingEntities</cas:key>
            	<cas:value><xsl:value-of select="$NoOfReportingEntities"/>
            	</cas:value>
      </cas:property>
	
	<cas:property>
            	<cas:key>DistinctCountries</cas:key>
            	<cas:value><xsl:value-of select="$DistinctCountries"/>
            	</cas:value>
    </cas:property>
	
	<cas:property>
            	<cas:key>PercentageNOTIN</cas:key>
            	<cas:value><xsl:value-of select="$PercentageNOTIN"/>
            	</cas:value>
        	</cas:property>
        	
    <cas:property>
            	<cas:key>ReportingRole</cas:key>
            	<cas:value><xsl:value-of select="$ReportingRole"/>
            	</cas:value>
    </cas:property>
        	
    <cas:property>
            	<cas:key>PercentageAddress</cas:key>
            	<cas:value><xsl:value-of select="$PercentageAddress"/>
            	</cas:value>
    </cas:property>
    
	</cas:dataset>
	</xsl:template>

	<xsl:template match="*" mode="MessageHeader">
		<cas:dataset id="MessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageHeader']/*" mode="attribute"/>
			<xsl:apply-templates select="*[local-name()='MessageSpec']/*" mode="attribute"/>
			
			<xsl:variable name="NoOfIndividuals"  select="count(//*[local-name()='Individual'])"/>
			<xsl:variable name="NoOfOrganisations"  select="count(//*[local-name()='Organisation'])"/>
			
			<xsl:variable name="NoOfControllingPersons"  select="count(//*[local-name()='ControllingPerson'])"/>
			<xsl:variable name="NoOfControllingPersonsWithTIN"  select="count(//*[local-name()='ControllingPerson']/*/*[local-name()='TIN' or local-name()='IN'])"/>
			<xsl:variable name="NoOfControllingPersonsWithDateOfBirth"  select="count(//*[local-name()='ControllingPerson']/*/*/*[local-name()='BirthDate'])"/>
			<xsl:variable name="NoOfControllingPersonsWithAddress"  select="count(//*[local-name()='ControllingPerson']/*[local-name()='Individual']/*[local-name()='Address'][count(*[local-name()='AddressFix'][*[local-name()='City']!='' and *[local-name()='BuildingIdentifier']!='' and *[local-name()='PostCode']!='' and  *[local-name()='Street']!='']) &gt; 0])"/>
			
			<xsl:variable name="NoOfIndividualAccountHolders"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Individual'])"/>
			<xsl:variable name="NoOfIndividualAccountHoldersRescountries"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Individual']/*[local-name()='ResCountryCode'])"/>
			<xsl:variable name="NoOfIndividualAccountHoldersWithTIN"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Individual' and count(*[local-name()='TIN' or local-name()='IN']) &gt; 0])"/>

			<xsl:variable name="NoOfIndividualAccountHoldersWithDateOfBirth"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Individual']/*/*[local-name()='BirthDate'])"/>
			<xsl:variable name="NoOfIndividualAccountHoldersWithAddress"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Individual']/*[local-name()='Address'][count(*[local-name()='AddressFix'][*[local-name()='City']!='' and *[local-name()='BuildingIdentifier']!='' and *[local-name()='PostCode']!=''  and  *[local-name()='Street']!='']) &gt; 0])"/>
			
			<xsl:variable name="NoOfOrganisationAccountHolders"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Organisation'])"/>
			<xsl:variable name="NoOfOrganisationAccountHoldersRescountries"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Organisation']/*[local-name()='ResCountryCode'])"/>
			<xsl:variable name="NoOfOrganisationAccountHoldersWithTIN"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Organisation' and count(*[local-name()='TIN' or local-name()='IN'])&gt;0])"/>
			<xsl:variable name="NoOfOrganisationAccountHoldersWithAddress"  select="count(//*[local-name()='AccountHolder']/*[local-name()='Organisation']/*[local-name()='Address'][count(*[local-name()='AddressFix'][*[local-name()='City']!='' and *[local-name()='PostCode']!=''  and *[local-name()='BuildingIdentifier']!=''  and  *[local-name()='Street']!='']) &gt; 0])"/>
			
			<xsl:variable name="NoOfReportingFIs"  select="count(//*[local-name()='ReportingFI'])"/>
			<xsl:variable name="NoOfReportingFIsWithTIN"  select="count(//*[local-name()='ReportingFI']/*[local-name()='TIN' or local-name()='IN'])"/>
			<xsl:variable name="NoOfReportingFIsWithAddress"  select="count(//*[local-name()='ReportingFI']/*[local-name()='Address'][count(*[local-name()='AddressFix'][*[local-name()='City']!='' and *[local-name()='BuildingIdentifier']!='' and  *[local-name()='Street']!='']) &gt; 0])"/>
			
			
			<xsl:variable name="NoOfAccountHolders"  select="count(//*[local-name()='AccountHolder'])"/>
			<xsl:variable name="NoOfAccountReports"  select="count(//*[local-name()='AccountReport'])"/>
			
			<xsl:variable name="ResCountryCodes">
				<xsl:apply-templates select="//*[local-name()='ResCountryCode']" mode="concat"/>
			</xsl:variable>
			
			<xsl:variable name="DistinctCountries">
			 <xsl:call-template name="tokenize">
                <xsl:with-param name="InputExchangeCountries" select="normalize-space($ExchangeCountries)" />
                <xsl:with-param name="InputResCountryCodes" select="normalize-space($ResCountryCodes)" />
            </xsl:call-template>
			</xsl:variable>
			
			<xsl:variable name="Missing_RFI_TIN">
			<xsl:choose>
			<xsl:when test="$NoOfReportingFIs != 0">
				<xsl:value-of select="round(($NoOfReportingFIsWithTIN div $NoOfReportingFIs)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_RFI_Address">
			<xsl:choose>
			<xsl:when test="$NoOfReportingFIs != 0">
				<xsl:value-of select="round(($NoOfReportingFIsWithAddress div $NoOfReportingFIs)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_AH_ORG_TIN">
			<xsl:choose>
			<xsl:when test="$NoOfOrganisationAccountHolders != 0">
				<xsl:value-of select="round(($NoOfOrganisationAccountHoldersWithTIN div $NoOfOrganisationAccountHolders)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_AH_ORG_Address">
			<xsl:choose>
			<xsl:when test="$NoOfOrganisationAccountHolders != 0">
				<xsl:value-of select="round(($NoOfOrganisationAccountHoldersWithAddress div $NoOfOrganisationAccountHolders)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_AH_IND_Address">
			<xsl:choose>
			<xsl:when test="$NoOfIndividualAccountHolders != 0">
				<xsl:value-of select="round(($NoOfIndividualAccountHoldersWithAddress div $NoOfIndividualAccountHolders)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_AH_IND_DateOfBirth">
			<xsl:choose>
			<xsl:when test="$NoOfIndividualAccountHolders != 0">
				<xsl:value-of select="round(($NoOfIndividualAccountHoldersWithDateOfBirth div $NoOfIndividualAccountHolders)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
        	
			<xsl:variable name="Missing_AH_IND_TIN">
			<xsl:choose>
			<xsl:when test="$NoOfIndividualAccountHolders != 0">
				<xsl:value-of select="round(($NoOfIndividualAccountHoldersWithTIN div $NoOfIndividualAccountHolders)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
		
			<xsl:variable name="Missing_CP_IND_TIN">
			<xsl:choose>
			<xsl:when test="$NoOfControllingPersons != 0">
				<xsl:value-of select="round(($NoOfControllingPersonsWithTIN div $NoOfControllingPersons)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<xsl:variable name="Missing_CP_IND_DateOfBirth">
			<xsl:choose>
			<xsl:when test="$NoOfControllingPersons != 0">
				<xsl:value-of select="round(($NoOfControllingPersonsWithDateOfBirth div $NoOfControllingPersons)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
				<xsl:variable name="Missing_CP_IND_Address">
			<xsl:choose>
			<xsl:when test="$NoOfControllingPersons != 0">
				<xsl:value-of select="round(($NoOfControllingPersonsWithAddress div $NoOfControllingPersons)*100)"/>
			</xsl:when>
			<xsl:otherwise>
			<xsl:text>100</xsl:text>
			</xsl:otherwise>
			</xsl:choose>
			</xsl:variable>
			
			<cas:property>
            	<cas:key>NoOfAccountHolders</cas:key>
            	<cas:value><xsl:value-of select="$NoOfAccountHolders"/>
            	</cas:value>
        	</cas:property>
        	
			<cas:property>
            	<cas:key>NoOfReportingFIs</cas:key>
            	<cas:value><xsl:value-of select="$NoOfReportingFIs"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfAccountReports</cas:key>
            	<cas:value><xsl:value-of select="$NoOfAccountReports"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfControllingPersons</cas:key>
            	<cas:value><xsl:value-of select="$NoOfControllingPersons"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfIndividuals</cas:key>
            	<cas:value><xsl:value-of select="$NoOfIndividuals"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfOrganisations</cas:key>
            	<cas:value><xsl:value-of select="$NoOfOrganisations"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfOrganisationAccountHolders</cas:key>
            	<cas:value><xsl:value-of select="$NoOfOrganisationAccountHolders"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>NoOfIndividualAccountHolders</cas:key>
            	<cas:value><xsl:value-of select="$NoOfIndividualAccountHolders"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>DistinctCountries</cas:key>
            	<cas:value><xsl:value-of select="$DistinctCountries"/></cas:value>
        	</cas:property>
        	
			<cas:property>
            	<cas:key>Missing_RFI_TIN</cas:key>
            	<cas:value><xsl:value-of select="$Missing_RFI_TIN"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_RFI_Address</cas:key>
            	<cas:value><xsl:value-of select="$Missing_RFI_Address"/></cas:value>
        	</cas:property>

        	
			<cas:property>
            	<cas:key>Missing_CP_IND_TIN</cas:key>
            	<cas:value><xsl:value-of select="$Missing_CP_IND_TIN"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_CP_IND_DateOfBirth</cas:key>
            	<cas:value><xsl:value-of select="$Missing_CP_IND_DateOfBirth"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_CP_IND_Address</cas:key>
            	<cas:value><xsl:value-of select="$Missing_CP_IND_Address"/>
            	</cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_AH_IND_TIN</cas:key>
            	<cas:value><xsl:value-of select="$Missing_AH_IND_TIN"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_AH_IND_Address</cas:key>
            	<cas:value><xsl:value-of select="$Missing_AH_IND_Address"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_AH_IND_DateOfBirth</cas:key>
            	<cas:value><xsl:value-of select="$Missing_AH_IND_DateOfBirth"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_AH_ORG_TIN</cas:key>
            	<cas:value><xsl:value-of select="$Missing_AH_ORG_TIN"/></cas:value>
        	</cas:property>
        	
        	<cas:property>
            	<cas:key>Missing_AH_ORG_Address</cas:key>
            	<cas:value><xsl:value-of select="$Missing_AH_ORG_Address"/></cas:value>
        	</cas:property>
   		</cas:dataset>
	</xsl:template>
	
	

	
<xsl:template match="*" mode="concat"> 
		<xsl:value-of select="concat(.,',')"/>
	</xsl:template>

	
	<xsl:template match="*" mode="attribute">
		<cas:property>
            <cas:key><xsl:value-of select="local-name()" /></cas:key>
            <cas:value><xsl:value-of select="." /></cas:value>
        </cas:property>
    </xsl:template>
        
	<xsl:template match="*[local-name()='FATCA_CRS']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>FCDocument</cas:value>
        </cas:property>        
	</xsl:template>
	
	<xsl:template match="*[local-name()='CBC_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CbCDocument</cas:value>
        </cas:property>        
	</xsl:template>
	
	<xsl:template match="*[local-name()='NTJ_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>NTJDocument</cas:value>
        </cas:property>        
	</xsl:template>
	
	<xsl:template match="*[local-name()='CRS_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CRSDocument</cas:value>
        </cas:property>        
	</xsl:template>
	<xsl:template match="*[local-name()='FATCA_Notification']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>FATCA_Notification</cas:value>
        </cas:property>        
	</xsl:template>
	
	<xsl:template match="*[local-name()='CbCStatusMessage_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CbCStatusMessage</cas:value>
        </cas:property>        
	</xsl:template>
	
	<xsl:template match="*[local-name()='CRSStatusMessage_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CRSStatusMessage</cas:value>
        </cas:property>        
	</xsl:template>
	<xsl:template match="*" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CbCDocument</cas:value>
        </cas:property>
        <cas:property>
            <cas:key>NumberOfAccountReports</cas:key>
            <cas:value>0</cas:value>
        </cas:property>
        
       

	</xsl:template>
	<xsl:template match="*[local-name()='ReceivingCountry']" mode="attribute"/>
	<xsl:template match="*[local-name()='ReportingPeriod']" mode="attribute"/>
		
	
	<xsl:template match="*[local-name()='ReceivingCountry'][count(preceding-sibling::*[local-name()='ReceivingCountry'])=0]" mode="attribute">
		<cas:property>
            <cas:key><xsl:value-of select="local-name()" /></cas:key>
		    <cas:value>
				<xsl:apply-templates select="//*[local-name()='ReceivingCountry']" mode="MC"/>
		    </cas:value>
		 </cas:property>
	</xsl:template>
		<xsl:template match="*[local-name()='ReportingPeriod'][count(preceding-sibling::*[local-name()='ReportingPeriod'])=0]" mode="attribute">
		<cas:property>
            <cas:key><xsl:value-of select="local-name()" /></cas:key>
		    <cas:value>
				<xsl:apply-templates select="../*[local-name()='ReportingPeriod']" mode="MC"/>
		    </cas:value>
		 </cas:property>
	</xsl:template>
	
	<xsl:template match="*" mode="MC">
		<xsl:value-of select="."/>
		<xsl:if test="position() != last()">
			<xsl:text>,</xsl:text>
		</xsl:if>
	</xsl:template>
	<xsl:template match="*" mode="version">
		<cas:property>
            <cas:key>Version</cas:key>
            <cas:value><xsl:value-of select="@version"/></cas:value>
        </cas:property>
        
		
	</xsl:template>
	<xsl:template name="tokenize">
        <xsl:param name="InputExchangeCountries" />
        <xsl:param name="InputResCountryCodes" />
        <xsl:param name="separator" select="','" />

        <xsl:choose>
            <xsl:when test="not(contains($InputExchangeCountries, $separator))">
                <xsl:if test="contains($InputResCountryCodes, $InputExchangeCountries)">
                	<xsl:value-of select="concat($InputExchangeCountries,', ')"/>
                </xsl:if>
            </xsl:when>
            <xsl:otherwise>
                
                <xsl:variable name="CurrentCountry" select="substring-before($InputExchangeCountries, $separator)" />
                <xsl:if test="contains($InputResCountryCodes, $CurrentCountry)">
                	<xsl:value-of select="concat($CurrentCountry,', ')"/>
                </xsl:if>
                
                <xsl:call-template name="tokenize">
                    <xsl:with-param name="InputExchangeCountries" select="normalize-space(substring-after($InputExchangeCountries, $separator))" />
                    <xsl:with-param name="InputResCountryCodes" select="$InputResCountryCodes" />
                    
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template> 
</xsl:stylesheet>