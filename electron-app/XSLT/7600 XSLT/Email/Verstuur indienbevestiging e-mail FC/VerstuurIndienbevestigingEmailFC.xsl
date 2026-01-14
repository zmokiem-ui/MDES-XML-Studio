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
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurIndienbevestigingEmailFC']" mode="content">
        <tr class="header">
        <td width="55" class="logo">
          <img>
            <xsl:apply-templates mode="LogoURL" />
            <xsl:apply-templates mode="mailTextLogo" />
</img>
        </td>
         <td class="title">
				
				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Titel"/>  
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
        	<p>
        		<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Aanhef" />
        		<xsl:apply-templates select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />,</p>
        	<p>
        		

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Afgerond"/>  

        	</p>
        	<p>

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Verdrag"/>  

        		<span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='Verdrag']/cas:value" mode="translate-value" />
        		</span></p><br />
        	<p>

			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Jurisdictie"/>  

			 <span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandNaam']/cas:value" mode="translate-value" /> (
        			<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandCode']/cas:value" />)</span><br />
        		

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.TypeLevering"/>  

				 <span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='TypeLevering']/cas:value" mode="translate-value"/>
        			<xsl:text> </xsl:text>
					<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Levering"/>  

					</span></p>
        	<br />
        	<p>

			<p>
			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Belastingjaar"/>  
				<span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='Belastingjaar']/cas:value" mode="translate-value" />
        		</span>
			</p>
			

			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.OpenPortaalVoorResultaat"/>  

			</p>
        	<p class="buttonlink">
        		<a>
        			<xsl:attribute name="href">
        				<xsl:value-of select="$PortaalBaseURL" />
        			</xsl:attribute>
        			&#32;&#32;&#32;&#32;&#32;&#32;
					<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.OpenPortaal"/>  
					&#32;&#32;&#32;&#32;&#32;&#32;&#160;
        		</a></p>
        	<p>
			
			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.DocumentenOpgeslagen"/>  
			</p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>
	<xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurIndienbevestigingEmailFC']" mode="plaintext">


<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Titel"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Aanhef" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Afgerond"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Verdrag"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='Verdrag']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Jurisdictie"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandNaam']/cas:value"  mode="translate-value"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandCode']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.TypeLevering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='TypeLevering']/cas:value"  mode="translate-value"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.Levering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.OpenPortaalVoorResultaat"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value" /></xsl:attribute>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.OpenPortaal"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailFC.DocumentenOpgeslagen"/>

</xsl:template>
    </xsl:stylesheet>
    