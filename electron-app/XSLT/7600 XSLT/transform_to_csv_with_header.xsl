<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:bi="http://www.be-informed.nl/BeInformed"  xmlns:attributes="http://www.be-informed.nl/BeInformed/Attributes" version="2.0">
    <xsl:output omit-xml-declaration="yes" method="text"/>
    	<xsl:variable name="reportLanguage" select="//*[attributes:label//bi:resolved-message='Report language']/attributes:value"/>
		<xsl:variable name="spanish" select="document('../../9000 Algemeen/Vertalingen/messages_es.xml')"/>
		<xsl:variable name="english" select="document('../../9000 Algemeen/Vertalingen/messages_en.xml')"/>
		<xsl:template match="/">
		<xsl:apply-templates select="//bi:attribute-set-document-part"/>
		
		</xsl:template>
    <xsl:template match="bi:attribute-set-document-part">
		<xsl:apply-templates select=".//attributes:attributeset[1][attributes:label!='Report language']" mode="header" />
        <xsl:for-each select=".//attributes:attributeset[attributes:label!='Report language']">
            				<xsl:apply-templates select="attributes:attributes/*[contains(local-name(),'-attribute')]" mode="value"/>
            
                 <xsl:if test="not(position() = last())">
                <xsl:text>
</xsl:text>
            </xsl:if> 
        </xsl:for-each>
  		<xsl:text>
</xsl:text>
		<xsl:text>
</xsl:text>
    </xsl:template>
	
	<xsl:template match="attributes:label[.//bi:resolved-message='RowValue']" priority="1000">

	 	<xsl:choose>
	 		<xsl:when test="$reportLanguage='ES'">
				<xsl:text>Element,Año fiscal,ReportingEntityRecordId,AdditionalInfoRecordId,ReportingEntityINRecordId,ReportingEntityNameRecordId,ReportingEntityAddressRecordId,ReportRecordId,ConstituentEntityRecordId,ConstituentEntityINRecordId,ConstituentEntityNameRecordId,ConstituentEntityAddressRecordId,Versión,RUC,País emisor,País receptor,Tipo de mensaje,Idioma,Advertencia,Contacto,Numéro de identificación del mensaje,Tipo de mensaje,CorrMessageRefId,Período de reportar,Marca de tiempo,Jurisdicción fiscal,TIN RUC,issuedBy,Nombre MNE group,Rol de reportar,Fecha de inicio,Fecha final,DocTypeIndic,DocRefId,Numéro de identificación del mensaje de corrección,CorrDocRefId,IdentificationNumber,issuedBy,INType,Nombre,legalAddressType,CountryCode,Dirección del Domicilio Fiscal,BuildingIdentifier,SuiteIdentifier,FloorIdentifier,DistrictName,POB,PostCode,Ciudad,CountrySubEntity,AddressFree,Jurisdicción fiscal,TIN RUC,issuedBy,Rol,IncorpCountryCode,BizActivities,OtherEntityInfo,IdentificationNumber,issuedBy,INType,Nombre,legalAddressType,CountryCode,Dirección del Domicilio Fiscal,BuildingIdentifier,SuiteIdentifier,FloorIdentifier,DistrictName,POB,PostCode,Ciudad,CountrySubEntity,AddressFree,CSV export OtherInfo,OtherInfo idioma,Jurisdicción fiscal,Referencia,DocTypeIndic,DocRefId,Numéro de identificación del mensaje de corrección,CorrDocRefId,Código del país reportando,Monto de ingresos terceros,Moneda de ingresos vinculados,Monto de ingresos vinculados,Moneda ingresos relacionados,Total de monto de ingresos,Moneda ingresos totales,Monto de beneficios o pãrdidas,Moneda de beneficios o pãrdidas,Monto de impuesto pagado,Moneda de impuesto pagado,Monto de impuesto acumulado,Moneda de impuesto acumulado,Monto de capital,Moneda de capital,Monto de ganancias,Moneda de ganancias,Numéro de trabajadores,Monto de bienes,Moneda de bienes,DocTypeIndic,DocRefId,Numéro de identificación del mensaje de corrección,CorrDocRefId</xsl:text>
	 		</xsl:when>
	 		<xsl:otherwise>
	 			<xsl:text>Element,Tax year,ReportingEntityRecordId,AdditionalInfoRecordId,ReportingEntityINRecordId,ReportingEntityNameRecordId,ReportingEntityAddressRecordId,ReportRecordId,ConstituentEntityRecordId,ConstituentEntityINRecordId,ConstituentEntityNameRecordId,ConstituentEntityAddressRecordId,Version,SendingEntityIn,Transmitting Country,Receiving Country,Message Type,Language,Warning,Contact,MessageRefId,MessageTypeIndic,CorrMessageRefId,Reporting period,Timestamp,ResCountryCode,TIN,issued by,Name MNE Group,Reporting role,Start date,End date,DocTypeIndic,DocRefId,CorrMessageRefId,CorrDocRefId,IdentificationNumber,IssuedBy,INType,Name,legalAddressType,CountryCode,Street,Building identifier,Suite identifier,Floor identifier,District name,POB,PostalCode,City,CountrySubEntity,AddressFree,ResCountryCode,TIN,issuedBy,Role,InCorpCountryCode,BizActivities,OtherEntityInfo,IdentificationNumber,IssuedBy,INType,Name,legalAddressType,CountryCode,Street,BuildingIdentifier,SuiteIdentifier,FloorIdentifier,DistrictName,POB,PostCode,City,CountrySubEntity,AddressFree,CSV export OtherInfo,OtherInfo Language,ResCountryCode,Summary ref,DocTypeIndic,DocRefId,CorrMessageRefId,CorrDocRefId,Report Country Code,Unrelated revenues amount,Unrelated revenues currency,Related revenues amount,Related revenues currency,Total revenues amount,Total revenues currency,Profit or loss amount,Profit or loss currency,Tax paid amount,Tax paid currency,Tax accrued amount,Tax accrued currency,Capital amount,Capital currency,Earnings amount,Earnings currency,Nb employees,Assets amount,Assets currency,DocTypeIndic,DocRefId,Identification number of the correction message,CorrDocRefId</xsl:text>
	 		</xsl:otherwise>
	 	</xsl:choose>
	
		                <xsl:text>
