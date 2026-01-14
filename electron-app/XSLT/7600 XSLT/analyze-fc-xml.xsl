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
	<xsl:import href="validate-account-reports.xsl" />
	
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		    <cas:dataset id="UploadData">
		        <cas:label>UploadData</cas:label>
		   		<xsl:apply-templates select="." mode="UploadDocumentType"/>
		   		<xsl:apply-templates select="." mode="version"/>
		   	
    		</cas:dataset>
    		<xsl:apply-templates select="." mode="MessageHeader"/>
		</cas:eventResponse>
	</xsl:template>
	
	<xsl:template match="*[local-name()='FATCA_CRS']" mode="MessageHeader">
		<cas:dataset id="FCMessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageHeader']/*" mode="attribute"/>
   		</cas:dataset>
    	<xsl:apply-templates select="/" mode="validate-account-reports"></xsl:apply-templates>
	</xsl:template>
	
	
	
	
	
	<xsl:template match="*[local-name()='CBC_OECD']" mode="MessageHeader">
		<cas:dataset id="FCMessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageSpec']/*" mode="attribute"/>
   		</cas:dataset>
	</xsl:template>
	
	<xsl:template match="*[local-name()='CRS_OECD']" mode="MessageHeader">
		<cas:dataset id="CRSMessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageSpec']/*" mode="attribute"/>
   		</cas:dataset>
	</xsl:template>
	
	<xsl:template match="*" mode="MessageHeader">
		<cas:dataset id="FCMessageHeader">
			<cas:label>Message header</cas:label>
			<xsl:apply-templates select="*[local-name()='MessageHeader']/*" mode="attribute"/>
   		</cas:dataset>
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
	
	<xsl:template match="*[local-name()='CRS_OECD']" mode="UploadDocumentType">
		<cas:property>
            <cas:key>UploadDocumentType</cas:key>
            <cas:value>CRSDocument</cas:value>
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
	<xsl:template match="*" mode="version">
		<cas:property>
            <cas:key>Version</cas:key>
            <cas:value><xsl:value-of select="@version"/></cas:value>
        </cas:property>
        
		
	</xsl:template>
</xsl:stylesheet>