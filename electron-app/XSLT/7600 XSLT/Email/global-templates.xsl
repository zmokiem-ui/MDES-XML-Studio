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
    			extension-element-prefixes="exsl"
				exclude-result-prefixes="attachment html xop cas bi knowledge cmf case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">
	
	<xsl:output method="xml"/>
	
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
	<xsl:param name="DoorgeeflandCode"/>
	<xsl:param name="originelecaseid"/>
	
	
	<xsl:template name="unescape">
        <xsl:param name="escaped"/>
        <xsl:choose>
            <xsl:when test="contains($escaped,'&lt;')">
                <xsl:variable name="beforeelem" select="substring-before($escaped,'&lt;')"/>
                <xsl:variable name="elemname1" select="substring-before(substring-after($escaped,'&lt;'),' ')"/>
                <xsl:variable name="elemname2" select="substring-before(substring-after($escaped,'&lt;'),'&gt;')"/>
                <xsl:variable name="elemname3" select="substring-before(substring-after($escaped,'&lt;'),'/&gt;')"/>
                <xsl:variable name="hasattributes" select="string-length($elemname1) &gt; 0 and ((string-length($elemname2)=0 or string-length($elemname1) &lt; string-length($elemname2)) and (string-length($elemname3)=0 or string-length($elemname1) &lt; string-length($elemname3)))"/>
                <xsl:variable name="elemclosed" select="string-length($elemname3) &gt; 0 and (string-length($elemname2)=0 or string-length($elemname3) &lt; string-length($elemname2))"/>
                <xsl:variable name="elemname">
                    <xsl:choose>
                        <xsl:when test="$hasattributes">
                            <xsl:value-of select="$elemname1"/>
                        </xsl:when>
                        <xsl:when test="not($elemclosed)">
                            <xsl:value-of select="$elemname2"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="$elemname3"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="elemclosetag" select="concat('&lt;/',$elemname,'&gt;')"/>
                <xsl:variable name="innercontent">
                    <xsl:if test="not($elemclosed)">
                        <xsl:call-template name="skipper-before">
                            <xsl:with-param name="source" select="substring-after(substring-after($escaped,'&lt;'),'&gt;')"/>
                            <xsl:with-param name="delimiter" select="$elemclosetag"/>
                        </xsl:call-template>
                    </xsl:if>
                </xsl:variable>
                <xsl:variable name="afterelem">
                    <xsl:choose>
                        <xsl:when test="not($elemclosed)">
                            <xsl:call-template name="skipper-after">
                                <xsl:with-param name="source" select="substring-after(substring-after($escaped,'&lt;'),'&gt;')"/>
                                <xsl:with-param name="delimiter" select="$elemclosetag"/>
                            </xsl:call-template>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="substring-after(substring-after($escaped,'&lt;'),'/&gt;')"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:element name="{$elemname}">
                    <xsl:if test="$hasattributes">
                        <xsl:call-template name="unescapeattributes">
                            <xsl:with-param name="escapedattributes">
                                <xsl:choose>
                                    <xsl:when test="not($elemclosed)">
                                        <xsl:value-of select="normalize-space(substring-after($elemname2,' '))"/>
                                    </xsl:when>
                                    <xsl:otherwise>
                                        <xsl:value-of select="normalize-space(substring-after($elemname3,' '))"/>
                                    </xsl:otherwise>
                                </xsl:choose>
                            </xsl:with-param>
                        </xsl:call-template>
                    </xsl:if>
                    <xsl:call-template name="unescape">
                        <xsl:with-param name="escaped" select="$innercontent"/>
                    </xsl:call-template>
                </xsl:element>
                <xsl:call-template name="unescape">
                    <xsl:with-param name="escaped" select="$afterelem"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="unescapetext">
                    <xsl:with-param name="escapedtext" select="$escaped"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="unescapeattributes">
        <xsl:param name="escapedattributes"/>
        <xsl:variable name="attrname" select="substring-before($escapedattributes,'=')"/>
        <xsl:variable name="attrquote" select="substring($escapedattributes,string-length($attrname)+2,1)"/>
        <xsl:variable name="attrvalue" select="substring-before(substring-after($escapedattributes,$attrquote),$attrquote)"/>
        <xsl:variable name="afterattr" select="substring-after(substring-after($escapedattributes,$attrquote),$attrquote)"/>
        <xsl:attribute name="{$attrname}">
            <xsl:call-template name="unescapetext">
                <xsl:with-param name="escapedtext" select="$attrvalue"/>
            </xsl:call-template>
        </xsl:attribute>
        <xsl:if test="contains($afterattr,'=')">
            <xsl:call-template name="unescapeattributes">
                <xsl:with-param name="escapedattributes" select="normalize-space($afterattr)"/>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>

    <xsl:template name="unescapetext">
        <xsl:param name="escapedtext"/>
        <xsl:call-template name="string-replace-all">
            <xsl:with-param name="text">
                <xsl:call-template name="string-replace-all">
                    <xsl:with-param name="text">
                        <xsl:call-template name="string-replace-all">
                            <xsl:with-param name="text" select="$escapedtext"/>
                            <xsl:with-param name="replace">&amp;gt;</xsl:with-param>
                            <xsl:with-param name="by">&gt;</xsl:with-param>
                        </xsl:call-template>
                    </xsl:with-param>
                    <xsl:with-param name="replace">&amp;lt;</xsl:with-param>
                    <xsl:with-param name="by">&lt;</xsl:with-param>
                </xsl:call-template>
            </xsl:with-param>
            <xsl:with-param name="replace">&amp;amp;</xsl:with-param>
            <xsl:with-param name="by">&amp;</xsl:with-param>
        </xsl:call-template>
    </xsl:template>

    <!-- replaces substrings in strings -->
    <xsl:template name="string-replace-all">
        <xsl:param name="text"/>
        <xsl:param name="replace"/>
        <xsl:param name="by"/>
        <xsl:choose>
            <xsl:when test="contains($text, $replace)">
                <xsl:value-of select="substring-before($text,$replace)"/>
                <xsl:value-of select="$by"/>
                <xsl:call-template name="string-replace-all">
                    <xsl:with-param name="text" select="substring-after($text,$replace)"/>
                    <xsl:with-param name="replace" select="$replace"/>
                    <xsl:with-param name="by" select="$by"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$text"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- returns the substring after the last delimiter -->
    <xsl:template name="skipper-after">
        <xsl:param name="source"/>
        <xsl:param name="delimiter"/>
        <xsl:choose>
            <xsl:when test="contains($source,$delimiter)">
                <xsl:call-template name="skipper-after">
                    <xsl:with-param name="source" select="substring-after($source,$delimiter)"/>
                    <xsl:with-param name="delimiter" select="$delimiter"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$source"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- returns the substring before the last delimiter -->
    <xsl:template name="skipper-before">
        <xsl:param name="source"/>
        <xsl:param name="delimiter"/>
        <xsl:param name="result"/>
        <xsl:choose>
            <xsl:when test="contains($source,$delimiter)">
                <xsl:call-template name="skipper-before">
                    <xsl:with-param name="source" select="substring-after($source,$delimiter)"/>
                    <xsl:with-param name="delimiter" select="$delimiter"/>
                    <xsl:with-param name="result">
                        <xsl:if test="result!=''">
                            <xsl:value-of select="concat($result,$delimiter)"/>
                        </xsl:if>
                        <xsl:value-of select="substring-before($source,$delimiter)"/>
                    </xsl:with-param>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$result"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
	

	<xsl:variable name="text-without-namespace">
		<xsl:call-template name="replace-string">
			<xsl:with-param name="text">
				<xsl:value-of select="substring($originaldata,39,string-length($originaldata))"/>
			</xsl:with-param>					
			<xsl:with-param name="replace" select="'cas:'"/>
			<xsl:with-param name="with" select="''"/>
		</xsl:call-template>					
	</xsl:variable>

	<xsl:variable name="orig-message">
		
		<xsl:call-template name="unescape">
			<xsl:with-param name="escaped">&lt;dataset&gt;&lt;label&gt;Property data&lt;/label&gt;&lt;property&gt;&lt;key&gt;NaamContactpersoon&lt;/key&gt;&lt;value&gt;asdf&lt;/value&gt;&lt;/property&gt;&lt;property&gt;&lt;key&gt;PortaalLoginLink&lt;/key&gt;&lt;value&gt;asdf&lt;/value&gt;&lt;/property&gt;&lt;property&gt;&lt;key&gt;RedenAfwijzenAanvraag&lt;/key&gt;&lt;value&gt;asdf&lt;/value&gt;&lt;/property&gt;&lt;/dataset&gt;</xsl:with-param>	
		
				<!--  xsl:call-template name="replace-string">
					<xsl:with-param name="text">
						<xsl:value-of select="$text-without-namespace"/>
					</xsl:with-param>					
					<xsl:with-param name="replace" select="' xmlns:cas=&#34;http://schemas.beinformed.nl/beinformed/v3/services/caseservice&#34; xmlns:attachment=&#34;http://schemas.beinformed.nl/beinformed/v3/services/caseservice/attachments&#34; xmlns:xop=&#34;http://www.w3.org/2004/08/xop/include&#34;'"/>
					<xsl:with-param name="with" select="''"/>
				</xsl:call-template-->
			
		</xsl:call-template>
	</xsl:variable>
	
	<xsl:template name="replace-string">
	    <xsl:param name="text"/>
	    <xsl:param name="replace"/>
	    <xsl:param name="with"/>
	    <xsl:choose>
	      <xsl:when test="contains($text,$replace)">
	        <xsl:value-of select="substring-before($text,$replace)"/>
	        <xsl:value-of select="$with"/>
	        <xsl:call-template name="replace-string">
	          <xsl:with-param name="text" select="substring-after($text,$replace)"/>
	          <xsl:with-param name="replace" select="$replace"/>
	          <xsl:with-param name="with" select="$with"/>
	        </xsl:call-template>
	      </xsl:when>
	      <xsl:otherwise>
	        <xsl:value-of select="$text"/>
	      </xsl:otherwise>
	    </xsl:choose>
	  </xsl:template>
	 
	 <xsl:template name="get-property-value">
		<xsl:param name="property-name"/>
		<xsl:choose>
		
			<xsl:when test="$property-name='ApplicationNameExtended'">
				<xsl:choose>
					<xsl:when test="contains($ApplicationNameExtended,'Superintendencia Nacional')">
						<xsl:text>Superintendencia Nacional de Administración Tributaria</xsl:text>	
					</xsl:when>
					<xsl:otherwise>
						<xsl:value-of select="$ApplicationNameExtended" />
					
					</xsl:otherwise>
				</xsl:choose> 
				
			</xsl:when>
			<xsl:when test="$property-name='ApplicationName'">
				<xsl:value-of select="$ApplicationName"/>
			</xsl:when>
			<xsl:when test="$property-name='mailPlainEmail'">
				<xsl:value-of select="$mailPlainEmail"/>
			</xsl:when>
			<xsl:when test="$property-name='PortaalBaseURL'">
				<xsl:value-of select="$PortaalBaseURL"/>
			</xsl:when>
			<xsl:when test="$property-name='messageSubject'">
				<xsl:value-of select="$messageSubject"/>
			</xsl:when>
			<xsl:when test="$property-name='DoorgeeflandCode'">
				<xsl:value-of select="$DoorgeeflandCode"/>
			</xsl:when>		
			<xsl:otherwise>
				<xsl:value-of select="$property-name"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<xsl:variable name="originaldata-as-element" as="element()">
		<xsl:value-of select="$originaldata" />
	</xsl:variable>
	

	
	
	
	<xsl:template match="*" >

    <xsl:call-template name="replace-variables">
			<xsl:with-param name="replace-text" select="."/>
		</xsl:call-template>

		
	</xsl:template>

    

	<xsl:template match="*" mode="translate-value">
		<xsl:variable name="value-to-translate" select="." />
		<xsl:variable name="value" select="//request/*[local-name()=$value-to-translate]" />
		<xsl:choose>
			<xsl:when test="$value!=''">
				<xsl:value-of select="$value"/>
			</xsl:when>
			<xsl:otherwise>
				<xsl:text><xsl:value-of select="$value-to-translate"/></xsl:text>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template> 	

    <xsl:template name="replace-variables">
		<xsl:param name="replace-text" select="''"/>
		<xsl:variable name="replaced-text">
		<xsl:choose>
			<xsl:when test="contains($replace-text,'{')">
				<xsl:variable name="org-value">
					<xsl:value-of select="$replace-text" />
				</xsl:variable>
				<xsl:variable name="var-to-replace">
					<xsl:value-of select="substring-before(substring-after($replace-text, '{'), '}')" />
				</xsl:variable>
				
				
				<xsl:variable name="value-to-replace">
					<xsl:variable name="value-from-data">
                        
                        <xsl:apply-templates select="//*[cas:key = $var-to-replace]/cas:value" mode="translate-value"/>
                    </xsl:variable>
                    
					<xsl:choose>
						<xsl:when test="$value-from-data != ''">
							<xsl:value-of select="$value-from-data" />
						</xsl:when>
						<xsl:otherwise>
							<xsl:call-template name="get-property-value">
								<xsl:with-param name="property-name" select="$var-to-replace"/>
							</xsl:call-template>							
						</xsl:otherwise>						
					</xsl:choose>
				</xsl:variable>			
				
				<xsl:value-of select="concat(substring-before($org-value,'{'),$value-to-replace)" />
				<xsl:call-template name="replace-variables">
					<xsl:with-param name="replace-text" select="substring-after($org-value,'}')"/>
				</xsl:call-template>
			</xsl:when>
			
			<xsl:otherwise>
				<xsl:value-of select="$replace-text"/>
			</xsl:otherwise>
		</xsl:choose>
		</xsl:variable>
		
		
		<xsl:choose>
			<xsl:when test="$replaced-text!=''">
				<xsl:value-of select="$replaced-text" disable-output-escaping="no"/>
			</xsl:when>
			<xsl:otherwise>
				<xsl:value-of select="$replace-text" disable-output-escaping="no"/>
			</xsl:otherwise>
		</xsl:choose>
		
	</xsl:template>

</xsl:stylesheet>
