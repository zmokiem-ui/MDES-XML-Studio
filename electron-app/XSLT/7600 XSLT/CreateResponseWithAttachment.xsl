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
	
	<xsl:param name="Base64Document"/>
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="ChangedTranslationFileSet">
		        <cas:label>ChangedTranslationFileSet</cas:label>
		          <cas:property>
            		<cas:key>ChangedTranslationFile</cas:key>
            		<cas:value>tmp ptl online translation_source_nl.nl.json</cas:value>
        		</cas:property>
			    <attachment:attachments>
			        <attachment:attachment>
			            <attachment:contentId>ChangedTranslationFile</attachment:contentId>
			            <attachment:name>tmp ptl online translation_source_nl.nl.json</attachment:name>
			            <attachment:data><xsl:value-of select="$Base64Document"/></attachment:data>
					</attachment:attachment>
				</attachment:attachments>        
	    	</cas:dataset>
    	</cas:eventResponse>
	</xsl:template>
	
	
	
</xsl:stylesheet>