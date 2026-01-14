<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema"  xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" version="2.0">
    <xsl:output omit-xml-declaration="yes" method="text"/>
    <xsl:template match="/">
        <xsl:for-each select="//attributes:attributeset">
            <xsl:for-each select="attributes:attributes/attributes:readonly-attribute">
 				<xsl:if test="attributes:type = 'string-attribute'">"</xsl:if>	           
                <xsl:apply-templates select="attributes:value"/>
                <xsl:if test="attributes:type = 'string-attribute'">"</xsl:if>	  
                <xsl:if test="not(position() = last())">,</xsl:if>
            </xsl:for-each>
            <xsl:if test="not(position() = last())">
                <xsl:text>
</xsl:text>
            </xsl:if>
        </xsl:for-each>
    </xsl:template>
	
	<xsl:template match="attributes:value">
           <xsl:call-template name="string-replace-all">
             <xsl:with-param name="text" select="text()" />
             <xsl:with-param name="replace" select="'&quot;'" />
             <xsl:with-param name="by" select="'&quot;&quot;'" />
           </xsl:call-template>
	</xsl:template>
	
	<xsl:template name="string-replace-all">
    <xsl:param name="text" />
    <xsl:param name="replace" />
    <xsl:param name="by" />
    <xsl:choose>
      <xsl:when test="contains($text, $replace)">
        <xsl:value-of select="substring-before($text,$replace)" />
        <xsl:value-of select="$by" />
        <xsl:call-template name="string-replace-all">
          <xsl:with-param name="text"
          select="substring-after($text,$replace)" />
          <xsl:with-param name="replace" select="$replace" />
          <xsl:with-param name="by" select="$by" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>