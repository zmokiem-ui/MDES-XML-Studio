<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bi="http://www.be-informed.nl/BeInformed"
    xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes"
    xmlns:cbc="urn:oecd:ties:cbc:v1"
    xmlns:stf="urn:oecd:ties:stf:v4"
    xmlns:iso="urn:oecd:ties:isocbctypes:v1"
    exclude-result-prefixes="xs xsi bi attributes"
    version="1.0">
    
    <xsl:variable name="default-namespace" select="'urn:oecd:ties:cbc:v1'"/>
    
    <xsl:include href="cbc-xml-generic.xsl"/>
    
    <xsl:output method="xml" indent="yes" />
    
    <!--
        * MANUAL
        * See included file
        *
        * AVAILABLE HINTS ON READONLY ATTRIBUTES
        * addressfix: Indicate AddressFix children. Only add the element when at least one child has a value.
        *
        * AVAILABLE HINTS ON ATTRIBUTE SETS
        * address: Indicate an address for reporting- of constituent entity 
    -->
    
    <!-- Keys for efficient access -->
    <xsl:key name="body" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Body']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='MessageRecordId']/attributes:value"/>
    <xsl:key name="reporting-entity" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Reporting entity']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value"/>
    <xsl:key name="reporting-entity-in" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Reporting entity IN']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value"/>
    <xsl:key name="reporting-entity-name" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Reporting entity name']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value"/>
    <xsl:key name="reporting-entity-address" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Reporting entity address']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value"/>
    <xsl:key name="report" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Report']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value"/>
    <xsl:key name="constituent-entity" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Constituent entity']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ReportRecordId']/attributes:value"/>
    <xsl:key name="constituent-entity-in" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Constituent entity IN']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value"/>
    <xsl:key name="constituent-entity-name" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Constituent entity name']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value"/>
    <xsl:key name="constituent-entity-address" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Constituent entity address']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value"/>
    <xsl:key name="additional-info" 
        match="/bi:document-data/bi:page-set/bi:attribute-set-document-part[bi:label='Additional info']/attributes:attributeset/attributes:attributes" 
        use="attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value"/>
    
    <!-- Entry point -->
    <xsl:template match="/bi:document-data">
        <!-- xsi:schemaLocation="urn:oecd:ties:cbc:v1 file:/Users/oneton/Documents/BearingPoint/MDES/XSD/CbCXML_v1.0.1.xsd" -->
        <CBC_OECD xmlns="urn:oecd:ties:cbc:v1">
            <xsl:apply-templates select="bi:page-set/bi:attribute-set-document-part[1]/attributes:attributeset/attributes:attributes"/>
             <xsl:apply-templates select="bi:page-set/bi:attribute-set-document-part[2]/attributes:attributeset/attributes:attributes"/>
        </CBC_OECD>
    </xsl:template>
    
    <!-- Message header -->
    <xsl:template match="attributes:attributeset[attributes:label='Message']/attributes:attributes">
        <xsl:apply-templates select="*[1]" mode="xml-attribute"/>
        
        <xsl:element name="MessageSpec" namespace="{$default-namespace}">
            <xsl:apply-templates select="*[1]"/>
        </xsl:element>
        
        <xsl:apply-templates select="attributes:label-attribute"/>
    </xsl:template>
    
    <!-- Message -> Body -->
    <xsl:template match="attributes:attributeset[attributes:label='Body']/attributes:attributes">
        <xsl:apply-templates select="attributes:label-attribute"/>
    </xsl:template>
    
    <!-- Message -> Body -> Reporting entity -->
    <xsl:template match="attributes:attributeset[attributes:label='Reporting entity']/attributes:attributes">
        <xsl:element name="Entity" namespace="{$default-namespace}">
            <xsl:apply-templates select="*[1]"/>
            <xsl:apply-templates select="attributes:label-attribute"/>
        </xsl:element>
        
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='ReportingRole']"/>
        <xsl:apply-templates select="." mode="docspec"/>
    </xsl:template>
    
    <!-- Message -> Body -> Report -->
    <xsl:template match="attributes:attributeset[attributes:label='Report']/attributes:attributes">
        <xsl:apply-templates select="." mode="docspec"/>
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='ReportCountryCode']">
            <xsl:with-param name="single" select="true()"/>
        </xsl:apply-templates>
        
        <xsl:element name="Summary" namespace="{$default-namespace}">
            <xsl:element name="Revenues" namespace="{$default-namespace}">
                <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='UnrelatedRevenuesAmount']"/>
            </xsl:element>
            <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='ProfitOrLossAmount']"/>
        </xsl:element>
        
        <xsl:apply-templates select="attributes:label-attribute[attributes:layout-hint/attributes:hint='ref']"/>
    </xsl:template>
    
    <!-- Message -> Body -> Report -> Constituent entity -->
    <xsl:template match="attributes:attributeset[attributes:label='Constituent entity']/attributes:attributes">
        <xsl:element name="ConstEntity" namespace="{$default-namespace}">
            <xsl:apply-templates select="*[1]"/>
            <xsl:apply-templates select="attributes:label-attribute"/>
        </xsl:element>
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='IncorpCountryCode']"/>
    </xsl:template>
    
    <!-- Message -> Body -> Additional info -->
    <xsl:template match="attributes:attributeset[attributes:label='Additional info']/attributes:attributes">
        <xsl:apply-templates select="." mode="docspec"/>
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='OtherInfo']"/>
    </xsl:template>
    
    <!-- Generic: DocSpec -->
    <xsl:template match="attributes:attributes" mode="docspec">
        <xsl:element name="DocSpec" namespace="{$default-namespace}">
            <!-- First attribute after the DocSpec label -->
            <xsl:apply-templates select="attributes:readonly-attribute[preceding-sibling::*[1][self::attributes:label-attribute[attributes:id='DocSpec']]]"/>
        </xsl:element>
    </xsl:template>
    
    <!-- Generic: Address -->
    <xsl:template match="attributes:attributeset[attributes:layout-hint/attributes:hint='address']/attributes:attributes">
        <xsl:apply-templates select="*[1]" mode="xml-attribute"/>
        
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='CountryCode']">
            <xsl:with-param name="single" select="true()"/>
        </xsl:apply-templates>
        
        <xsl:if test="attributes:readonly-attribute[attributes:layout-hint/attributes:hint='addressfix' and string(attributes:value)]">
            <xsl:element name="AddressFix" namespace="{$default-namespace}">
                <xsl:apply-templates select="attributes:readonly-attribute[attributes:layout-hint/attributes:hint='addressfix']">
                    <xsl:with-param name="single" select="true()"/>
                </xsl:apply-templates>
            </xsl:element>
        </xsl:if>
        
        <xsl:apply-templates select="attributes:readonly-attribute[attributes:id='AddressFree']"/>
    </xsl:template>
    
    <!-- "Switchboard". This template finds attribute sets that reference the current element. -->
    <xsl:template match="attributes:label-attribute[attributes:layout-hint/attributes:hint='ref']">
        <xsl:choose>
            <xsl:when test="attributes:label//bi:resolved-message='CbcBody'">
                <xsl:apply-templates select="key('body', ../attributes:readonly-attribute[attributes:id='MessageRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='ReportingEntity'">
                <xsl:apply-templates select="key('reporting-entity', ../attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='IN'">
                <xsl:apply-templates select="key('reporting-entity-in', ../attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value)"/>
                <xsl:apply-templates select="key('constituent-entity-in', ../attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value)"/>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='Name'">
                <xsl:apply-templates select="key('reporting-entity-name', ../attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value)"/>
                <xsl:apply-templates select="key('constituent-entity-name', ../attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value)"/>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='Address'">
                <xsl:apply-templates select="key('reporting-entity-address', ../attributes:readonly-attribute[attributes:id='ReportingEntityRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
                <xsl:apply-templates select="key('constituent-entity-address', ../attributes:readonly-attribute[attributes:id='ConstituentEntityRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='CbcReports'">
                <xsl:apply-templates select="key('report', ../attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='ConstEntities'">
                <xsl:apply-templates select="key('constituent-entity', ../attributes:readonly-attribute[attributes:id='ReportRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
            <xsl:when test="attributes:label//bi:resolved-message='AdditionalInfo'">
                <xsl:apply-templates select="key('additional-info', ../attributes:readonly-attribute[attributes:id='BodyRecordId']/attributes:value)" mode="element">
                    <xsl:with-param name="name" select="attributes:label//bi:resolved-message"/>
                </xsl:apply-templates>
            </xsl:when>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>