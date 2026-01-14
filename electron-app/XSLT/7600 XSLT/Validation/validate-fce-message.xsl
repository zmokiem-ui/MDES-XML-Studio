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
	
	<xsl:import href="validation-templates.xsl"/>

  
    
	<xsl:template match="/">
		<cas:eventResponse>
			<cas:caseId />
			<xsl:variable name="file-contains-illegal-chars" select="contains(.,'/*') or contains(.,'--')"/>
						
			<xsl:choose>
				<xsl:when test="$file-contains-illegal-chars">
					<xsl:apply-templates select="." mode="Error" >
		                <xsl:with-param name="MeldingId" select="'BestandBevatIllegaleTekens'"/>
						<xsl:with-param name="ErrorId" select="98017"/>					
					</xsl:apply-templates>
				</xsl:when>
				<xsl:otherwise>
			   		<xsl:apply-templates select="*/*[local-name()='MessageHeader' or local-name()='MessageSpec']" />
			   		<xsl:apply-templates select="*/*[local-name()='MessageBody' or local-name()='CrsBody']" />
				</xsl:otherwise>
			</xsl:choose>
			
		</cas:eventResponse>
		
	</xsl:template>
	
	<xsl:template match="*[local-name()='MessageHeader' or local-name()='MessageSpec']">
		<xsl:if test="$DocIsFC">
			<xsl:apply-templates select="." mode="Error-CorrMessageRefIdIsVerplicht" />
			
		</xsl:if>
	   <xsl:apply-templates select="." mode="Error-80007" />
	   <xsl:apply-templates select="." mode="Error-MessageRefIdHeeftOnjuistFormaat" />
	   <xsl:apply-templates select="." mode="Error-SendingCompanyINVerplicht" />
	   <xsl:apply-templates select="." mode="Error-AccountReportMustBeProvided" />
	</xsl:template>
	
	
	
	<xsl:template match="*" mode="Error-AccountReportMustBeProvided"> <!-- AccountReportMustBeProvided -->
		<xsl:if test="*[local-name()='MessageTypeIndic'] != 'CRS703' and count(//*[local-name()='AccountReport']) = 0">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'AccountReportMustBeProvided'"/>
				<xsl:with-param name="ErrorId" select="80017"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="*" mode="Error-CorrMessageRefIdIsVerplicht"> <!-- MessageSpecCorrMessageRefIDForbidden -->
		<xsl:if test="*[local-name()='MessageTypeIndic'] = 'CRS702' and count(*[local-name()='CorrMessageRefId']) = 0">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'CorrMessageRefIdVerplicht'"/>
				<xsl:with-param name="ErrorId" select="80007"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="*" mode="Error-MessageRefIdHeeftOnjuistFormaat"> <!-- Error-MessageRefIdHeeftOnjuistFormaat -->
		
		<xsl:if test="not(starts-with($MessageRefId,concat($Country_Code_Provision,$TaxYear,$SendingCompanyIN)) or starts-with($MessageRefId,concat($Country_Code_Provision,$TaxYear - 1,$SendingCompanyIN)))">
			<xsl:apply-templates select="." mode="Error" >
                <xsl:with-param name="MeldingId" select="'MessageRefIdHeeftOnjuistFormaat'"/>
				<xsl:with-param name="ErrorId" select="80017"/>
			</xsl:apply-templates>
		</xsl:if>
		
		<xsl:if test="contains($MessageRefId,' ')">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'MessageRefIdMagGeenSpatiesBevatten'"/>
				<xsl:with-param name="ErrorId" select="80025"/>
			</xsl:apply-templates>
		</xsl:if>
	
	</xsl:template>
	
	<xsl:template match="*" mode="Error-SendingCompanyINVerplicht"> <!-- SendingCompanyINVerplicht -->
		<xsl:if test="$SendingCompanyIN=''">
			<xsl:apply-templates select="parent::*" mode="Error" >
                <xsl:with-param name="MeldingId" select="'SendingCompanyINVerplicht'"/>
				<xsl:with-param name="ErrorId" select="80026"/>
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
		
</xsl:stylesheet>