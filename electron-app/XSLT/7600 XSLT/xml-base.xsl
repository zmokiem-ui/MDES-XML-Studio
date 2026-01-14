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
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	
	<xsl:param name="xml-root-prefix" select="'ROOT_'" />
	<xsl:param name="default-prefix" select="'bi'" />
	<xsl:param name="attributeset-prefix-attribute" select="'XML_AttributeSetPrefix'" />
	<xsl:param name="element-prefix-attribute" select="'XML_ElementPrefix'" />
	<xsl:param name="local-name-attribute" select="'XML_NodeName'" />
	<xsl:param name="node-id-attribute" select="'XML_NodeId'" />
	<xsl:param name="parent-id-attribute" select="'XML_ParentId'" />
	<xsl:param name="metadata-prefix" select="'XML_'" />
	<xsl:param name="hide-prefix" select="'SUPPRESS_'" />
	<xsl:param name="attribute-prefix" select="'ATTRIBUTE_'" /><!-- For rendering an attribute as an xml-attribute on the attribute-set's xml node. To be used on the attribute's label -->
	<xsl:param name="attribute-for-prefix" select="'ATTRIBUTEFOR_'" />
		<!-- For rendering an attribute as an xml-attribute on the xml node of another attribute within the attribute set. 
		Usage: Use on the attribute's label.
			The label shoulde start with the attribute-for-prefix followed by the id of the attribute whose node it should be rendered on and then the end-marker, for example ATTRIBUTEFOR_SomeOtherAttribute_END_Some attribute -->
	<xsl:param name="end-marker" select="'_END_'" />
	<xsl:param name="child-nodes-prefix" select="'CHILDREN_'" /> 
		<!-- Marks a placeholder-attribute that will be replaced by child-nodes based on the name of their attribute sets
		Usage: Use on the attribute's label. The attribute's id and value are not considered. The attribute must not be a choice attribute.
			The label should start with the child-nodes-prefix followed by the name of the attribute set (i.e. the node type) that should be inserted at this point. -->
	<xsl:param name="text-node-prefix" select="'TEXT_'" /> <!-- For rendering an attribute's value as text content instead of a node on its own. -->
	<xsl:param name="always-show-empty" select="false()" />
	<xsl:param name="show-empty-prefix" select="'SHOW_IF_EMPTY_'" /> <!-- For showing an attribute even when it is empty. Use on the attribute's label. Has no effect if setting always-show-empty is on -->
	<xsl:param name="hide-empty-prefix" select="'HIDE_IF_EMPTY_'" /> <!-- For hiding an attribute when it is empty. Use on the attribute's label. Has no effect if setting always-show-empty is off -->
	<xsl:param name="element-name-from-label-prefix" select="'XMLNAME_'" /> 
		<!-- For defining the attribute's xml local name via a part of the attribute's label instead of the attribute's id:
		Usage: Use in the attribute's label. The label should at least contain element-name-from-label-prefix followed by the desired local name, followed by the end-marker.
			Can be helpfull if one attribute set contains multiple attributes with the same name, for example ATTRIBUTEFOR_FirstName_END_XMLNAME_xmlNameType_END_ (do not leave out the underscore at the end)
		-->
	<xsl:param name="split-csv-prefix" select="'SPLITCSV_'" />
		<!-- If present on an attribute's label, an element will be created for each value in the csv-string in the attribute's value. Works only for standard attributes that are created als XML-nodes. -->
	<xsl:param name="csv-separator" select="','" />
	
	<!-- Start here: document-data is the root node in the input XML.
		Selects the attribute set that represents the root node for the output XML -->
	<xsl:template match="/bi:document-data">
		<xsl:apply-templates select="bi:page-set/bi:attribute-set-document-part/attributes:attributeset[contains(attributes:label,$xml-root-prefix)]" />
	</xsl:template>
	
	<!-- Default template for creating a node. -->
	<xsl:template match="attributes:attributeset">
		<xsl:variable name="attributeset-prefix">
			<xsl:apply-templates select="." mode="attributeset-prefix" />
		</xsl:variable>
		<xsl:variable name="element-prefix">
			<xsl:apply-templates select="." mode="element-prefix" />
		</xsl:variable>
		<xsl:variable name="local-name">
			<xsl:apply-templates select="." mode="attribute-value">
				<xsl:with-param name="identifier" select="$local-name-attribute" />
			</xsl:apply-templates>
		</xsl:variable>
		<xsl:variable name="qname">
			<xsl:call-template name="make-qname">
				<xsl:with-param name="prefix" select="$attributeset-prefix" />
				<xsl:with-param name="local-name" select="$local-name" />
			</xsl:call-template>
		</xsl:variable>
		<xsl:variable name="namespace-uri">
			<xsl:call-template name="resolve-namespace-uri">
				<xsl:with-param name="namespace-prefix" select="$attributeset-prefix" />
			</xsl:call-template>
		</xsl:variable>
		<xsl:element name="{$qname}" namespace="{$namespace-uri}">
			<xsl:apply-templates select="attributes:attributes">
				<xsl:with-param name="prefix" select="$element-prefix" />
			</xsl:apply-templates>
		</xsl:element>
	</xsl:template>
	
	<!-- Match attributes:attributes - default template to render attributes in an attribute set -->
	<xsl:template match="attributes:attributes">
		<xsl:param name="prefix" />
		
		<xsl:apply-templates select="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message,$attribute-prefix)]  | attributes:readonly-choice-attribute[contains(attributes:label,$attribute-prefix)]" mode="make-attribute" />
		<xsl:apply-templates select="attributes:readonly-attribute  | attributes:readonly-choice-attribute">
			<xsl:with-param name="prefix" select="$prefix" />
		</xsl:apply-templates>
	</xsl:template>
	
	<!-- Standard template to render an attribute: an element with the attribute's id as local name and the attribute's value as value -->
	<xsl:template match="attributes:readonly-attribute">
		<xsl:param name="prefix" />
		
		<xsl:variable name="attribute-value">
			<xsl:apply-templates select="." mode="attribute-value" />
		</xsl:variable>
		
		<xsl:variable name="node-identifier">
			<xsl:apply-templates select="." mode="xml-identifier" />
		</xsl:variable>
		
		<xsl:if test="string-length($attribute-value)>0 or ($always-show-empty and not(contains(attributes:label//bi:resolved-message,$hide-empty-prefix))) or (contains(attributes:label//bi:resolved-message,$show-empty-prefix))">
			<xsl:variable name="qname">
				<xsl:call-template name="make-qname">
					<xsl:with-param name="prefix" select="$prefix" />
					<xsl:with-param name="local-name" select="$node-identifier" />
				</xsl:call-template>
			</xsl:variable>
			
			<xsl:apply-templates select="." mode="create-node-from-attribute">
				<xsl:with-param name="qname" select="$qname" />
				<xsl:with-param name="namespace-prefix" select="$prefix" />
				<xsl:with-param name="value-string" select="$attribute-value" />
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<!-- Standard template to render an attribute: an element with the attribute's id as local name and the attribute's value as value -->
	<xsl:template match="attributes:readonly-choice-attribute">
		<xsl:param name="prefix" />
		
		<xsl:variable name="attribute-value">
			<xsl:apply-templates select="." mode="attribute-value" />
		</xsl:variable>
		
		<xsl:variable name="node-identifier">
			<xsl:apply-templates select="." mode="xml-identifier" />
		</xsl:variable>
		
		<xsl:if test="string-length($attribute-value)>0 or ($always-show-empty and not(contains(attributes:label,$hide-empty-prefix))) or (contains(attributes:label,$show-empty-prefix))">
			<xsl:variable name="qname">
				<xsl:call-template name="make-qname">
					<xsl:with-param name="prefix" select="$prefix" />
					<xsl:with-param name="local-name" select="$node-identifier" />
				</xsl:call-template>
			</xsl:variable>
			
			<xsl:apply-templates select="." mode="create-node-from-attribute">
				<xsl:with-param name="qname" select="$qname" />
				<xsl:with-param name="namespace-prefix" select="$prefix" />
				<xsl:with-param name="value-string" select="$attribute-value" />
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	
	<xsl:template match="attributes:readonly-attribute[not(contains(attributes:label,$split-csv-prefix))] | attributes:readonly-choice-attribute[not(contains(attributes:label,$split-csv-prefix))]" mode="create-node-from-attribute" >
		<xsl:param name="qname" />
		<xsl:param name="namespace-prefix" />
		<xsl:param name="value-string" />
		
		<xsl:variable name="namespace-uri">
			<xsl:call-template name="resolve-namespace-uri">
				<xsl:with-param name="namespace-prefix" select="$namespace-prefix" />
			</xsl:call-template>
		</xsl:variable>
		<xsl:element name="{$qname}" namespace="{$namespace-uri}">
			<!-- first, render the node's attributes if any -->
			<xsl:apply-templates select="ancestor::attributes:attributes" mode="child-attributes">
				<xsl:with-param name="parent-id" select="attributes:id" />
			</xsl:apply-templates>
			<!-- then, add the value -->
			
			<xsl:call-template name="string-replace-all-illegal-tokens">
	             <xsl:with-param name="text" select="$value-string" />
	             
		    </xsl:call-template>
			
		</xsl:element>
	</xsl:template>
	
	<xsl:template match="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message,$split-csv-prefix)] | attributes:readonly-choice-attribute[contains(attributes:label,$split-csv-prefix)]" mode="create-node-from-attribute" >
		<xsl:param name="qname" />
		<xsl:param name="namespace-prefix" />
		<xsl:param name="value-string" />
		
		<xsl:variable name="current-value">
			<xsl:choose>
				<xsl:when test="contains($value-string,$csv-separator)">
					<xsl:value-of select="substring-before($value-string,$csv-separator)" />
				</xsl:when>
				<xsl:otherwise>
					<xsl:value-of select="$value-string" />
				</xsl:otherwise>
			</xsl:choose>
		</xsl:variable>
		<xsl:variable name="remaining-value"> <!--select="substring-after($value-string,$csv-separator)"-->
			<xsl:if test="contains($value-string,$csv-separator)">
				<xsl:value-of select="substring-after($value-string,$csv-separator)" />
			</xsl:if>
		</xsl:variable>
		
		<xsl:variable name="namespace-uri">
			<xsl:call-template name="resolve-namespace-uri">
				<xsl:with-param name="namespace-prefix" select="$namespace-prefix" />
			</xsl:call-template>
		</xsl:variable>
		<xsl:element name="{$qname}" namespace="{$namespace-uri}">
			<!-- first, render the node's attributes if any -->
			<xsl:apply-templates select="ancestor::attributes:attributes" mode="child-attributes">
				<xsl:with-param name="parent-id" select="attributes:id" />
			</xsl:apply-templates>
			<!-- then, add the value -->
			<xsl:value-of select="$current-value" />
		</xsl:element>
		
		<xsl:if test="string-length($remaining-value) > 0">
			<xsl:apply-templates select="." mode="create-node-from-attribute">
				<xsl:with-param name="qname" select="$qname" />
				<xsl:with-param name="namespace-prefix" select="$namespace-prefix" />
				<xsl:with-param name="value-string" select="$remaining-value" />
			</xsl:apply-templates>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message, $text-node-prefix)] | attributes:readonly-choice-attribute[contains(attributes:label, $text-node-prefix)]">
		<xsl:apply-templates select="." mode="attribute-value" />
	</xsl:template>
	
	<xsl:template match="attributes:readonly-attribute[starts-with(attributes:label//bi:resolved-message, $child-nodes-prefix)]">
		<xsl:variable name="child-attribute-set-label" select="substring-after(attributes:label//bi:resolved-message,$child-nodes-prefix)" />
		<xsl:apply-templates select="ancestor::attributes:attributeset" mode="child-nodes">
			<xsl:with-param name="attribute-set-label" select="$child-attribute-set-label" />
		</xsl:apply-templates>
	</xsl:template>
	
	<!--  Hide attributes with hide-prefix or metadata-prefix -->
	<xsl:template match="attributes:readonly-attribute[contains(attributes:id,$hide-prefix) or contains(attributes:label//bi:resolved-message,$hide-prefix) or contains(attributes:id,$metadata-prefix) or contains(attributes:label//bi:resolved-message,$metadata-prefix)] 
							| attributes:readonly-choice-attribute[contains(attributes:id,$hide-prefix) or contains(attributes:label,$hide-prefix) or contains(attributes:id,$metadata-prefix) or contains(attributes:label,$metadata-prefix)]">
		<!-- Don't render -->
	</xsl:template>	
	
	<!-- Skip attributes with attribute-for prefix during the normal rendering process -->
	<xsl:template match="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message,$attribute-for-prefix)] | attributes:readonly-choice-attribute[contains(attributes:label,$attribute-for-prefix)]">
		<!-- Don't render -->
	</xsl:template>
	
	<!-- Skip attributes with attribute prefix during the normal rendering process -->
	<xsl:template match="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message,$attribute-prefix)] | attributes:readonly-choice-attribute[contains(attributes:label,$attribute-prefix)]">
		<!-- Don't render -->
	</xsl:template>
	
	<xsl:key match="/bi:document-data/bi:page-set/bi:attribute-set-document-part/attributes:attributeset" name="children" use="attributes:attributes/attributes:readonly-attribute[attributes:id='XML_ParentId']/attributes:value"/>
	
	<!-- 
	### Mode child-nodes ###
		finds the child-nodes of an attribute set and renders them.
	-->
	<xsl:template match="attributes:attributeset" mode="child-nodes">
		<xsl:param name="attribute-set-label" />
		<xsl:variable name="node-id">
			<xsl:apply-templates select="." mode="attribute-value">
				<xsl:with-param name="identifier" select="$node-id-attribute" />
			</xsl:apply-templates>
		</xsl:variable>
		<xsl:choose>
			<xsl:when test="$attribute-set-label">
				<xsl:apply-templates select="key('children', $node-id)[attributes:label=$attribute-set-label]" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:apply-templates select="key('children', $node-id)" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<!--
	### Mode child-attributes ###
		finds the attributes to be rendered on a bi-attribute's node and renders them.
	-->
	<xsl:template match="attributes:attributes" mode="child-attributes" >
		<xsl:param name="parent-id" />
		<xsl:variable name="search-prefix" select="concat($attribute-for-prefix,$parent-id,$end-marker)" />
		<xsl:apply-templates select="attributes:readonly-attribute[contains(attributes:label//bi:resolved-message,$search-prefix)] | attributes:readonly-choice-attribute[contains(attributes:label//bi:resolved-message,$search-prefix)]" mode="make-attribute" />
	</xsl:template>
	
	<!--
	#### Mode make-attribute
		renders an attribute as an xml-attribute
	-->
	<xsl:template match="attributes:readonly-attribute" mode="make-attribute" >
		<xsl:variable name="attribute-value">
			<xsl:apply-templates select="." mode="attribute-value" />
		</xsl:variable>
		
		<xsl:variable name="attribute-identifier">
			<xsl:apply-templates select="." mode="xml-identifier" />
		</xsl:variable>
		
		<xsl:if test="string-length($attribute-value)>0 or ($always-show-empty and not(contains(attributes:label//bi:resolved-message,$hide-empty-prefix))) or (contains(attributes:label//bi:resolved-message,$show-empty-prefix))">
			<xsl:attribute name="{$attribute-identifier}">
				<xsl:value-of select="$attribute-value" />
			</xsl:attribute>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="attributes:readonly-choice-attribute" mode="make-attribute" >
		<xsl:variable name="attribute-value">
			<xsl:apply-templates select="." mode="attribute-value" />
		</xsl:variable>
		
		<xsl:variable name="attribute-identifier">
			<xsl:apply-templates select="." mode="xml-identifier" />
		</xsl:variable>
		
		<xsl:if test="string-length($attribute-value)>0 or ($always-show-empty and not(contains(attributes:label,$hide-empty-prefix))) or (contains(attributes:label,$show-empty-prefix))">
			<xsl:attribute name="{$attribute-identifier}">
				<xsl:value-of select="$attribute-value" />
			</xsl:attribute>
		</xsl:if>
	</xsl:template>
	
	
	<!-- #### HELPER TEMPLATES #### -->
	
	<!-- mode attributeset-prefix: Gets the prefix used for the node of an attribute set -->
	<xsl:template match="attributes:attributeset" mode="attributeset-prefix">
		<xsl:variable name="local-prefix">
			<xsl:apply-templates select="." mode="attribute-value">
				<xsl:with-param name="identifier" select="$attributeset-prefix-attribute" />
			</xsl:apply-templates>
		</xsl:variable>
		<xsl:choose>
			<xsl:when test="$local-prefix">
				<xsl:value-of select="$local-prefix" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="$default-prefix" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<!-- mode element-prefix: Gets the prefix used for the nodes of the elements of an attribute set -->
	<xsl:template match="attributes:attributeset" mode="element-prefix">
		<xsl:variable name="local-prefix">
			<xsl:apply-templates select="." mode="attribute-value">
				<xsl:with-param name="identifier" select="$element-prefix-attribute" />
			</xsl:apply-templates>
		</xsl:variable>
		<xsl:choose>
			<xsl:when test="$local-prefix">
				<xsl:value-of select="$local-prefix" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="$default-prefix" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	
	<!-- mode attribute-value: Gets the value of an attribute within the context of an attribute-set based on the attribute's identifier -->
	<xsl:template match="attributes:attributeset" mode="attribute-value">
		<xsl:param name="identifier" />
		<xsl:apply-templates select="attributes:attributes" mode="attribute-value">
			<xsl:with-param name="identifier" select="$identifier" />
		</xsl:apply-templates>
	</xsl:template>
	
	<xsl:template match="attributes:attributes" mode="attribute-value">
		<xsl:param name="identifier" />
		<xsl:apply-templates select="attributes:readonly-attribute[attributes:id=$identifier] | attributes:readonly-choice-attribute[attributes:id=$identifier]" mode="attribute-value" />
	</xsl:template>
	
	<xsl:template match="attributes:readonly-attribute | attributes:readonly-choice-attribute" mode="attribute-value">
		<xsl:value-of select="attributes:value" />
	</xsl:template>
	
	<!-- mode xml-identifier: Gets the node/attribute name to be used in the xml file for a be-informed attribute -->
	<xsl:template match="attributes:readonly-attribute" mode="xml-identifier">
		<xsl:choose>
			<xsl:when test="contains(attributes:label//bi:resolved-message,$element-name-from-label-prefix)">
				<xsl:value-of select="substring-before(substring-after(attributes:label//bi:resolved-message,$element-name-from-label-prefix),$end-marker)" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="attributes:id" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	<xsl:template match="attributes:readonly-choice-attribute" mode="xml-identifier">
		<xsl:choose>
			<xsl:when test="contains(attributes:label,$element-name-from-label-prefix)">
				<xsl:value-of select="substring-before(substring-after(attributes:label,$element-name-from-label-prefix),$end-marker)" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="attributes:id" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<!-- ##### NAMED TEMPLATES - Helper functions that cannot be overridden #### -->
	
	<!-- make-qname: Genereates a qualified name from prefix and local name -->
	<xsl:template name="make-qname">
		<xsl:param name="prefix" />
		<xsl:param name="local-name" />
		<xsl:choose>
			<xsl:when test="$prefix and $prefix != ''">
				<xsl:value-of select="$prefix" /><xsl:text>:</xsl:text><xsl:value-of select="$local-name" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="$local-name" />
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	
	<xsl:template name="string-replace-all-illegal-tokens">
    	<xsl:param name="text" />
    		
    		<xsl:variable name="text-without-double-dash">
	    		<xsl:call-template name="string-replace-all">
		             <xsl:with-param name="text" select="$text" />
		             <xsl:with-param name="replace" select="'--'" />
		             <xsl:with-param name="by" select="''" />
			    </xsl:call-template>
    		</xsl:variable>
    		
    		<xsl:variable name="text-without-slash-asterix">
	    		<xsl:call-template name="string-replace-all">
		             <xsl:with-param name="text" select="$text-without-double-dash" />
		             <xsl:with-param name="replace" select="'/*'" />
		             <xsl:with-param name="by" select="''" />
			    </xsl:call-template>
    		</xsl:variable>
    		
    		<xsl:call-template name="string-replace-all">
	             <xsl:with-param name="text" select="$text-without-slash-asterix" />
	             <xsl:with-param name="replace" select="'&amp;#'" />
	             <xsl:with-param name="by" select="''" />
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