<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="1.0" 
				xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
				xmlns:html="http://www.w3.org/1999/xhtml"  
				xmlns:bi="http://www.be-informed.nl/BeInformed" 
				xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" 
				xmlns:cmf="http://www.be-informed.nl/BeInformed/CMF" 
				xmlns:when="http://www.be-informed.nl/BeInformed/when" 
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
				xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/whenservice"
			    xmlns:attachment="http://schemas.beinformed.nl/beinformed/v3/services/whenservice/attachments"
			    xmlns:xop="http://www.w3.org/2004/08/xop/include" 
				exclude-result-prefixes="bi knowledge cmf when form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	
	
	<xsl:param name="tweeletterCodes" select="'NL,FR'"/>
	
	<xsl:template match="*" mode="validate-account-reports">
		<xsl:apply-templates select="//*[local-name()='AccountReport']" mode="validate-account-report"/>
	</xsl:template>
	
	<xsl:template match="*" mode="validate-account-report">
		<xsl:apply-templates select="*[local-name()='AccountNumber']" mode="validate-account-number"/>
	</xsl:template>
		
	<xsl:template match="*[.='']" mode="validate-account-number">
		<xsl:call-template name="create-error">
	        <xsl:with-param name="error"><xsl:value-of select="'CrsAccountNumberMoetAanwezigZijn'" /></xsl:with-param>
		</xsl:call-template>
	</xsl:template>
	
	<xsl:template match="*" mode="validate-account-number">
		<xsl:apply-templates select="." mode="validate-account-number-format"/>
	</xsl:template>

	<xsl:template match="*" mode="validate-account-number-format">
		<xsl:choose>
			<xsl:when test="@AccNumberType='OECD601'"> <!-- IBAN -->
				<xsl:if test="not(contains($tweeletterCodes,substring(.,1,2)))"> <!-- geen mogelijk land -->
					<xsl:call-template name="create-error">
				        <xsl:with-param name="error"><xsl:value-of select="'AccountNumberIBANIncorrectFormat'" /></xsl:with-param>
					</xsl:call-template>
				</xsl:if>				
			</xsl:when>
			<xsl:when test="@AccNumberType='OECD603'"> <!-- ISIN -->
				<xsl:if test="not(contains($tweeletterCodes,substring(.,1,2)))"> <!-- geen mogelijk land -->
					<xsl:call-template name="create-error">
				        <xsl:with-param name="error"><xsl:value-of select="'AccountNumberISINIncorrectFormat'" /></xsl:with-param>
					</xsl:call-template>
				</xsl:if>
			</xsl:when>
		</xsl:choose>
	</xsl:template>
	
	<xsl:template name="create-error">
		<xsl:param name="error"/>
		<cas:dataset id="Account-report-validation">
			<cas:label>Account-report-validation</cas:label>
			<cas:property>
				<cas:key><xsl:value-of select="'Error'" /></cas:key>
		        <cas:value><xsl:value-of select="$error" /></cas:value>
	        </cas:property>
		</cas:dataset>
	</xsl:template>
	
</xsl:stylesheet>