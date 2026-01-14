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
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	
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
	
	<xsl:import href="/Audit mails/UserStartedAuditCase.xsl" />
	<xsl:import href="/Audit mails/AuditorAssignedToCase.xsl" />
	<xsl:import href="/Audit mails/AuditorCompletedAssignment.xsl" />
	
	<xsl:import href="/NTJ mails/EmailNTJReport.xsl" />
	<xsl:import href="/NTJ mails/EmailNTJDelivery.xsl" />

	<xsl:import href="global-templates.xsl" />
	
	
	<xsl:import href="/CbC notifications/NotificationSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/RejectNotificationLetter.xsl" />
	<xsl:import href="/CbC notifications/ApproveNotificationLetter.xsl" />
	<xsl:import href="/CbC notifications/NotificationUploadReminder.xsl" />
	<xsl:import href="/CbC notifications/MasterSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/LocalSubmissionConfirmation.xsl" />
	<xsl:import href="/CbC notifications/NotificationUploadInvitation.xsl" />
	<xsl:import href="/CbC notifications/ManualNotificationUploadReminder.xsl" />
	<xsl:import href="/CbC notifications/SendCustomizedMailToUser.xsl" />

	<xsl:output method="text"/>

	<xsl:param name="labels-escaped"/>
	<xsl:param name="ApplicationNameExtended"/>
	<xsl:param name="ApplicationName"/>
	<xsl:param name="PortaalBaseURL"/>
	<xsl:param name="LogoURL"/>
	<xsl:param name="mailTextLogo"/>
	<xsl:param name="mailTitleColor"/>
	<xsl:param name="mailBodyBG"/>
	<xsl:param name="mailPlainEmail"/>
	<xsl:param name="mailButtonColor"/>
	<xsl:param name="mailFooterBG"/>
	<xsl:param name="mailFooterFontColor"/>
	<xsl:param name="mailFooterText1"/>
	<xsl:param name="mailFooterText2"/>
	<xsl:param name="mailFooterText3"/>
	<xsl:param name="mailFooterText4"/>
	<xsl:param name="mailSignatureNL"/>
	<xsl:param name="mailSignatureEN"/>
	<xsl:param name="mailSignatureES"/>
	<xsl:param name="mailReferentieOnlinePortaal2"/>
	<xsl:param name="messageSubject"/>
	<xsl:param name="originaldata"/>
	<xsl:template match="/">
		<xsl:apply-templates select="//cas:property[cas:key='MailIdentifier']" mode="plaintext"/>
	</xsl:template>
	
</xsl:stylesheet>