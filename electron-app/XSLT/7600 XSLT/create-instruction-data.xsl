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
				xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"
			    xmlns:attachment="http://schemas.beinformed.nl/beinformed/v3/services/caseservice/attachments"
			    xmlns:xop="http://www.w3.org/2004/08/xop/include" 
				exclude-result-prefixes="bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	
	<xsl:output method="xml" indent="yes" encoding="UTF-8"/>	
	<xsl:template match="/">
		<cas:eventResponse>
		    <cas:caseId/>
		
		
		    <xsl:apply-templates />	   	
		</cas:eventResponse>
	</xsl:template>
	
	<xsl:template match="*[count(*) &gt; 0]|*[local-name()='TIN']|*[local-name()='IN']">
	    <cas:dataset id="InstructionSet">
	        <cas:label>InstructionSet</cas:label>
	        <xsl:apply-templates select="." mode="instruction"/>
	        <xsl:apply-templates select="." mode="attr">
   				<xsl:with-param name="prefix">
   					<xsl:apply-templates select="." mode="record-name"/>
   				</xsl:with-param>
   			</xsl:apply-templates>
	        <xsl:apply-templates select="*[count(*) = 0 and local-name()!='TIN' and local-name()!='IN']">
   				<xsl:with-param name="prefix">
   					<xsl:apply-templates select="." mode="record-name"/>
   				</xsl:with-param>
   			</xsl:apply-templates>
   		</cas:dataset>
			<xsl:apply-templates select="*[local-name()='TIN']|*[local-name()='IN']" mode="extract">
				<xsl:with-param name="prefix">
   					<xsl:apply-templates select="." mode="record-name"/>
   				</xsl:with-param>
			</xsl:apply-templates>
   		<xsl:apply-templates select="*[count(*) &gt; 0]"/>
	</xsl:template>

	<xsl:template match="*[count(*) = 0 and local-name()!='TIN']|*[count(*) = 0 and local-name()!='IN']" >
		<xsl:param name="prefix" select="local-name()"/>
		<cas:property>
            <cas:key><xsl:value-of select="concat($prefix,'_',local-name())"/></cas:key>
            <cas:value><xsl:call-template name="replace-illegal-strings">
            <xsl:with-param name="text" select="."/>
            
        </xsl:call-template></cas:value>
        </cas:property>       
         <xsl:apply-templates select="." mode="attr" >
   			<xsl:with-param name="prefix" select="$prefix"/>
   		</xsl:apply-templates>
	</xsl:template>
	
	
	
	<xsl:template match="*[local-name()='TIN']|*[local-name()='IN']" mode="extract">
		<xsl:param name="prefix" select="local-name()"/>
		 <cas:dataset id="InstructionSet">
	        <cas:label>InstructionSet</cas:label>
	         <xsl:apply-templates select="." mode="instruction-tin"/>
        <cas:property>
            <cas:key><xsl:value-of select="concat($prefix,'_TIN')"/></cas:key>
            <cas:value><xsl:value-of select="."/></cas:value>
        </cas:property>        
         <xsl:apply-templates select="." mode="attr" >
   			<xsl:with-param name="prefix" select="$prefix"/>
   		</xsl:apply-templates>
   		</cas:dataset>
	</xsl:template>
	
	
	<xsl:template match="*[local-name()='ResCountryCode']" priority="1000">
		<xsl:param name="prefix" select="local-name()"/>
		<xsl:if test="count(preceding-sibling::*[local-name()='ResCountryCode'])=0">
		<cas:property>
            <cas:key><xsl:value-of select="concat($prefix,'_',local-name())"/></cas:key>
            <cas:value><xsl:apply-templates select="../*[local-name()='ResCountryCode']" mode="concat"/></cas:value>
        </cas:property>        
        
   		</xsl:if>
	
	</xsl:template>
	<xsl:template match="*" mode="concat">
		<xsl:if test="position()!=1">
			<xsl:text >,</xsl:text>
		</xsl:if>
		<xsl:value-of select="." />
	
	</xsl:template>
	
	
	<xsl:template match="*" mode="attr" >
		<xsl:param name="prefix" select="local-name()"/>
		<xsl:for-each select="@*">
        	<cas:property>
            	<cas:key><xsl:value-of select="concat($prefix,'_',name(.))"/></cas:key>
            	<cas:value><xsl:value-of select="."/></cas:value>
        	</cas:property>	
	  </xsl:for-each>    
	</xsl:template>
	
	
	

	
	<xsl:template match="*" mode="instruction" >
		<cas:property>
            <cas:key>CreateRecord</cas:key>
            <cas:value>
            	<xsl:apply-templates select="." mode="record-name"/>
            </cas:value>
        </cas:property>
        <xsl:apply-templates select="." mode="context"/>        
	</xsl:template>
	
	<xsl:template match="*" mode="record-name">
		<xsl:value-of select="local-name()"/>
	</xsl:template>
	
	<xsl:template match="*[local-name()='Entity']" mode="record-name">
		<xsl:text>Organisation</xsl:text>
	</xsl:template>
	
	<xsl:template match="*[local-name()='IP']" mode="record-name">
		<xsl:text>KeyData</xsl:text>
	</xsl:template>
	
		<xsl:template match="*[local-name()='Expenses']" mode="record-name">
		<xsl:text>KeyData_Expenses</xsl:text>
	</xsl:template>
	
	<xsl:template match="*[local-name()='KeyData']" mode="record-name">
		<xsl:text>SKIP</xsl:text>
	</xsl:template>
	
	<xsl:template match="*" mode="instruction-tin" >
		<cas:property>
            <cas:key>CreateRecord</cas:key>
            <cas:value>TIN</cas:value>
        </cas:property>
        <xsl:apply-templates select="." mode="context"/>                
	</xsl:template>
	
	<xsl:template match="*" mode="context">
		<cas:property>
            <cas:key>path</cas:key>
            <cas:value>
            	 <xsl:call-template name="genPath"/>
           </cas:value>
        </cas:property>
		<cas:property>
            <cas:key>Context</cas:key>
            <cas:value>
            	<xsl:if test="count(ancestor::*[local-name()='ReportingFI']) &gt; 0">
            		<xsl:text>ReportingFI</xsl:text>
            	</xsl:if>
            	<xsl:if test="count(ancestor::*[local-name()='Sponsor']) &gt; 0">
            		<xsl:text>Sponsor</xsl:text>
            	</xsl:if>
            	<xsl:if test="count(ancestor::*[local-name()='Intermediary']) &gt; 0">
            		<xsl:text>Intermediary</xsl:text>
            	</xsl:if>
            	<xsl:if test="count(ancestor::*[local-name()='AccountReport']) &gt; 0">
            		<xsl:text>AccountReport</xsl:text>
            	</xsl:if>
            	<xsl:if test="count(ancestor::*[local-name()='ControllingPerson']) &gt; 0">
            		<xsl:text>/ControllingPerson</xsl:text>
            	</xsl:if>      
            	<xsl:if test="count(ancestor::*[local-name()='SubstantialOwner']) &gt; 0">
            		<xsl:text>/SubstantialOwner</xsl:text>
            	</xsl:if>          	
            	<xsl:if test="count(ancestor::*[local-name()='Individual']) &gt; 0">
            		<xsl:text>/Individual</xsl:text>
            	</xsl:if> 
            	<xsl:if test="count(ancestor::*[local-name()='Organisation']) &gt; 0">
            		<xsl:text>/Organisation</xsl:text>
            	</xsl:if>     
            	<xsl:if test="count(ancestor::*[local-name()='NilReport']) &gt; 0">
            		<xsl:text>NilReport</xsl:text>
            	</xsl:if>            	           	
            </cas:value>
        </cas:property>
        </xsl:template>
	<xsl:template name="genPath">
	    <xsl:param name="prevPath"/>
	    <xsl:variable name="currPath" select="concat('/',local-name(),'[',
	      count(preceding-sibling::*[name() = name(current())])+1,']',$prevPath)"/>
	    <xsl:for-each select="parent::*">
	      <xsl:call-template name="genPath">
	        <xsl:with-param name="prevPath" select="$currPath"/>
	      </xsl:call-template>
	    </xsl:for-each>
	    <xsl:if test="not(parent::*)">
	      <xsl:value-of select="$currPath"/>      
	    </xsl:if>
  </xsl:template>
	<xsl:template name="replace-illegal-strings">
    <xsl:param name="text"/>
    <xsl:variable name="text-without-single-quote">
    	 <xsl:call-template name="replace-string">
            <xsl:with-param name="text" select="$text"/>
            <xsl:with-param name="replace" select='"&apos;"' />
            <xsl:with-param name="with" select="''"/>
        </xsl:call-template>
        </xsl:variable>
    <xsl:variable name="text-without-double-quote">    
         <xsl:call-template name="replace-string">
            <xsl:with-param name="text" select="$text-without-single-quote"/>
            <xsl:with-param name="replace" select="'&quot;'" />
            <xsl:with-param name="with" select="''"/>
        </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="text-without-greater-than">    
    
    	<xsl:call-template name="replace-string">
            <xsl:with-param name="text" select="$text-without-double-quote"/>
            <xsl:with-param name="replace" select="'&gt;'" />
            <xsl:with-param name="with" select=""/>
        </xsl:call-template>
    </xsl:variable>
    <xsl:call-template name="replace-string">
            <xsl:with-param name="text" select="$text-without-greater-than"/>
            <xsl:with-param name="replace" select="'&amp;'" />
            <xsl:with-param name="with" select=""/>
        </xsl:call-template>
    </xsl:template>
	<xsl:template name="replace-string">
    <xsl:param name="text"/>
    <xsl:param name="replace"/>
    <xsl:param name="with"/>
    <xsl:choose>
      <xsl:when test="contains($text,$replace)">
        <xsl:value-of select="substring-before($text,$replace)"/>
        <xsl:value-of select="$with"/>
        <xsl:call-template name="replace-string">
          <xsl:with-param name="text"
                          select="substring-after($text,$replace)"/>
          <xsl:with-param name="replace" select="$replace"/>
          <xsl:with-param name="with" select="$with"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
	
</xsl:stylesheet>