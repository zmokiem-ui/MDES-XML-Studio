<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema"  xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" version="2.0">
    <xsl:output omit-xml-declaration="yes" method="text"/>
    <xsl:template match="/">
        <xsl:text disable-output-escaping="yes">BESTAND_ID,AANMAAKDAT,NAAR_LAND,VAN_LAND,DOCREFID,CORRDOCREFID,TIN,NAAM,VOORNAAM,GEBDAT,GEBPLAATS,GEBLAND,STRAAT,PLAATS,POSTC,GESL,ADRES_LANDCODE,ADRESFREE,UITBET_NAAM,UITBET_STRAAT,UITBET_PLAATS,UITBET_POSTC,UITBET_NR,UITK-LANDCODE,UITBET_ADRESFREE,VALUTA_JAAR,RENTECODE,VALUTASRT,BEDRAG,BANKREKENINGNUMMER
</xsl:text>
        <xsl:for-each select="//attributes:attributeset">
            <xsl:for-each select="attributes:attributes/attributes:readonly-attribute">
                <xsl:apply-templates select="attributes:value"/>
                <xsl:if test="not(position() = last())">,</xsl:if>
            </xsl:for-each>
            <xsl:if test="not(position() = last())">
                <xsl:text>
</xsl:text>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
	
	<xsl:template match="attributes:value">
		<xsl:choose>
			<xsl:when test="contains(text(),',')"><xsl:text>"</xsl:text><xsl:value-of select="text()" /><xsl:text>"</xsl:text></xsl:when>
			<xsl:otherwise><xsl:value-of select="text()" /></xsl:otherwise>
		</xsl:choose>
	</xsl:template>
</xsl:stylesheet>