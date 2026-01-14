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
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurOntvangstberichtEmailFCMetVerdrag']" mode="content">
        <tr class="header">
        <td width="55" class="logo">
          <img>
            <xsl:apply-templates mode="LogoURL" />
            <xsl:apply-templates mode="mailTextLogo" />
</img>
        </td>
         <td class="title">
         <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Titel"/>  
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
          <p><xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Aanhef"/>   <xsl:apply-templates  select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />,</p>
          <p>
          <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngediendBijAuthoriteit"/>  
            
          </p>
          <p>
          <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Verdrag"/>  
            <span class="highlight"><xsl:apply-templates  select="//cas:property[cas:key='Verdragen']/cas:value" mode="translate-value" /></span>
          </p>
          <p>
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.DatumIngediend"/>  

            
            <span class="highlight"
              ><xsl:apply-templates  select="//cas:property[cas:key='DatumIngediendFormaat']/cas:value" /></span
            >
          </p>
          <p>
          <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.TypeLevering"/>  
            
            <span class="highlight"
              ><xsl:apply-templates  select="//cas:property[cas:key='TypeLevering']/cas:value" mode="translate-value"/></span
            ><br />
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Belastingjaar"/>  
            
            <span class="highlight"><xsl:apply-templates  select="//cas:property[cas:key='Belastingjaar']/cas:value" /></span>
          </p>
          <p>
          <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngediendBijAuthoriteitDoorgegeven"/>  
            
          </p>
          <p>
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngeslotenPDF"/>  
            
          </p>
          <p class="buttonlink">
            <a>
            <xsl:attribute name="href">
            <xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value"/>
            </xsl:attribute>
            &#32;&#32;&#32;&#32;&#32;&#32;
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.OpenPortaal"/>  
              &#32;&#32;&#32;&#32;&#32;&#32;&#160;
              </a>
          </p>
          <p>
            <span class="highlight">
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Belangrijk"/> 
            </span>
            <xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Informatie"/> 
          </p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurOntvangstberichtEmailFCMetVerdrag']" mode="plaintext">

<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Titel"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Aanhef"/>   <xsl:apply-templates  select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngediendBijAuthoriteit"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Verdrag"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates  select="//cas:property[cas:key='Verdragen']/cas:value" mode="translate-value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.DatumIngediend"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates  select="//cas:property[cas:key='DatumIngediendFormaat']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.TypeLevering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates  select="//cas:property[cas:key='TypeLevering']/cas:value" mode="translate-value"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Belastingjaar"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates  select="//cas:property[cas:key='Belastingjaar']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngediendBijAuthoriteitDoorgegeven"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.IngeslotenPDF"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value"/></xsl:attribute>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.OpenPortaal"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Belangrijk"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurOntvangstberichtEmailFCMetVerdrag.Informatie"/>

</xsl:template>
    </xsl:stylesheet>
    