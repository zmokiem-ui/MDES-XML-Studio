<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bi="http://www.be-informed.nl/BeInformed"
    xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes"
   	xmlns:cbc="urn:oecd:ties:cbc:v2"
    xmlns:stf="urn:oecd:ties:cbcstf:v5"
    xmlns:iso="urn:oecd:ties:isocbctypes:v1"
    xmlns:met="urn:oecd:ctssenderfilemetadata"
    exclude-result-prefixes="xs xsi bi attributes"
    version="1.0">
    
    <!--
        * MANUAL
        * Attribute label = XML name
        * Attribute value = XML value
        * Attributes without a value will not be added to the output
        * Without parameter single, all attributes are processed until a label-attribute is found
        *
        * AVAILABLE HINTS ON READONLY ATTRIBUTES
        * attribute: the Be Informed attribute is added as attribute to the preceding element
        * hide: Do not add this attribute to XML output
        * namespace: Apply a specific namespace prefix (should be present in xsl:stylesheet namespaces)
        * split: Split a comma-separated string into multiple elements
        *
        * AVAILABLE HINTS ON LABEL ATTRIBUTES
        * ref: Follow the reference to another attribute set and process it (should be defined in this XSLT)
    -->
    
    <!-- Variables should not be used in template match attributes, so not all hints are variables -->
    <xsl:variable name="attribute-hint" select="'attribute'"/>
    <xsl:variable name="namespace-hint" select="'namespace'"/>
    <xsl:variable name="split-hint" select="'split'"/>
    
    <!-- Default behaviour for attribute set: process all attributes -->
    <xsl:template match="attributes:attributes">
        <xsl:apply-templates select="*[1]" mode="xml-attribute"/>
        <xsl:apply-templates select="*[1]"/>
    </xsl:template>
    
    <!-- For label attributes that reference another attribute set and require a container element (label of the label element is used as name) -->
    <xsl:template match="attributes:attributes" mode="element">
        <xsl:param name="name"/>
        
        <xsl:element name="{concat($default-prefix,$name)}">
            <xsl:apply-templates select="."/>
        </xsl:element>
    </xsl:template>
    
    <!-- Don't process regular label attributes. They just "stop" the flow for adding the next readonly-attribute -->
    <xsl:template match="attributes:label-attribute"/>
    
    
    <xsl:template match="attributes:readonly-attribute">
        <xsl:param name="single" select="false()"/>
        
        <!-- Only output when not empty -->
        <xsl:if test="string(attributes:value)">
            <xsl:choose>
                <!-- Skip attributes in this mode -->
                <xsl:when test="attributes:layout-hint/attributes:hint=$attribute-hint"/>
                
                <!-- Specific namespace -->
                <xsl:when test="attributes:layout-hint/attributes:hint[starts-with(., $namespace-hint)]">
                    <xsl:variable name="namespace" select="substring-after(attributes:layout-hint/attributes:hint[starts-with(., $namespace-hint)], concat($namespace-hint, '='))"/>
                    
                    <xsl:element name="{$namespace}:{attributes:label//bi:resolved-message}">
                        <xsl:apply-templates select="following-sibling::*[1][self::attributes:readonly-attribute]" mode="xml-attribute"/>
                        <xsl:value-of select="attributes:value"/>
                    </xsl:element>
                </xsl:when>

                <!-- Split comma-separated value into multiple elements -->
                <xsl:when test="attributes:layout-hint/attributes:hint=$split-hint">
                    <xsl:call-template name="split">
                        <xsl:with-param name="element-name" select="attributes:label//bi:resolved-message"/>
                        <xsl:with-param name="value" select="attributes:value"/>
                    </xsl:call-template>
                </xsl:when>

                <xsl:otherwise>
                    <xsl:element name="{$default-prefix}{attributes:label//bi:resolved-message}">
                        <xsl:apply-templates select="following-sibling::*[1][self::attributes:readonly-attribute]" mode="xml-attribute"/>
                        <xsl:value-of select="attributes:value"/>
                    </xsl:element>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:if>
        
        <xsl:if test="$single=false()">
            <xsl:apply-templates select="following-sibling::*[1][self::attributes:readonly-attribute]"/>
        </xsl:if>
    </xsl:template>
    
    <xsl:template match="attributes:readonly-attribute" mode="xml-attribute">
        <!-- Continue with next when current is empty or an attribute -->
        <xsl:choose>
            <xsl:when test="string(attributes:value) and not(attributes:layout-hint/attributes:hint='hide')">
                <xsl:if test="attributes:layout-hint/attributes:hint=$attribute-hint">
                    <xsl:attribute name="{attributes:label//bi:resolved-message}">
                        <xsl:value-of select="attributes:value"/>
                    </xsl:attribute>
                    <xsl:apply-templates select="following-sibling::*[1][self::attributes:readonly-attribute]" mode="xml-attribute"/>
                </xsl:if>
            </xsl:when>
            <xsl:otherwise>
                <xsl:apply-templates select="following-sibling::*[1][self::attributes:readonly-attribute]" mode="xml-attribute"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Split comma-separated value into elements with separate values -->
    <xsl:template name="split">
        <xsl:param name="element-name"/>
        <xsl:param name="value"/>
        
        <xsl:choose>
            <xsl:when test="contains($value, ',')">
                <xsl:element name="{concat($default-prefix,$element-name)}">
                    <xsl:value-of select="substring-before($value, ',')"/>
                </xsl:element>
                <xsl:call-template name="split">
                    <xsl:with-param name="element-name" select="$element-name"/>
                    <xsl:with-param name="value" select="substring-after($value, ',')"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:element name="{concat($default-prefix,$element-name)}">
                    <xsl:value-of select="$value"/>
                </xsl:element>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <!-- Do not render case ID or record ID -->
    <xsl:template match="attributes:readonly-attribute[attributes:layout-hint/attributes:hint='hide']">
        <xsl:apply-templates select="following-sibling::*[1]"/>
    </xsl:template>
</xsl:stylesheet>