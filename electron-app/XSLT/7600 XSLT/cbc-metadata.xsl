<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bi="http://www.be-informed.nl/BeInformed"
    xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes"
    xmlns:met="urn:oecd:ctssenderfilemetadata"
    xmlns:iso="urn:oecd:ties:isoctstypes:v1"
    exclude-result-prefixes="xs xsi bi attributes"
    version="1.0">
    
    <xsl:variable name="default-namespace" select="'urn:oecd:ctssenderfilemetadata'"/>
    <xsl:variable name="default-prefix" select="'met:'"/>
    
    <xsl:include href="cbc-xml-generic.xsl"/>
    
    <xsl:output method="xml" indent="yes" />
     
    <!--
        * MANUAL
        * See included file
    -->
    
    <!-- Entry point -->
    <xsl:template match="/bi:document-data">
        <met:CTSSenderFileMetadata>
            <xsl:apply-templates select="bi:page-set/bi:attribute-set-document-part[1]/attributes:attributeset/attributes:attributes"/>
        </met:CTSSenderFileMetadata>
    </xsl:template>
</xsl:stylesheet>