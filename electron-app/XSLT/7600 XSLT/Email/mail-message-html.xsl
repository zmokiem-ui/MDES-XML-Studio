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
				
	<xsl:import href="/Activeringscode versturen/Activeringscode versturen.xsl" />
	<xsl:import href="/Activeringscode versturen secure method/Activeringscode versturen.xsl" />
	<xsl:import href="/Bericht beoordeling aanvraag versturen\INCOMPLETE\BerichtBeoordelingAanvraagVersturenINCOMPLETE.xsl" />
	<xsl:import href="/Bericht beoordeling aanvraag versturen\NOK\BerichtBeoordelingAanvraagVersturenNOK.xsl" />
	<xsl:import href="/Bericht beoordeling aanvraag versturen\OK\BerichtBeoordelingAanvraagVersturenOK.xsl" />
	<xsl:import href="/Bericht beoordeling aanvraag wijzigen verdrag versturen\INCOMPLETE\BerichtBeoordelingAanvraagWijzigenVerdragVersturenINCOMPLETE.xsl" />
	<xsl:import href="/Bericht beoordeling aanvraag wijzigen verdrag versturen\OK\BerichtBeoordelingAanvraagWijzigenVerdragVersturenOK.xsl" />
	<xsl:import href="/Bericht naar competent Authority sturen\Bericht naar competent Authority sturen.xsl" />
	<xsl:import href="/Notificatie over gedownloade bestanden sturen\NotificatieOverGedownloadeBestandenSturen.xsl" />
	<xsl:import href="/Verstuur activatiecode t.b.v. wachtwoord opnieuw instellen\VerstuurActivatiecodeWachtwoordOpnieuwInstellen.xsl" />
	<xsl:import href="/Verstuur e-mail bevestiging profiel gewijzigd\Indien e-mailadres niet gewijzigd\VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdNee.xsl" />
	<xsl:import href="/Verstuur e-mail bevestiging profiel gewijzigd\Indien e-mailadres wel gewijzigd\VerstuurEmailBevestigingProfielGewijzigdEmailGewijzigdJa.xsl" />
	<xsl:import href="/Verstuur e-mail bevestiging profiel gewijzigd\Verstuur e-mail naar vorig e-mailadres\VerstuurEmailNaarVorigEmailadres.xsl" />
	<xsl:import href="/Verstuur e-mail naar CA\VerstuurEmailNaarCA.xsl" />
	<xsl:import href="/Email automatic exchange failed\Email automatic exchange failed.xsl" />
	<xsl:import href="/Verstuur email filelevel errors buitenland bestand\VerstuurEmailFilelevelErrorsBuitenlandBestand.xsl" />
	<xsl:import href="/Verstuur email notificaties voor IGA\Verstuur indienbevestiging File error notification\VerstuurIndienbevestigingFileErrorNotificationVoorIGA.xsl" />
	<xsl:import href="/Verstuur email notificaties voor IGA\Verstuur indienbevestiging Valid file notification\VerstuurIndienbevestigingValidFileNotificationVoorIGA.xsl" />
	<xsl:import href="/Verstuur email ontvangen notificaties\VerstuurEmailOntvangenNotificaties.xsl" />
	<xsl:import href="/Verstuur email status messages voor CA\Verstuur indienbevestiging Accepted\VerstuurEmailStatusMessagesVoorCAAccepted.xsl" />
	<xsl:import href="/Verstuur email status messages voor CA\Verstuur indienbevestiging Rejected\VerstuurEmailStatusMessagesVoorCARejected.xsl" />
	<xsl:import href="/Verstuur email status messages voor IGA\Verstuur indienbevestiging Accepted\VerstuurEmailStatusMessagesVoorIGAAccepted.xsl" />
	<xsl:import href="/Verstuur email status messages voor IGA\Verstuur indienbevestiging Rejected\VerstuurEmailStatusMessagesVoorIGARejected.xsl" />
	<xsl:import href="/Verstuur email vrijgeven notificaties en status messages\VerstuurEmailVrijgevenNotificatiesEnStatusMessages.xsl" />
	<xsl:import href="/Verstuur indienbevestiging e-mail CBC\VerstuurIndienbevestigingEmailCBC.xsl" />
	<xsl:import href="/Verstuur indienbevestiging e-mail FC\VerstuurIndienbevestigingEmailFC.xsl" />
	<xsl:import href="/Verstuur ontvangstbericht e-mail CBC\Verstuur emails met verdrag\VerstuurOntvangstberichtEmailCBCMetVerdrag.xsl" />
	<xsl:import href="/Verstuur ontvangstbericht e-mail CBC\Verstuur emails zonder verdrag\VerstuurOntvangstberichtEmailCBCZonderVerdrag.xsl" />
	<xsl:import href="/Verstuur ontvangstbericht e-mail FC\Verstuur emails met verdrag\VerstuurOntvangstberichtEmailFCMetVerdrag.xsl" />
	<xsl:import href="/Verstuur ontvangstbericht e-mail FC\Verstuur emails zonder verdrag\VerstuurOntvangstberichtEmailFCZonderVerdrag.xsl" />
	<xsl:import href="/Verstuur Ontvangstbewijs GEEN-levering e-mail\VerstuurOntvangstbewijsGEENleveringEmail.xsl" />
	<xsl:import href="/Verstuur verwerkingsbevestiging e-mail FATCA\VerstuurVerwerkingsbevestigingEmailFATCA.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen CBC\Niet vrijgeven\EmailVrijgaveCBCNietVrijgeven.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen CBC\Vrijgegeven voor leveren\Verdrag bevat FATCA\EmailVrijgaveCBCLeverenHeeftFatca.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen CBC\Vrijgegeven voor leveren\Verdrag zonder FATCA\EmailVrijgaveCBCLeverenZonderFatca.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen CBC\Vrijgegeven voor relaties beheer\EmailVrijgaveCBCRelatieBeheer.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen FC\Niet vrijgeven\EmailVrijgaveFCNietVrijgeven.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen FC\Vrijgegeven voor leveren\Verdrag bevat FATCA\EmailVrijgaveFCLeverenHeeftFatca.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen FC\Vrijgegeven voor leveren\Verdrag zonder FATCA\EmailVrijgaveFCLeverenZonderFatca.xsl" />
	<xsl:import href="/E-mail voor gewijzigde vrijgave sturen FC\Vrijgegeven voor relaties beheer\EmailVrijgaveFCRelatieBeheer.xsl" />
	<xsl:import href="/Download automatic exchange failed\Email automatic exchange failed.xsl" />
	<xsl:import href="/Export CBC Ready\ExportCBCReady.xsl" />
	<xsl:import href="/MOU bevestiging CA/MOU bevestiging.xsl" />
		
	<xsl:import href="/Customizable direct message to RE/NotifyRECbCReporting.xsl" />
	<xsl:import href="/Customizable direct message to RE/RequestREInformation.xsl" />
	<xsl:import href="/Customizable direct message to RE/NotifyREMasterFiling.xsl" />
	<xsl:import href="/Customizable direct message to RE/NotifyRECRSReporting.xsl" />
	<xsl:import href="/Customizable direct message to RE/NotifyREDeliveryError.xsl" />
	<xsl:import href="/Customizable direct message to RE/NotifyRELocalFiling.xsl" />
	
	<xsl:import href="/Customizable direct messages to partner jurisdictions/NotifyPJErrorCRS.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/NotifyPJErrorCbC.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/NotifyPJNoDataCRS.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/NotifyPJNoDataCbC.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/RequestPJInformation.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/RequestinProcess.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/RequestReceived.xsl" />
	<xsl:import href="/Customizable direct messages to partner jurisdictions/FinishedResponse.xsl" />

