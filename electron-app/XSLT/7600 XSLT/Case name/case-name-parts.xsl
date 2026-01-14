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
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	<!-- <xsl:param name="messageHTML"/>
	<xsl:param name="messagePlainText"/>
	<xsl:param name="messageSubject"/> -->
	
	<xsl:template match="/">
		<xsl:variable name="casenamepart" select="//request/*[local-name()=//cas:property[cas:key='CaseNamePart']/cas:value]" />
		
		
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="CaseNamePart">
		        <cas:label>CaseNamePart</cas:label>

		   		<cas:property>
		            <cas:key>CaseNamePart</cas:key>
		            <cas:value>
						<xsl:choose>
							<xsl:when test="$casenamepart!=''">
								<xsl:value-of select="$casenamepart"/>
							</xsl:when>
							<xsl:otherwise>
								<xsl:value-of select="//cas:property[cas:key='CaseNamePart']/cas:value"/>
							</xsl:otherwise>
						</xsl:choose>
					</cas:value>

		        </cas:property>   
		   	   
    		</cas:dataset>
		</cas:eventResponse>
	</xsl:template>
	

</xsl:stylesheet>