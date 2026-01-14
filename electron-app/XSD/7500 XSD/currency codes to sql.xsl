<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xsd="http://www.w3.org/2001/XMLSchema">

	<xsl:output omit-xml-declaration="yes" method="text"/>

	<xsl:param name="vanafjaar">2014</xsl:param>
	<xsl:param name="tmjaar"></xsl:param>
	
	<xsl:template match="xsd:schema">
		<xsl:text>INSERT INTO DS_Valuta(VALUTACODE, OMSCHRIJVING, GELDIGVANAFBELASTINGJAAR, GELDIGTOTENMETBELASTINGJAAR, deleted) VALUES </xsl:text>
		<xsl:apply-templates select="xsd:simpleType[@name='currCode_Type']/xsd:restriction/xsd:enumeration" />
	</xsl:template>
	
	<xsl:template match="xsd:enumeration">
		<xsl:if test="position() &gt; 1"><xsl:text>,
		</xsl:text></xsl:if>
		<xsl:text>('</xsl:text>
		<xsl:value-of select="@value" />
		<xsl:text>','</xsl:text>
		<xsl:call-template name="replace">
			<xsl:with-param name="text"><xsl:value-of select="xsd:annotation/xsd:documentation" /></xsl:with-param>
			<xsl:with-param name="part"><xsl:text>'</xsl:text></xsl:with-param>
			<xsl:with-param name="replacement"><xsl:text>''</xsl:text></xsl:with-param>
		</xsl:call-template>
		<xsl:text>',</xsl:text>
		<xsl:value-of select="$vanafjaar" />
		<xsl:text>,</xsl:text>
		<xsl:choose><xsl:when test="$tmjaar"><xsl:value-of select="$tmjaar" /></xsl:when><xsl:otherwise><xsl:text>NULL</xsl:text></xsl:otherwise></xsl:choose>
		<xsl:text>,0)</xsl:text>
	</xsl:template>
	
	<xsl:template name="replace">
		<xsl:param name="text" />
		<xsl:param name="part" />
		<xsl:param name="replacement" />
		
		<xsl:choose>
			<xsl:when test="contains($text,$part)">
				<xsl:value-of select="substring-before($text,$part)" />
				<xsl:value-of select="$replacement" />
				<xsl:call-template name="replace">
					<xsl:with-param name="text" select="substring-after($text,$part)" />
					<xsl:with-param name="part" select="$part" />
					<xsl:with-param name="replacement" select="$replacement" />
				</xsl:call-template>
			</xsl:when>
			<xsl:otherwise><xsl:value-of select="$text" /></xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
</xsl:stylesheet>