<xsl:import href="/Audit mails/UserStartedAuditCase.xsl" />
	<xsl:import href="/Audit mails/AuditorAssignedToCase.xsl" />
	<xsl:import href="/Audit mails/AuditorCompletedAssignment.xsl" />
	
	<xsl:import href="/NTJ mails/EmailNTJReport.xsl" />
	<xsl:import href="/NTJ mails/EmailNTJDelivery.xsl" />
	
	<xsl:import href="/CbC notifications/NotificationSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/RejectNotificationLetter.xsl" />
	<xsl:import href="/CbC notifications/ApproveNotificationLetter.xsl" />
	<xsl:import href="/CbC notifications/MasterSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/LocalSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/NotificationUploadReminder.xsl" />
	<xsl:import href="/CbC notifications/NotificationUploadInvitation.xsl" />
	<xsl:import href="/CbC notifications/ManualNotificationUploadReminder.xsl" />
	<xsl:import href="/CbC notifications/SendCustomizedMailToUser.xsl" />
	
	
	
	<xsl:import href="global-templates.xsl" />

	<xsl:output method="xml"/>

	
	
	
	<xsl:template match="/">
		<html>
		<xsl:apply-templates select="." mode="head" />
		<body>
		<table class="main-content" cellspacing="0">
	
		<xsl:apply-templates select="." mode="content" />
		<xsl:apply-templates select="." mode="footer" />
		</table>
		</body>
		</html>
	</xsl:template>
	
	
	

	
	<xsl:template match="*" mode="head">
		
		<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" ></meta><title><xsl:value-of select="$messageSubject" /></title><meta name="viewport" content="width=device-width, initial-scale=1.0" ></meta><style type="text/css">body {font-family: Verdana, Arial, sans-serif;font-size: 10pt;padding: 0;margin: 0;}.main-content {width: 100%;border: none;font-size: 10pt;}.main-content td {margin: 0;}.col1 {min-width: 55px;padding: 0;}.col2 {padding: 15px;}.col3 {padding: 0;}.header td {height: 70px;}.spacing td {height: 20px}.spacing .col2 {padding: 0;}.title {color: #<xsl:value-of select="$mailTitleColor"/>;font-size: 14pt;font-weight: 500;padding:15px;}.text-highlight {background-color: #<xsl:value-of select="$mailBodyBG"/>;padding:15px;}.buttonlink {text-align: center;margin: 20px 0;}.buttonlink a {text-decoration: none;background-color: #<xsl:value-of select="$mailButtonColor"/>;color: #FFFFFF;font-weight: 500;font-size: 14px;border-left: 40px solid #<xsl:value-of select="$mailButtonColor"/>;border-right: 40px solid #<xsl:value-of select="$mailButtonColor"/>;border-top: 10px solid #<xsl:value-of select="$mailButtonColor"/>;border-bottom: 10px solid #<xsl:value-of select="$mailButtonColor"/>;}.highlight {font-weight: bold;}.footer {background-color: #<xsl:value-of select="$mailFooterBG"/>;color: #<xsl:value-of select="$mailFooterFontColor"/>!important;}.footertext {color: #<xsl:value-of select="$mailFooterFontColor"/>!important;}.footer .col1,.footer .col3 {padding: 15px;}</style></head>
	</xsl:template>

	<xsl:template match="*" mode="footer">
		<tr valign="top">
			<td width="55" class="col1">&#32;</td>
			<td class="col2">
				<p>
					<br />					
					 <xsl:value-of select="//mailSignature" mode="labels"/> 
					
				</p>
				<p><br /></p>
			</td>
			<td width="55" class="col3">&#32;</td>
		</tr>
		<tr valign="top" class="footer">
			<td width="55" class="col1">&#32;</td>
			<td class="col2">
				<div align="center">
					<p>
						<strong>
							<xsl:apply-templates mode="footerFontColor" />
							<xsl:choose>
								<xsl:when test="contains($mailFooterText1,'Superintendencia Nacional')">
									<xsl:text>Superintendencia Nacional de Administración Tributaria</xsl:text>	
								</xsl:when>
								<xsl:otherwise>
									<xsl:value-of select="$mailFooterText1" />
								
								</xsl:otherwise>
							</xsl:choose> 
							
							</strong><br />
							
						<span>
							<xsl:apply-templates mode="footerFontColor" />
							<xsl:choose>
								<xsl:when test="contains($mailFooterText2,'near Accra Sports Stadium')">
									<xsl:text>Off Starlets' 91 Road, near Accra Sports Stadium</xsl:text>	
								</xsl:when>
								<xsl:otherwise>
									<xsl:value-of select="$mailFooterText2" />
								
								</xsl:otherwise>
							</xsl:choose> </span>
					</p>
					<xsl:if test="$mailFooterText3!=''">
					<p>
						<strong>
							<xsl:apply-templates mode="footerFontColor" />
							<xsl:value-of select="$mailFooterText3" /></strong>
					</p>
					</xsl:if>
					<p>
						<xsl:apply-templates mode="footerFontColor" />
						<xsl:if test="$mailFooterText4!=''"><xsl:value-of select="$mailFooterText4" /><br /></xsl:if>
						
						<a>
						 <xsl:attribute name="href">
	            			<xsl:value-of select="$PortaalBaseURL"/>
	          			  </xsl:attribute>
							<xsl:apply-templates mode="footerFontColor" />
							<xsl:value-of select="$PortaalBaseURL" /></a>
					</p>
				</div>
			</td>
			<td width="55" class="col3">&#32;</td>
		</tr>
	</xsl:template>
	
	<xsl:template match="*" mode="footerFontColor">
		<xsl:attribute name="style" ><xsl:value-of select="concat('color:#',$mailFooterFontColor)" /></xsl:attribute>
	</xsl:template>
	
	<xsl:template match="*" mode="LogoURL">
		<xsl:attribute name="src" ><xsl:value-of select="$LogoURL" /></xsl:attribute>
	</xsl:template>
	
	<xsl:template match="*" mode="mailTextLogo">
		<xsl:attribute name="alt" ><xsl:value-of select="$mailTextLogo" /></xsl:attribute>
	</xsl:template>
	
	
	
	
</xsl:stylesheet>
