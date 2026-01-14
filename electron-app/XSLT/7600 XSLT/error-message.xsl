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
	
	<xsl:param name="error"/>
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="ValidationData">
		        <cas:label>ValidationData</cas:label>
				<cas:property>
		            <cas:key>ValidationResult</cas:key>
		            <cas:value>Error</cas:value>
		        </cas:property>
			        <xsl:variable name="error-value">
			        	<xsl:apply-templates select="." mode="value">
			        		<xsl:with-param name="value" select="$error" />
			        	</xsl:apply-templates>
			        </xsl:variable>
	        	<xsl:apply-templates select="." mode="split-value">
	        		
	        		<xsl:with-param name="value" select="$error-value" />
	        	</xsl:apply-templates>
	        	
		            
		        
	        		
    		</cas:dataset>
    	</cas:eventResponse>
	</xsl:template>
	
	<xsl:template match="*" mode="value">
		<xsl:param name="value" />
		<xsl:variable name="total-value">
			<xsl:choose>
				<xsl:when test="contains($value,'SAXParseException:')">
					<xsl:text> The transformation of the xml failed. The error can be found on line: </xsl:text>
					<xsl:value-of select="substring-after($value,'SAXParseException:')"/>
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="$value"/>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
			<xsl:choose>
				<xsl:when test="contains($total-value,'Exchange')">
					<xsl:value-of select="substring-before($total-value,concat('Exchange',substring-after($total-value,'Exchange')))"/>
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="$total-value"/>
				</xsl:otherwise>
			</xsl:choose>
		
	</xsl:template>
	
	
	<xsl:template match="*" mode="split-value">
		<xsl:param name="value" />
		<xsl:param name="count" select="1"/>
		<cas:property>
	        <cas:key>ValidationMessage<xsl:value-of select="$count"/></cas:key>
		    <cas:value>
	        <xsl:choose>
		        <xsl:when test="string-length($value) &gt; 254">
		          
		          	<xsl:value-of select="substring($value,0,254)"/>
		          
		      	</xsl:when>
		      	<xsl:otherwise>
		      		<xsl:value-of select="$value"/>
		      	</xsl:otherwise>
		     </xsl:choose>
	        </cas:value>
		</cas:property>
		<xsl:if test="string-length($value) &gt; 254">
			<xsl:apply-templates select="." mode="split-value">
				<xsl:with-param name="count" select="$count + 1" />
				<xsl:with-param name="value" select="substring($value,254,string-length($value))" />
			</xsl:apply-templates>
		</xsl:if>
		
		
	</xsl:template>
</xsl:stylesheet>