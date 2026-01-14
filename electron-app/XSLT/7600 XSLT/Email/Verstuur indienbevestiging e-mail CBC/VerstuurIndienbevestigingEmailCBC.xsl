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
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurIndienbevestigingEmailCBC']" mode="content">
        <tr class="header">
        <td width="55" class="logo">
          <img>
            <xsl:apply-templates mode="LogoURL" />
            <xsl:apply-templates mode="mailTextLogo" />
</img>
        </td>
         <td class="title">
				
				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Titel"/>  
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
        		<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Aanhef" />
        		<xsl:apply-templates select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />,</p>
        	<p>
        		

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Afgerond"/>  

        	</p>
        	<p>

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Verdrag"/>  

        		<span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='Verdrag']/cas:value" />
        		</span></p><br />
        	<p>

			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Jurisdictie"/>  

			 <span class="highlight">
        			<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandNaam']/cas:value" mode="translate-value"/>	(<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandCode']/cas:value" />)</span><br />
        		

				<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.TypeLevering"/>  

				 <span class="highlight">
				 	
        			<xsl:apply-templates select="//cas:property[cas:key='TypeLevering']/cas:value" mode="translate-value"/>
        			<xsl:text> </xsl:text>
					<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Levering"/>  

					</span></p>
        	<br />
        	<p>
			

			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.OpenPortaalVoorResultaat"/>  

			</p>
        	<p class="buttonlink">
        		<a>
        			<xsl:attribute name="href">
        				<xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value" />
        			</xsl:attribute>
        			&#32;&#32;&#32;&#32;&#32;&#32;
					<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.OpenPortaal"/>  
					&#32;&#32;&#32;&#32;&#32;&#32;&#160;
        		</a></p>
        	<p>
			
			<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.DocumentenOpgeslagen"/>  
			</p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>

	<xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='VerstuurIndienbevestigingEmailCBC']" mode="plaintext">


<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Titel"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Aanhef" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Afgerond"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Verdrag"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='Verdrag']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Jurisdictie"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandNaam']/cas:value"  mode="translate-value"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandCode']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.TypeLevering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='TypeLeveringLabelNL']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.Levering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.OpenPortaalVoorResultaat"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value" /></xsl:attribute>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.OpenPortaal"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//VerstuurIndienbevestigingEmailCBC.DocumentenOpgeslagen"/>

</xsl:template>
    </xsl:stylesheet>
    