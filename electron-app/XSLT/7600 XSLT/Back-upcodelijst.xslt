<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:usermanagement="http://www.be-informed.nl/BeInformed/UserManagement" xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" xmlns:case="http://www.be-informed.nl/BeInformed/Case" xmlns:serviceapplication="http://www.be-informed.nl/BeInformed/ServiceApplication" xmlns:report="http://www.be-informed.nl/BeInformed/Report" xmlns:ws-knowledge="http://schemas.beinformed.nl/beinformed/v3/services/knowledgeservice" xmlns:bi="http://www.be-informed.nl/BeInformed" xmlns:dataeditor="http://www.be-informed.nl/BeInformed/DataEditor" xmlns:form="http://www.be-informed.nl/BeInformed/Form" xmlns:html="http://www.w3.org/1999/xhtml" xmlns:organisationmanagement="http://www.be-informed.nl/BeInformed/OrganisationManagement" xmlns:search="http://www.be-informed.nl/BeInformed/Search" xmlns:knowledge="http://www.be-informed.nl/BeInformed/Knowledge" xmlns:fn="http://www.w3.org/2005/xpath-functions">
 

	<xsl:import href="../7100 Document stylesheets/document-base.xsl" />
	<!--<xsl:import href="./document-base.xsl" />-->
	<xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:param name="doc-orientation" select="'portrait'"/>
	<xsl:param name="page-size" select="'A4'"/>
	<xsl:param name="margin-left">1.8</xsl:param>
	<xsl:param name="margin-right">1.5</xsl:param>
	<xsl:param name="margin-top">0.5</xsl:param>
	<xsl:param name="header-height">1</xsl:param>
	<xsl:param name="margin-bottom">0.5</xsl:param>
	<xsl:param name="footer-height">1.5</xsl:param>

	<xsl:param name="first-margin-top">0</xsl:param>
	<xsl:param name="first-margin-bottom">0.5</xsl:param>
	<xsl:param name="header-on-first-page" select="false()" />
	<!-- Attention!! Max one of the following two parameters can be true. -->
	<xsl:param name="footer-on-first-page" select="true()" />
	<xsl:param name="first-page-footer-on-first-page" select="false()" />
	<xsl:param name="show-default-pagenumber" select="false()" />
	<xsl:param name="translatefile-path"><xsl:text>../../../Bibliotheek/9000 Algemeen/Vertalingen/ogp/</xsl:text></xsl:param>

	<!--<xsl:param name="debug" select="true()" />-->

	<xsl:variable name="resourcePath-to-image">
		<xsl:value-of select="'Bibliotheek\9000 Algemeen\afbeeldingen\'"/>
	</xsl:variable>
	
	<!-- Add the styling to this part -->

	<xsl:attribute-set name="document-start">
		<xsl:attribute name="padding">0</xsl:attribute>
		<xsl:attribute name="margin">0</xsl:attribute>
		<xsl:attribute name="text-allign">center</xsl:attribute>
	</xsl:attribute-set>

	<!-- Custom styling for fo:block -->
	<xsl:attribute-set name="block-style">
		<xsl:attribute name="margin-left">
			<xsl:choose>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Inleiding')">50%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[starts-with(knowledge:label,'PaginaFooter')]">80%</xsl:when>
				<xsl:otherwise>25%</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="margin-right">1mm</xsl:attribute>
		<xsl:attribute name="margin-top">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">-1mm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Inleiding_Documenttitel')]">1.1cm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Inleiding_Documentonderwerp')]">6mm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Inleiding_AlgemeneGegevensTitel')]">6mm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'HOOFDSECTIE_')]">
					<xsl:choose>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'HOOFDSECTIE_')">0mm</xsl:when>
						<xsl:otherwise>9mm</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE1_')]">
					<xsl:choose>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'HOOFDSECTIE_')">3mm</xsl:when>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'SUBSECTIE1_')">5mm</xsl:when>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'SUBSECTIE2_')">3mm</xsl:when>
						<xsl:otherwise>6mm</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE2_')]">
					<xsl:choose>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'HOOFDSECTIE_')">3mm</xsl:when>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'SUBSECTIE1_')">3mm</xsl:when>
						<xsl:when test="contains((preceding::knowledge:section)[last()]/knowledge:label,'SUBSECTIE2_')">3mm</xsl:when>
						<xsl:otherwise>6mm</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>1mm</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="margin-bottom">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'HOOFDSECTIE_')]">2mm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE1_')]">2mm</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE2_')]">2mm</xsl:when>
				<xsl:otherwise>1mm</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="padding-right">0</xsl:attribute>
		<xsl:attribute name="padding-left">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">
					<xsl:choose>
						<xsl:when test="position()=1">0</xsl:when>
						<xsl:otherwise>2mm</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>0</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="padding-top">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">
					<xsl:choose>
						<xsl:when test="position()=1">0</xsl:when>
						<xsl:otherwise>11mm</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>0</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="text-indent">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'HOOFDSECTIE_')]">-5mm</xsl:when>
				<xsl:otherwise>0</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="font-family">
			<xsl:choose>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Documenttitel')">RijksoverheidSansHeadingTT</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Documentonderwerp')">RijksoverheidSansHeadingTT</xsl:when>
				<xsl:otherwise>RijksoverheidSansText</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="font-size">
			<xsl:choose>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Documenttitel')">14pt</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Documentonderwerp')">14pt</xsl:when>
				<xsl:otherwise>10pt</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="color">#000000</xsl:attribute>
		<xsl:attribute name="font-style">normal</xsl:attribute>
		<xsl:attribute name="font-weight">
			<xsl:choose>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'Documenttitel')">bold</xsl:when>
				<xsl:otherwise>normal</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="text-align">left</xsl:attribute>
		<xsl:attribute name="width">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[starts-with(knowledge:label,'PaginaFooter')]">70%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[starts-with(knowledge:label,'EerstePaginaFooter')]">70%</xsl:when>
				<xsl:otherwise>auto</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="keep-with-next.within-page">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'HOOFDSECTIE_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE1_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE2_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[starts-with(knowledge:label,'Inleiding_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Toelichting_aangifte_ABB_Titel')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Toelichting_aangifte_ABB_Inhoud')]">auto</xsl:when>
				<xsl:otherwise>auto</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="keep-together.within-page">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'HOOFDSECTIE_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE1_')]">always</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'SUBSECTIE2_')]">always</xsl:when>
				<xsl:otherwise>10</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
	</xsl:attribute-set>

	<xsl:attribute-set name="block-style-footer-inline" use-attribute-sets="block-style">
		<xsl:attribute name="text-align">left</xsl:attribute>
		<xsl:attribute name="margin-left">-5mm</xsl:attribute>
		<xsl:attribute name="width">70%</xsl:attribute>
	</xsl:attribute-set>
	
	<xsl:attribute-set name="block-style-footer-inline-img" use-attribute-sets="block-style">
		<xsl:attribute name="text-align">left</xsl:attribute>
		<xsl:attribute name="font-size">7pt</xsl:attribute>
		<xsl:attribute name="margin-left">-5mm</xsl:attribute>
		<xsl:attribute name="margin-top">-10mm</xsl:attribute>
		<xsl:attribute name="width">70%</xsl:attribute>
	</xsl:attribute-set>

	<xsl:attribute-set name="empty-block-style">
		<xsl:attribute name="margin-top">0</xsl:attribute>
		<xsl:attribute name="padding">0</xsl:attribute>
	</xsl:attribute-set>

	<!-- Custom styling for cells in a table -->
	<xsl:attribute-set name="cell-style">
		<xsl:attribute name="wrap-option">wrap</xsl:attribute>
		<xsl:attribute name="border-bottom-style">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaHeader')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaFooter')]">none</xsl:when>
				<xsl:otherwise>solid</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="border-top-style">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaHeader')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaFooter')]">none</xsl:when>
				<xsl:otherwise>solid</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="border-left-style">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaHeader')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaFooter')]">none</xsl:when>
				<xsl:otherwise>solid</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="border-right-style">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'Logo_BES')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaHeader')]">none</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'PaginaFooter')]">none</xsl:when>
				<xsl:otherwise>solid</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="border-width">0</xsl:attribute>
		<xsl:attribute name="border-bottom-width">0</xsl:attribute>
		<xsl:attribute name="background-repeat">no-repeat</xsl:attribute>
		<xsl:attribute name="background-position-horizontal">right</xsl:attribute>
		<xsl:attribute name="background-position-vertical">center</xsl:attribute>
		<xsl:attribute name="background-color">
			<xsl:choose>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'_TBLEmph1')">#F2F2F2</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'_TBLEmph2')">#E1F2FA</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'_TBLTotaal')">#D3D3D3</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'TotaalRegel_')">#F2F2F2</xsl:when>
				<xsl:when test="contains(ancestor::knowledge:section/knowledge:label/text(),'TotaalKolom_')">#F2F2F2</xsl:when>
				<xsl:otherwise>inherit</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
		<xsl:attribute name="number-rows-spanned">1</xsl:attribute>
	</xsl:attribute-set>

	<!-- Custom styling for rows of a table -->
	<xsl:attribute-set name="row-style">
		<xsl:attribute name="background-color">#FFFFFF</xsl:attribute>
		<xsl:attribute name="keep-together.within-page">auto</xsl:attribute>
	</xsl:attribute-set>

	<!-- Custom styling for a table -->
	<xsl:attribute-set name="table-style">
		<xsl:attribute name="table-layout">fixed</xsl:attribute>
		<xsl:attribute name="width">100%</xsl:attribute>
		<xsl:attribute name="keep-together.within-page">1000</xsl:attribute>
		<xsl:attribute name="keep-with-next.within-page">
			<xsl:choose>
				<xsl:when test="(local-name()='table') and (parent::knowledge:body) and not(following-sibling::*)">
					<xsl:choose>
						<xsl:when test="((following::knowledge:body)[1]/child::*[1])[local-name()='table']">always</xsl:when>
						<xsl:otherwise>auto</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>auto</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
	</xsl:attribute-set>

	<!-- Custom widths for a table columns -->
	<xsl:attribute-set name="column-widths">
		<xsl:attribute name="column-width">
			<xsl:choose>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1-1-1-1')] and position()=1">32%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1-1-1-1')] and position()>1">17%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1-1')] and position()=1">66%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1-1')] and position()>1">17%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1')] and position()=1">66%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_Tabel-2-1')] and position()=2">34%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_TBL10_30')] and position()=1">10%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_TBL10_30')] and position()>1">30%</xsl:when>
				<xsl:when test="ancestor::knowledge:section[contains(knowledge:label,'_CLMNWIDTH_')]"><xsl:value-of select="substring-after(ancestor::knowledge:section/knowledge:label,'_CLMNWIDTH_')" />%</xsl:when>
				<xsl:otherwise>proportional-column-width(1)</xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
	</xsl:attribute-set>

	<xsl:attribute-set name="pagenumber-footer">
		<xsl:attribute name="font-family">RijksoverheidSansText</xsl:attribute>
		<xsl:attribute name="font-size">8pt</xsl:attribute>
		<xsl:attribute name="font-style">normal</xsl:attribute>
		<xsl:attribute name="color">#000000</xsl:attribute>
		<xsl:attribute name="text-align">right</xsl:attribute>
		<xsl:attribute name="width">20%</xsl:attribute>
	</xsl:attribute-set>

	<xsl:attribute-set name="pagenumber-footer-container">
		<xsl:attribute name="absolute-position">absolute</xsl:attribute>
		<xsl:attribute name="top"><xsl:value-of select="0.5 * $footer-height" />cm</xsl:attribute>
	</xsl:attribute-set>

	
</xsl:stylesheet>
