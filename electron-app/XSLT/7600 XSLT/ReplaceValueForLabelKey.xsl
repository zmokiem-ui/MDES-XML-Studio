

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
	 <xsl:output omit-xml-declaration="yes"/>
	<xsl:param name="LabelKey"/>
	<xsl:param name="LabelValue"/>
	<xsl:template match="/">
		
			<xsl:text>{</xsl:text>
			<xsl:apply-templates select="*/*[local-name()!=$LabelKey]"/>
			<xsl:apply-templates select="*/*[local-name()=$LabelKey]"/>
			<xsl:text>}</xsl:text>
			
		
	</xsl:template>
	
	<xsl:template match="*[local-name()=$LabelKey]">
			<xsl:variable name="quote" select="'&quot;'"/>
		<xsl:text><xsl:value-of select="concat($quote,$LabelKey,$quote,':',$quote,$LabelValue,$quote,'&#13;')"/></xsl:text>	
		
	</xsl:template>
	
	<xsl:template match="*">
	<xsl:variable name="quote" select="'&quot;'"/>
		<xsl:text><xsl:value-of select="concat($quote,local-name(),$quote,':',$quote,.,$quote,',','&#13;')"/></xsl:text>
	</xsl:template>
	
	
</xsl:stylesheet>