</xsl:text>
	</xsl:template>
	
	
	
	<xsl:template match="attributes:attributeset" mode="header">
		<xsl:apply-templates select=".//attributes:attributes//attributes:label[parent::*[contains(local-name(),'-attribute')]]"/>		
	</xsl:template>
	
	<xsl:template match="attributes:label[parent::attributes:readonly-choice-attribute]">
		<xsl:apply-templates select="." mode="translate-text"/>		
		<xsl:if test="not(position() = last())">,</xsl:if>
		<xsl:if test="position() = last()"><xsl:text>
	</xsl:text>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="attributes:label[.//bi:resolved-message='IndividualRecordId' or .//bi:resolved-message='Unique key' or .//bi:resolved-message='Uniquekey' or .//bi:resolved-message='UniqueKey' or .//bi:resolved-message='Identifier' or .//bi:resolved-message='Reference key' or .//bi:resolved-message='Deleted' or .//bi:resolved-message='Activity path']"/>
	<xsl:template match="attributes:attributes/*[.//bi:resolved-message='IndividualRecordId' or contains(local-name(),'-attribute')][attributes:label[.//bi:resolved-message='Unique key' or .//bi:resolved-message='Uniquekey' or .//bi:resolved-message='UniqueKey' or .//bi:resolved-message='Identifier' or .//bi:resolved-message='Reference key' or .//bi:resolved-message='Deleted' or .//bi:resolved-message='Activity path']]" mode="value"/>
	<xsl:template match="attributes:label[.//bi:resolved-message='Deleted']">
	<xsl:text>
</xsl:text>
	</xsl:template>
	
	
	<xsl:template match="attributes:attributes/*[contains(local-name(),'-attribute')][attributes:label[.//bi:resolved-message='Deleted']]" mode="value"/>

	
	
    <xsl:template match="attributes:label">
    	<xsl:apply-templates select=".//bi:resolved-message" mode="translate-text"/>		
		<xsl:if test="not(position() = last())">,</xsl:if>
		<xsl:if test="position() = last()"><xsl:text>
	</xsl:text>
		</xsl:if>
	</xsl:template>
		
	<xsl:template match="attributes:label[parent::*[contains(attributes:label,'Corr') and attributes:label/bi:resolved-message != 'Correctie leveringen']]">
	<xsl:if test="position() = last()"><xsl:text>
	</xsl:text>
		</xsl:if>
	</xsl:template>
<xsl:template match="*" mode="translate-text">
		<xsl:variable name="org-label" select="."/>
		<xsl:variable name="label" select="."/>
		<xsl:variable name="label-text">
			<xsl:choose>
				<xsl:when test="$reportLanguage='EN'">
					<xsl:value-of select="$english/*/message[@key=$label]"/>
				</xsl:when>
				<xsl:when test="$reportLanguage='ES'">
					<xsl:value-of select="$spanish/*/message[@key=$label]"/>
				</xsl:when>
			</xsl:choose>
		</xsl:variable>
		<xsl:choose>
			<xsl:when test="$label=''">
				<xsl:value-of select="$org-label"/>
			</xsl:when>
			<xsl:when test="$label-text=''">
				<xsl:value-of select="$label"/>
			</xsl:when>
			
			<xsl:otherwise>
				<xsl:value-of select="$label-text"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
		
	<xsl:template match="attributes:readonly-choice-attribute/attributes:value">
    	<xsl:apply-templates select="../attributes:options/attributes:option[attributes:selected='true']/attributes:label" mode="translate-text"/>
	</xsl:template>
	
	
	<xsl:template match="*" mode="value">
		<xsl:if test="attributes:type = 'string-attribute' or attributes:type = 'money-attribute' ">"</xsl:if>	           
        	<xsl:apply-templates select="attributes:value"/>
         <xsl:if test="attributes:type = 'string-attribute' or attributes:type = 'money-attribute'">"</xsl:if>	  
         <xsl:if test="not(position() = last())">,</xsl:if>
       
	</xsl:template>
	
	<xsl:template match="*[contains(attributes:label,'Corr') and attributes:label/bi:resolved-message != 'Correctie leveringen']" mode="value"/>
	
	
	
	
	<xsl:template match="attributes:value">
		
        <xsl:variable name="text-without-open-p">
           <xsl:call-template name="string-replace-all">
             <xsl:with-param name="text" select="text()" />
             <xsl:with-param name="replace" select="'&lt;p&gt;'" />
             <xsl:with-param name="by" select="''" />
           </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="text-without-close-p">
           <xsl:call-template name="string-replace-all">
             <xsl:with-param name="text" select="$text-without-open-p" />
             <xsl:with-param name="replace" select="'&lt;/p&gt;'" />
             <xsl:with-param name="by" select="'\n'" />
           </xsl:call-template>           
        </xsl:variable>
        <xsl:value-of select="$text-without-close-p"/>
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