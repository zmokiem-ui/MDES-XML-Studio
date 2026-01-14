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
	
	<xsl:param name="LabelKey"/>
	<xsl:param name="contentId"/>
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="ValidationData">
		        <cas:label>TranslatedLabels</cas:label>
				<cas:property>
		            <cas:key>
			            <xsl:choose>
			            	<xsl:when test="$contentId ='DutchTranslationDocumentId'">
			            		<xsl:text>DutchLabel</xsl:text>
			            	</xsl:when>
			            	<xsl:when test="$contentId ='EnglishTranslationDocumentId'">
			            		<xsl:text>EnglishLabel</xsl:text>
			            	</xsl:when> 
			            	<xsl:when test="$contentId ='SpanishTranslationDocumentId'">
			            		<xsl:text>EnglishLabel</xsl:text>
			            	</xsl:when> 
			            </xsl:choose>
		          	</cas:key>
		            <cas:value><xsl:value-of select="//*[local-name()=$LabelKey]"/></cas:value>
		        </cas:property>        		
    		</cas:dataset>
    	</cas:eventResponse>
	</xsl:template>
	
	
	
</xsl:stylesheet>