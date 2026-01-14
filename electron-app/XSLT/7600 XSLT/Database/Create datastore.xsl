<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"

exclude-result-prefixes="cas bi knowledge cmf iso case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

<xsl:output indent="yes"/>	
	<xsl:variable name="uppercase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
	<xsl:variable name="lowercase" select="'abcdefghijklmnopqrstuvwxyz'" />
	<xsl:variable name="tableName" select="//cas:dataset[cas:label='Current']/cas:property[cas:key='CurrentTABLE_NAME']/cas:value"/>
	<xsl:variable name="currentTable" select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" />
	
	<xsl:template match="/">
		<xsl:value-of select="'&lt;?plugin nl.beinformed.bi.common.panels_22.2.0.202211021055?&gt;&lt;?plugin nl.beinformed.bi.casemanagement_22.2.0.202211021055?&gt;'" disable-output-escaping="yes"/>
		<xsl:variable name="tableNamePrefix">
			<xsl:apply-templates select="$tableName" mode="starts-with-prefix"/>
		</xsl:variable>
		<xsl:variable name="tablePrimaryKey" select="$currentTable[cas:property[cas:key='IsPrimaryKey']/cas:value='true']/cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<xsl:variable name="tableHasCaseIdColumn" select="count($currentTable[cas:property[cas:key='COLUMN_NAME']/cas:value='CASEID' or cas:property[cas:key='COLUMN_NAME']/cas:value='caseid' or cas:property[cas:key='COLUMN_NAME']/cas:value='CaseId' or cas:property[cas:key='COLUMN_NAME']/cas:value='FGOCaseId'])=1"/>
		<xsl:variable name="tableHasDeletedColumn" select="count($currentTable[cas:property[cas:key='COLUMN_NAME']/cas:value='DELETED' or cas:property[cas:key='COLUMN_NAME']/cas:value='deleted' or cas:property[cas:key='COLUMN_NAME']/cas:value='Deleted'])=1"/>
		<xsl:variable name="tableHasOnePrimaryKeyColumn" select="count($currentTable[cas:property[cas:key='IsPrimaryKey']/cas:value='true']) = 1"/>
		<xsl:variable name="nrOfPrimaryKeys" select="count($currentTable[cas:property[cas:key='IsPrimaryKey']/cas:value='true'])"/>
		
	<datastore>
	
    <label><xsl:value-of select="concat($tableName)"/></label>
    <permissions/>
    <default-allowed>true</default-allowed>
    <attributeset>
        <id><xsl:value-of select="concat('23df33s23',position())"/></id>
        <label>attributes <xsl:value-of select="$tableName"/></label>
        <permissions/>
        <default-allowed>true</default-allowed>
        <xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
        	<numberattribute>
	            <id>CASEID</id>
	            <label>CASEID</label>
	            <permissions/>
	            <default-allowed>true</default-allowed>
	            <functional-id>CASEID</functional-id>
	            <mandatory>false</mandatory>
	            <key>false</key>
	            <master>true</master>
	            <readonly>false</readonly>
	            <assistant/>
	            <layout-hint/>
	            <mask>0</mask>
	            <external-grouping-separator>.</external-grouping-separator>
	            <external-decimal-separator>,</external-decimal-separator>
	        </numberattribute>	
        </xsl:if>
        <xsl:if test="$nrOfPrimaryKeys=0 or $nrOfPrimaryKeys &gt; 1">
        	<numberattribute>
	            <id><xsl:value-of select="concat($tableName,'_key')"/></id>
	            <label>KEYATTRIBUTE</label>
	            <permissions/>
	            <default-allowed>true</default-allowed>
	            <functional-id>KEYATTRIBUTE</functional-id>
	            <mandatory>false</mandatory>
	            <key>true</key>
	            <master>true</master>
	            <readonly>false</readonly>
	            <assistant/>
	            <layout-hint/>
	            <mask>0</mask>
	            <external-grouping-separator>.</external-grouping-separator>
	            <external-decimal-separator>,</external-decimal-separator>
	        </numberattribute>	
        </xsl:if>
    	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="list-attributes"/>
        <functional-id>attributes<xsl:value-of select="$tableName"/></functional-id>
        <repeatable>false</repeatable>
        <repeat-number/>
    </attributeset>
    <data-store-simple-data-store-mapping>
        <id><xsl:value-of select="concat('23343s23',position())"/></id>
        <label>mapping</label>
        <permissions/>
        <default-allowed>true</default-allowed>
        <attribute-set-type-link>#<xsl:value-of select="concat('23df33s23',position())"/></attribute-set-type-link>
        <attribute-mapping>
            <freeze-contents>false</freeze-contents>
            <rows/>
            <order/>
            <deleted-rows/>
        </attribute-mapping>
        <table>
        	<xsl:choose>
	        	<xsl:when test="($tableNamePrefix='CMF' or not($tableHasDeletedColumn)) or (string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn))"><xsl:value-of select="concat('generated_vw_',$tableName)"/></xsl:when>
	        	<xsl:otherwise><xsl:value-of select="$tableName"/></xsl:otherwise>
	        </xsl:choose>
        </table>
        <data-source-type>
	        <xsl:choose>
	        	<xsl:when test="($tableNamePrefix='CMF' or not($tableHasDeletedColumn)) or (string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn))">virtual</xsl:when>
	        	<xsl:otherwise>physical</xsl:otherwise>
	        </xsl:choose>        
        </data-source-type>
    </data-store-simple-data-store-mapping>
