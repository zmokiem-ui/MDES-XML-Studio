<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="2.0" 
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
			    xmlns:exsl="http://exslt.org/common"
			    extension-element-prefixes="exsl"
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	<xsl:import href="global-templates.xsl" />
	<xsl:output method="text"/>
	<xsl:param name="labels-escaped"/>
	<xsl:param name="ApplicationNameExtended"/>
	<xsl:param name="ApplicationName"/>
	<xsl:param name="PortaalBaseURL"/>
	<xsl:param name="LogoURL"/>
	<xsl:param name="mailTextLogo"/>
	<xsl:param name="mailTitleColor"/>
	<xsl:param name="mailBodyBG"/>
	<xsl:param name="mailPlainEmail"/>
	<xsl:param name="mailButtonColor"/>
	<xsl:param name="mailFooterBG"/>
	<xsl:param name="mailFooterFontColor"/>
	<xsl:param name="mailFooterText1"/>
	<xsl:param name="mailFooterText2"/>
	<xsl:param name="mailFooterText3"/>
	<xsl:param name="mailFooterText4"/>
	<xsl:param name="mailSignatureNL"/>
	<xsl:param name="mailSignatureEN"/>
	<xsl:param name="mailSignatureES"/>
	<xsl:param name="messageSubject"/>
	<xsl:param name="originaldata"/>
	
	<xsl:template match="/">
		<xsl:variable name="subject-line"  >
			<xsl:choose>
			<xsl:when test="//cas:property[cas:key='FormeleNaam']/cas:value=''">
				<xsl:apply-templates select="//request/*[local-name()=concat(//cas:property[cas:key='MailIdentifier']/cas:value,'.Titel')]"/>
			</xsl:when>
			
			<xsl:otherwise>
				<xsl:variable name="temp-subject">
					<xsl:apply-templates select="//request/*[local-name()=concat(//cas:property[cas:key='MailIdentifier']/cas:value,'.TitelIncFormeleNaam')]"/>
				</xsl:variable>
				<xsl:choose>
					<xsl:when test="$temp-subject=''">
						<xsl:apply-templates select="//request/*[local-name()=concat(//cas:property[cas:key='MailIdentifier']/cas:value,'.Titel')]"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:value-of select="$temp-subject"/>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
		<xsl:call-template name="replace-variables">
			<xsl:with-param name="replace-text" select="$subject-line"/>
		</xsl:call-template>
	</xsl:template>	
	
	
</xsl:stylesheet>