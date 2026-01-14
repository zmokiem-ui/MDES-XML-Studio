<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"

exclude-result-prefixes="cas bi knowledge cmf iso case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

<xsl:output indent="yes"/>	
	
	<xsl:template match="/">
		<xsl:value-of select="'&lt;?plugin nl.beinformed.bi.common.panels_22.2.0.202211021055?&gt;&lt;?plugin nl.beinformed.bi.casemanagement_22.2.0.202211021055?&gt;'" disable-output-escaping="yes"/>
		
		<tab>
		    <label>Database</label>
		    <permissions/>
		    <default-allowed>true</default-allowed>
		    <uri-part>database</uri-part>
		    <secure>true</secure>
		    	<xsl:apply-templates select="//cas:dataset"/>
		    	<tab-grouping-panel>
			        <id>Other</id>
			        <label>Other</label>
			        <permissions/>
			        <default-allowed>true</default-allowed>
			        <uri-part>other</uri-part>
			        <secure>false</secure>
			        <layout-hint>panel-layout</layout-hint>
			        <taskgroup-elements/>
			        <panel-elements>
			        	
			       		<xsl:apply-templates select="//cas:dataset" mode="create-datastore-list-in-other-group"/>
					</panel-elements>
	    		</tab-grouping-panel>
		    <case-search-activated>false</case-search-activated>
		</tab>
	</xsl:template>
	
	
	
	<xsl:template match="cas:dataset">
	<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
	<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
	<xsl:variable name="hasTableNamePrefix">
		<xsl:apply-templates select="$tableName" mode="starts-with-prefix"/>
	</xsl:variable>
	<xsl:variable name="tableNamePrefix">
		<xsl:apply-templates select="$tableName" mode="starts-with-which-prefix"/>
	</xsl:variable>
	<xsl:variable name="isFirstTableOccurencecount" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName])=0"/>
	<xsl:variable name="isFirstPrefixOccurencecount" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='TABLE_NAME'][cas:value[contains(text(),$tableNamePrefix)]]])=0"/>
	<xsl:choose>
		<xsl:when test="$tableNamePrefix!='' and $isFirstPrefixOccurencecount">
			<tab-grouping-panel>
		        <id><xsl:value-of select="concat('r534w33',concat($tableName,'_',$columnName))"/></id>
		        <label><xsl:value-of select="$tableNamePrefix"/></label>
		        <permissions/>
		        <default-allowed>true</default-allowed>
		        <uri-part><xsl:value-of select="$tableNamePrefix"/></uri-part>
		        <secure>false</secure>
		        <layout-hint>panel-layout</layout-hint>
		        <taskgroup-elements/>
		        <panel-elements>
		        	
		       		<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME'][cas:value[starts-with(text(),$tableNamePrefix)]]]" mode="create-datastore-list"/>
				</panel-elements>
	    	</tab-grouping-panel>
		</xsl:when>
		
	</xsl:choose>
	
	
	</xsl:template>
	
	
	<xsl:template match="cas:dataset" mode="create-datastore-list-in-other-group">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
		<xsl:variable name="isFirstTableOccurencecount" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName])=0"/>
		<xsl:if test="$isFirstTableOccurencecount">
			<xsl:variable name="tablePrimaryKey" select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true']/cas:property[cas:key='COLUMN_NAME']/cas:value"/>
			<xsl:variable name="tableHasCaseIdColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='COLUMN_NAME']/cas:value='CASEID' or cas:property[cas:key='COLUMN_NAME']/cas:value='caseid' or cas:property[cas:key='COLUMN_NAME']/cas:value='CaseId' or cas:property[cas:key='COLUMN_NAME']/cas:value='FGOCaseId'])=1"/>
			<xsl:variable name="tableHasPrimaryKeyColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true'])  &gt; 0"/>
			<xsl:variable name="nrOfPrimaryKeys" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true'])"/>
			<xsl:variable name="hasTableNamePrefix">
				<xsl:apply-templates select="$tableName" mode="starts-with-prefix"/>
			</xsl:variable>
			<xsl:if test="$isFirstTableOccurencecount and $hasTableNamePrefix='false'">
			
				<datastore-list>
			        <id><xsl:value-of select="concat('23455s23',concat($tableName,'_',$columnName))"/></id>
			        <label><xsl:value-of select="$tableName"/></label>
			        <permissions/>
			        <default-allowed>true</default-allowed>
			        <uri-part><xsl:value-of select="$tableName"/></uri-part>
			        <paging-enabled>true</paging-enabled>
			        <page-size>25</page-size>
			        <custom-page-size-enabled>true</custom-page-size-enabled>
			        <custom-page-sizes>10,25,50</custom-page-sizes>
			        <count-enabled>true</count-enabled>
			        <result-limit>500</result-limit>
			        <list-attributes>
			         	<xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
				        	<attribute>
				                <list-attribute-id>CASEID</list-attribute-id>
				                <visible>true</visible>
				                <visible-in-detail>true</visible-in-detail>
				                <end-user-sortable>true</end-user-sortable>
				                <layout-hint/>
				                <children/>
				            </attribute>
				        			        	
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<attribute>
				                <list-attribute-id>KEYATTRIBUTE</list-attribute-id>
				                <visible>true</visible>
				                <visible-in-detail>true</visible-in-detail>
				                <end-user-sortable>true</end-user-sortable>
				                <layout-hint/>
				                <children/>
				            </attribute>
				        	
				        </xsl:if>
			            <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="list-attributes"/>
			        </list-attributes>
			        <initial-sorting>
			            <xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
			            	<attribute-config>
				                <list-attribute-id><xsl:value-of select="concat($tableName,'_CaseId')"/></list-attribute-id>
				                <initial-sorting/>
				            </attribute-config>
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<attribute-config>
				                <list-attribute-id><xsl:value-of select="concat($tableName,'_Key')"/></list-attribute-id>
				                <initial-sorting/>
				            </attribute-config>
				        </xsl:if>
			        	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="initial-sorting-attributes"/>
			            
			        </initial-sorting>
			        <secure>false</secure>
			        <datastore-link><xsl:value-of select="concat('/Portaal AEOI/Reporting/Datastores/Database/Generated/',$tableName,'.bixml')"/></datastore-link>
			        <case-context-attribute-link/>
			        <display-one-result-in-table>true</display-one-result-in-table>
			        <check-permissions>true</check-permissions>
			        
			        <data-store-list-end-user-filters>
	                    <id><xsl:value-of select="concat('23434f3',concat($tableName,'_',$columnName))"/></id>
	                    <permissions/>
	                    <default-allowed>true</default-allowed>
	                    <xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
				        	<number-filter>
		                        <id><xsl:value-of select="concat($tableName,'_CaseIdFilter')"/></id>
		                        <operator>Equals</operator>
		                        <list-attribute>CASEID</list-attribute>
		                        <range-operator/>
		                        <label>CASEID</label>
		                    </number-filter>			        	
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<number-filter>
		                        <id><xsl:value-of select="concat($tableName,'_KeyFilter')"/></id>
		                        <operator>Equals</operator>
		                        <list-attribute>KEYATTRIBUTE</list-attribute>
		                        <range-operator/>
		                        <label>KeyAttribute</label>
		                    </number-filter>			        	
				        </xsl:if>
	                    <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="filter-attributes"/>
	                </data-store-list-end-user-filters>
			    </datastore-list>
			</xsl:if>
		</xsl:if>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="create-datastore-list">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
		<xsl:variable name="isFirstTableOccurencecount" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName])=0"/>
		<xsl:if test="$isFirstTableOccurencecount">
			<xsl:variable name="tablePrimaryKey" select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true']/cas:property[cas:key='COLUMN_NAME']/cas:value"/>
			<xsl:variable name="tableHasCaseIdColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='COLUMN_NAME']/cas:value='CASEID' or cas:property[cas:key='COLUMN_NAME']/cas:value='caseid'  or cas:property[cas:key='COLUMN_NAME']/cas:value='CaseId' or cas:property[cas:key='COLUMN_NAME']/cas:value='FGOCaseId'])=1"/>
			<xsl:variable name="tableHasPrimaryKeyColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true']) &gt; 0"/>
			<xsl:variable name="nrOfPrimaryKeys" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true'])"/>
			
			
				<datastore-list>
			        <id><xsl:value-of select="concat('23455s23',concat($tableName,'_',$columnName))"/></id>
			        <label><xsl:value-of select="$tableName"/></label>
			        <permissions/>
			        <default-allowed>true</default-allowed>
			        <uri-part><xsl:value-of select="$tableName"/></uri-part>
			        <paging-enabled>true</paging-enabled>
			        <page-size>25</page-size>
			        <custom-page-size-enabled>true</custom-page-size-enabled>
			        <custom-page-sizes>10,25,50</custom-page-sizes>
			        <count-enabled>true</count-enabled>
			        <result-limit>500</result-limit>
			        <list-attributes>
			         	<xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
				        	<attribute>
				                <list-attribute-id>CASEID</list-attribute-id>
				                <visible>true</visible>
				                <visible-in-detail>true</visible-in-detail>
				                <end-user-sortable>true</end-user-sortable>
				                <layout-hint/>
				                <children/>
				            </attribute>
				        			        	
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<attribute>
				                <list-attribute-id>KEYATTRIBUTE</list-attribute-id>
				                <visible>true</visible>
				                <visible-in-detail>true</visible-in-detail>
				                <end-user-sortable>true</end-user-sortable>
				                <layout-hint/>
				                <children/>
				            </attribute>
				        	
				        </xsl:if>
			            <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="list-attributes"/>
			        </list-attributes>
			        <initial-sorting>
			            <xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
			            	<attribute-config>
				                <list-attribute-id><xsl:value-of select="concat($tableName,'_CaseId')"/></list-attribute-id>
				                <initial-sorting/>
				            </attribute-config>
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<attribute-config>
				                <list-attribute-id><xsl:value-of select="concat($tableName,'_Key')"/></list-attribute-id>
				                <initial-sorting/>
				            </attribute-config>
				        </xsl:if>
			        	<xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="initial-sorting-attributes"/>
			            
			        </initial-sorting>
			        <secure>false</secure>
			        <datastore-link><xsl:value-of select="concat('/Portaal AEOI/Reporting/Datastores/Database/Generated/',$tableName,'.bixml')"/></datastore-link>
			        <case-context-attribute-link/>
			        <display-one-result-in-table>true</display-one-result-in-table>
			        <check-permissions>true</check-permissions>
			        
			        <data-store-list-end-user-filters>
	                    <id><xsl:value-of select="concat('23434f3',concat($tableName,'_',$columnName))"/></id>
	                    <permissions/>
	                    <default-allowed>true</default-allowed>
	                    <xsl:if test="string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
				        	<number-filter>
		                        <id><xsl:value-of select="concat($tableName,'_CaseIdFilter')"/></id>
		                        <operator>Equals</operator>
		                        <list-attribute>CASEID</list-attribute>
		                        <range-operator/>
		                        <label>CASEID</label>
		                    </number-filter>			        	
				        </xsl:if>
				        <xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1">
				        	<number-filter>
		                        <id><xsl:value-of select="concat($tableName,'_KeyFilter')"/></id>
		                        <operator>Equals</operator>
		                        <list-attribute>KEYATTRIBUTE</list-attribute>
		                        <range-operator/>
		                        <label>KeyAttribute</label>
		                    </number-filter>				        	
				        </xsl:if>
	                    <xsl:apply-templates select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName]" mode="filter-attributes"/>
	                </data-store-list-end-user-filters>
			    </datastore-list>
			
		</xsl:if>
	</xsl:template>
	<xsl:template match="*" mode="starts-with-which-prefix">	
		<xsl:choose>
			<xsl:when test="starts-with(.,'CBC')">CBC</xsl:when>
			<xsl:when test="starts-with(.,'Aanvraag_')">Aanvraag_</xsl:when>
			<xsl:when test="starts-with(.,'QRTZ_')">QRTZ_</xsl:when>
			<xsl:when test="starts-with(.,'BI_')">BI_</xsl:when>
			<xsl:when test="starts-with(.,'ETR_')">ETR_</xsl:when>
			<xsl:when test="starts-with(.,'AU_')">AU_</xsl:when>
			<xsl:when test="starts-with(.,'CMF')">CMF</xsl:when>
			<xsl:when test="starts-with(.,'CSM_')">CSM_</xsl:when>
			<xsl:when test="starts-with(.,'BIS_')">BIS_</xsl:when>
			<xsl:when test="starts-with(.,'EXPORT_')">EXPORT_</xsl:when>
			<xsl:when test="starts-with(.,'EOIR_')">EOIR_</xsl:when>
			<xsl:when test="starts-with(.,'FATCA_')">FATCA_</xsl:when>
			<xsl:when test="starts-with(.,'FGO_')">FGO_</xsl:when>
			<xsl:when test="starts-with(.,'FRI_')">FRI_</xsl:when>
			<xsl:when test="starts-with(.,'DS_')">DS_</xsl:when>
			<xsl:when test="starts-with(.,'e_')">e_</xsl:when>
			<xsl:when test="starts-with(.,'GEBRUIKER')">GEBRUIKER</xsl:when>
			<xsl:when test="starts-with(.,'IMPORT_')">IMPORT_</xsl:when>
			<xsl:when test="starts-with(.,'report_')">report_</xsl:when>
			<xsl:when test="starts-with(.,'NTJ_')">NTJ_</xsl:when>
			<xsl:when test="starts-with(.,'UAV_')">UAV_</xsl:when>
			<xsl:when test="starts-with(.,'RE_')">RE_</xsl:when>
			<xsl:otherwise></xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	<xsl:template match="*" mode="starts-with-prefix">	
		<xsl:choose>
			<xsl:when test="starts-with(.,'CBC')">true</xsl:when>
			<xsl:when test="starts-with(.,'Aanvraag_')">true</xsl:when>
			<xsl:when test="starts-with(.,'QRTZ_')">true</xsl:when>
			<xsl:when test="starts-with(.,'BI_')">true</xsl:when>
			<xsl:when test="starts-with(.,'ETR_')">true</xsl:when>
			<xsl:when test="starts-with(.,'AU_')">true</xsl:when>
			<xsl:when test="starts-with(.,'CMF')">true</xsl:when>
			<xsl:when test="starts-with(.,'CSM_')">true</xsl:when>
			<xsl:when test="starts-with(.,'BIS_')">true</xsl:when>
			<xsl:when test="starts-with(.,'EXPORT_')">true</xsl:when>
			<xsl:when test="starts-with(.,'EOIR_')">true</xsl:when>
			<xsl:when test="starts-with(.,'FATCA_')">true</xsl:when>
			<xsl:when test="starts-with(.,'FGO_')">true</xsl:when>
			<xsl:when test="starts-with(.,'FRI_')">true</xsl:when>
			<xsl:when test="starts-with(.,'DS_')">true</xsl:when>
			<xsl:when test="starts-with(.,'e_')">true</xsl:when>
			<xsl:when test="starts-with(.,'GEBRUIKER')">true</xsl:when>
			<xsl:when test="starts-with(.,'IMPORT_')">true</xsl:when>
			<xsl:when test="starts-with(.,'report_')">true</xsl:when>
			<xsl:when test="starts-with(.,'NTJ_')">true</xsl:when>
			<xsl:when test="starts-with(.,'UAV_')">true</xsl:when>
			<xsl:when test="starts-with(.,'RE_')">true</xsl:when>
			<xsl:otherwise>false</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="list-attributes">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<attribute>
                <list-attribute-id><xsl:value-of select="$columnName"/></list-attribute-id>
                <visible>true</visible>
                <visible-in-detail>true</visible-in-detail>
                <end-user-sortable>true</end-user-sortable>
                <layout-hint/>
                <children/>
            </attribute>
	</xsl:template>
	<xsl:template match="cas:dataset" mode="initial-sorting-attributes">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
			<attribute-config>
                <list-attribute-id><xsl:value-of select="$columnName"/></list-attribute-id>
                <initial-sorting/>
            </attribute-config>
	</xsl:template>
	
	<xsl:template match="cas:dataset" mode="filter-attributes">
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
		<xsl:variable name="isPrimaryKey" select="cas:property[cas:key='IsPrimaryKey']/cas:value"/>
		<xsl:variable name="dataType" select="cas:property[cas:key='DATA_TYPE']/cas:value"/>
		<xsl:variable name="id" select="concat('34567344',concat($tableName,'_',$columnName))"/>
		<xsl:choose>
		
			<xsl:when test="$columnName='Deleted' or $columnName='DELETED' or $columnName='deleted'">		
                   <choice-filter>
                       <id><xsl:value-of select="concat($tableName,'_',$columnName)"/></id>
                       <operator>ContainsAnyValueOf</operator>
                       <list-attribute><xsl:value-of select="$columnName"/></list-attribute>
                       <label><xsl:value-of select="$columnName"/></label>
                       <choice-type>checkbox</choice-type>
                       <choice-sorting>BY_LABEL</choice-sorting>
                       <multi-choice>true</multi-choice>
                       <render-facet-data-count>false</render-facet-data-count>
                   </choice-filter>				
			</xsl:when>
			<xsl:when test="$dataType='int' or $dataType='numeric' or $dataType='bigint' or $dataType='tinyint'">		
                    <number-filter>
                        <id><xsl:value-of select="concat($tableName,'_',$columnName)"/></id>
                        <operator>Equals</operator>
                        <list-attribute><xsl:value-of select="$columnName"/></list-attribute>
                        <range-operator/>
                        <label><xsl:value-of select="$columnName"/></label>
                    </number-filter>				
			</xsl:when>
			
			
			<xsl:otherwise>
				<string-filter>
                        <id><xsl:value-of select="concat('453s345s',concat($tableName,'_',$columnName))"/></id>
                        <operator>Contains</operator>
                        <list-attribute><xsl:value-of select="$columnName"/></list-attribute>
                        <label><xsl:value-of select="$columnName"/></label>
                        <allow-wildcard-characters>false</allow-wildcard-characters>
                    </string-filter>					
			</xsl:otherwise>
		</xsl:choose>
				        
        

	</xsl:template>
	
</xsl:stylesheet>