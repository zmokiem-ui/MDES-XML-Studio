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
			    xmlns:exsl="http://exslt.org/common"
				exclude-result-prefixes="attachment html xop cas bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	<xsl:output method="xml"/> 
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa']" mode="content">
        <tr class="header">
        <td width="55" class="logo">
          <img>
            <xsl:apply-templates mode="LogoURL" />
            <xsl:apply-templates mode="mailTextLogo" />
</img>
        </td>
        <td class="title">
          <xsl:choose>
          <xsl:when test="//cas:property[cas:key='FormeleNaam']/cas:value=''">
            <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.Titel"/>
          </xsl:when>
          
          <xsl:otherwise>
           <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.TitelIncFormeleNaam"/>
          </xsl:otherwise>
        </xsl:choose>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
      <tr class="spacing">
        <td width="55" class="col1">&#32;</td>
        <td class="col2">&#32;</td>
        <td width="55" class="col3">&#32;</td>
      </tr>
      <tr>
        <td width="55" class="col1">&#32;</td>
        <td class="text-highlight">
          <p><xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.Aanhef"/> <xsl:apply-templates  select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />,</p>
          <p>
            <xsl:choose>
              <xsl:when test="//cas:property[cas:key='FormeleNaam']/cas:value=''">
                <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.AccountgegevensGewijzigd"/>
              </xsl:when>
              
              <xsl:otherwise>
              <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.AccountgegevensGewijzigdIncFormeleNaam"/>
              </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="//cas:property[cas:key='FormeleNaam']/cas:value" />.
          </p>
          <p>
          <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.NieuweEmailIs"/> <xsl:apply-templates select="//cas:property[cas:key='E_mailAdres']/cas:value" />.</p>
          <p>
            <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.GegevensNietZelfGewijzigd"/>
          </p>
          <p class="buttonlink">
            <a>
            <xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value"/>
            </xsl:attribute>
            &#32;&#32;&#32;&#32;&#32;&#32;
            <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.OpenPortaal"/>
            &#32;&#32;&#32;&#32;&#32;&#32;&#160;</a
            >
          </p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>

    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa']" mode="plaintext">

      <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.Titel"/> 
      <xsl:text xml:space="preserve">
      </xsl:text>
      <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.Aanhef"/> <xsl:apply-templates  select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />
      <xsl:text xml:space="preserve">
      </xsl:text>
      <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.AccountgegevensGewijzigd"/><xsl:apply-templates select="//cas:property[cas:key='FormeleNaam']/cas:value"/>
      <xsl:text xml:space="preserve">
      </xsl:text>
      
<xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.NieuweEmailIs"/> 
      <xsl:apply-templates select="//cas:property[cas:key='E_mailAdres']/cas:value" />
      <xsl:text xml:space="preserve">
      </xsl:text>
      <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.GegevensNietZelfGewijzigd"/>
      <xsl:text xml:space="preserve">
      </xsl:text>
      <xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value"/></xsl:attribute>
      <xsl:text xml:space="preserve">
      </xsl:text>
      <xsl:apply-templates select="//VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.OpenPortaal"/>

</xsl:template>
    
    </xsl:stylesheet>
    