</datastore>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="list-attributes">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
		<xsl:variable name="isPrimaryKey" select="cas:property[cas:key='IsPrimaryKey']/cas:value"/>
		<xsl:variable name="dataType" select="cas:property[cas:key='DATA_TYPE']/cas:value"/>
		<xsl:variable name="id" select="concat('34567344',position())"/>
		<xsl:variable name="tableHasOnePrimaryKeyColumn" select="count($currentTable[cas:property[cas:key='IsPrimaryKey']/cas:value='true']) = 1"/>
		<xsl:variable name="nrOfPrimaryKeys" select="count($currentTable[cas:property[cas:key='IsPrimaryKey']/cas:value='true'])"/>
		<xsl:choose>
			
			<xsl:when test="$columnName='Deleted' or $columnName='DELETED' or $columnName='deleted'">
				 <booleanattribute>
		            <id><xsl:value-of select="$id"/></id>
		            <label><xsl:value-of select="$columnName"/></label>
		            <permissions/>
		            <default-allowed>true</default-allowed>
		            <functional-id><xsl:value-of select="$columnName"/></functional-id>
		            <mandatory>false</mandatory>
		            <key>false</key>
		            <master>false</master>
		            <readonly>false</readonly>
		            <assistant/>
		            <layout-hint/>
		            <choice-type>radiobutton</choice-type>
		            <multi-choice>false</multi-choice>
		            <render-only-selected>true</render-only-selected>
		            <alternative-true-label/>
		            <alternative-false-label/>
		        </booleanattribute>	
			</xsl:when>
			<xsl:when test="$dataType='int' or $dataType='numeric' or $dataType='bigint'  or $dataType='tinyint'">
				<numberattribute>
		            <id><xsl:value-of select="$id"/></id>
		            <label><xsl:value-of select="$columnName"/></label>
		            <permissions/>
		            <default-allowed>true</default-allowed>
		            <functional-id><xsl:value-of select="$columnName"/></functional-id>
		            <mandatory>false</mandatory>
		            <key>
		            	<xsl:choose>
		            		<xsl:when test="$nrOfPrimaryKeys &gt; 1">false</xsl:when>
		            		<xsl:otherwise><xsl:value-of select="$isPrimaryKey"/></xsl:otherwise>
		            	</xsl:choose>		            	
		            </key>
		            <master>false</master>
		            <readonly>false</readonly>
		            <assistant/>
		            <layout-hint/>
		            <mask>0</mask>
		            <external-grouping-separator>.</external-grouping-separator>
		            <external-decimal-separator>,</external-decimal-separator>
		        </numberattribute>	
			</xsl:when>
			
			
			<xsl:otherwise>
				<stringattribute>
		            <id><xsl:value-of select="$id"/></id>
		            <label><xsl:value-of select="$columnName"/></label>
		            <permissions/>
		            <default-allowed>true</default-allowed>
		            <functional-id><xsl:value-of select="$columnName"/></functional-id>
		            <mandatory>false</mandatory>
		            
		            <key>
		            	<xsl:choose>
		            		<xsl:when test="$nrOfPrimaryKeys &gt; 1">false</xsl:when>
		            		<xsl:otherwise><xsl:value-of select="$isPrimaryKey"/></xsl:otherwise>
		            	</xsl:choose>		            	
		            </key>
		            <master>false</master>
		            <readonly>false</readonly>
		            <assistant/>
		            <layout-hint/>
		            <size>50</size>
		            <maxlength>255</maxlength>
		            <minlength>0</minlength>
		        </stringattribute>
					
			</xsl:otherwise>
		</xsl:choose>
				        
        

	</xsl:template>
	
	<xsl:template match="*" mode="starts-with-prefix">	
		<xsl:choose>
			<xsl:when test="contains(.,'CBC')">CBC</xsl:when>
			<xsl:when test="contains(.,'Aanvraag_')">Aanvraag_</xsl:when>
			<xsl:when test="contains(.,'QRTZ_')">QRTZ_</xsl:when>
			<xsl:when test="contains(.,'BI_')">BI_</xsl:when>
			<xsl:when test="contains(.,'ETR_')">ETR_</xsl:when>
			<xsl:when test="contains(.,'AU_')">AU_</xsl:when>
			<xsl:when test="contains(.,'CMF')">CMF</xsl:when>
			<xsl:when test="contains(.,'CSM_')">CSM_</xsl:when>
			<xsl:when test="contains(.,'BIS_')">BIS_</xsl:when>
			<xsl:when test="contains(.,'EXPORT_')">EXPORT_</xsl:when>
			<xsl:when test="contains(.,'EOIR_')">EOIR_</xsl:when>
			<xsl:when test="contains(.,'FATCA_')">FATCA_</xsl:when>
			<xsl:when test="contains(.,'FGO_')">FGO_</xsl:when>
			<xsl:when test="contains(.,'FRI_')">FRI_</xsl:when>
			<xsl:when test="contains(.,'DS_')">DS_</xsl:when>
			<xsl:when test="contains(.,'e_')">e_</xsl:when>
			<xsl:when test="contains(.,'GEBRUIKER')">GEBRUIKER</xsl:when>
			<xsl:when test="contains(.,'IMPORT_')">IMPORT_</xsl:when>
			<xsl:when test="contains(.,'report_')">report_</xsl:when>
			<xsl:when test="contains(.,'NTJ_')">NTJ_</xsl:when>
			<xsl:when test="contains(.,'UAV_')">UAV_</xsl:when>
			<xsl:when test="contains(.,'RE_')">RE_</xsl:when>
			<xsl:otherwise></xsl:otherwise>
		</xsl:choose>
	</xsl:template>


	
	
</xsl:stylesheet>