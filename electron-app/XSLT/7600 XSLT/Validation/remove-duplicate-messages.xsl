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

	
	<xsl:variable name="errors-shown-once" select="'GerapporteerdLandIsGeenDoorgeefland,'" />
	<xsl:variable name="errors-shown-once-per-node" select="'CorrDocRefIDTwiceInSameMessage,DocRefIDAlreadyUsed,'" />
	
	<xsl:template match="/">
			<cas:eventResponse>
				<cas:caseId/>
				<xsl:apply-templates select="*/*[local-name()='dataset'][position() &lt;= 50]" />
			</cas:eventResponse>
	</xsl:template>
	<xsl:template match="*"/>
	<xsl:template match="*[local-name()='dataset']">
		
		
		
		<xsl:variable name="error" select="*[*[local-name()='key']/text() = 'MeldingId']/*[local-name()='value']"/>
		<xsl:variable name="context-path" select="*[*[local-name()='key']/text() = 'ContextPath']/*[local-name()='value']"/>
		<xsl:variable name="show-once" select="contains($errors-shown-once,$error)"/>
		<xsl:variable name="show-once-per-node" select="contains($errors-shown-once-per-node,$error)"/>		
		<xsl:variable name="already-shown" select="count(./preceding-sibling::*[*[*[local-name()='key'] = 'MeldingId' and *[local-name()='value']=$error]]) &gt; 0"/>
		<xsl:variable name="already-shown-this-node" select="count(./preceding-sibling::*[*[*[local-name()='key'] = 'MeldingId' and *[local-name()='value']=$error]][*[*[local-name()='key'] = 'ContextPath' and *[local-name()='value']=$context-path]]) &gt; 0"/>
		
	
		
		<xsl:if test="not($show-once or $show-once-per-node) 
				or (not($show-once-per-node) and $show-once and not($already-shown)) 
				or ($show-once-per-node and not($already-shown-this-node))">
			
			<xsl:copy-of select="." />
		</xsl:if>
		
	</xsl:template>
	

</xsl:stylesheet>