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
    
    <xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='MasterSubmissionConfirmation']" mode="content">
        <tr class="header">
        <td width="55" class="logo">
          <img>
            <xsl:apply-templates mode="LogoURL" />
            <xsl:apply-templates mode="mailTextLogo" />
</img>
        </td>
         <td class="title">
				
				<xsl:apply-templates select="//MasterSubmissionConfirmation.Titel"/>  
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
        		<xsl:apply-templates select="//MasterSubmissionConfirmation.Aanhef" /></p>
        	<p>
        		

				<xsl:apply-templates select="//MasterSubmissionConfirmation.Afgerond"/>  

        	</p>
        	
        		
        	<p>
			

			<xsl:apply-templates select="//MasterSubmissionConfirmation.OpenPortaalVoorResultaat"/>  

			</p>
        	<p class="buttonlink">
        		<a>
        			<xsl:attribute name="href">
        				<xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value" />
        			</xsl:attribute>
        			&#32;&#32;&#32;&#32;&#32;&#32;
					<xsl:apply-templates select="//MasterSubmissionConfirmation.OpenPortaal"/>  
					&#32;&#32;&#32;&#32;&#32;&#32;&#160;
        		</a></p>
        	<p>
			
			<xsl:apply-templates select="//MasterSubmissionConfirmation.DocumentenOpgeslagen"/>  
			</p>
        </td>
        <td width="55" class="col3">&#32;</td>
      </tr>
    </xsl:template>

	<xsl:template match="*[//cas:property[cas:key='MailIdentifier']/cas:value='MasterSubmissionConfirmation']" mode="plaintext">


<xsl:apply-templates select="//MasterSubmissionConfirmation.Titel"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.Aanhef" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='NaamContactpersoon']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.Afgerond"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.Verdrag"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='Verdrag']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.Jurisdictie"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandNaam']/cas:value"  mode="translate-value"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='DoorgeeflandCode']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.TypeLevering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//cas:property[cas:key='TypeLeveringLabelNL']/cas:value" />
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.Levering"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.OpenPortaalVoorResultaat"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:attribute name="href"><xsl:apply-templates select="//cas:property[cas:key='PortaalLoginLink']/cas:value" /></xsl:attribute>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.OpenPortaal"/>
<xsl:text xml:space="preserve">
      </xsl:text>
<xsl:apply-templates select="//MasterSubmissionConfirmation.DocumentenOpgeslagen"/>

</xsl:template>
    </xsl:stylesheet>
    