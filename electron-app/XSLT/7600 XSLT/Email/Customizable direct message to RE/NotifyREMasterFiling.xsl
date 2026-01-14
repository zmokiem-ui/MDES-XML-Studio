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
				exclude-result-prefixes="attachment html xop cas bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	<xsl:output method="xml"/> 
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='NotifyREMasterFiling']" mode="content">
    
       
      
      <tr class="spacing">
        <td width="55" class="col1">&#32;</td>
        <td class="col2">&#32;</td>
        <td width="55" class="col3">&#32;</td>
      </tr>
      <tr>
        <td width="55" class="col1">&#32;</td>
        <td class="text-highlight">
          <p><xsl:apply-templates select="//NotifyREMasterFiling.Aanhef"/></p>
          <p>
            <xsl:apply-templates select="//NotifyREMasterFiling.AanvraagVoorGebruik"/>
          </p>
          <p>
            <xsl:apply-templates select="//NotifyREMasterFiling.Tekst"/>
          </p>
        
        
          <p>
            <span class="highlight">
              <xsl:apply-templates select="//NotifyREMasterFiling.Belangrijk"/>
             </span>
             <xsl:apply-templates select="//NotifyREMasterFiling.Informatie"/>
          </p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='NotifyREMasterFiling']" mode="plaintext">

      <xsl:apply-templates select="//NotifyREMasterFiling.Titel"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.Aanhef"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.AanvraagVoorGebruik"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.Tekst"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginlink']/cas:value"/></xsl:attribute>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.Bevestig"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.LinkWerktNiet"/>
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:value-of  select="//cas:property[cas:key='Activeringscode']/cas:value" />
<xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.Belangrijk"/>
      <xsl:text xml:space="preserve">
</xsl:text>
      <xsl:apply-templates select="//NotifyREMasterFiling.Informatie"/>


    </xsl:template>
    </xsl:stylesheet>
    
    