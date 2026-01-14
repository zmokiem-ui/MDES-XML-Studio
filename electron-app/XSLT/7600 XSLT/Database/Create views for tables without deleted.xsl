<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:cas="http://schemas.beinformed.nl/beinformed/v3/services/caseservice"

exclude-result-prefixes="cas bi knowledge cmf iso case form report search assistant today dataeditor attributes usermanagement subscriptionmanagement organisationmanagement serviceapplication">

<xsl:output method="text" omit-xml-declaration="yes" indent="no"/>
	<xsl:template match="/">
		
			<xsl:apply-templates select="//cas:dataset"/>
			
		
	</xsl:template>
	
	
	
	<xsl:template match="cas:dataset">
		<xsl:variable name="tableName" select="cas:property[cas:key='TABLE_NAME']/cas:value"/>
		<xsl:variable name="columnName" select="cas:property[cas:key='COLUMN_NAME']/cas:value"/>
		
		<xsl:variable name="isFirstTableOccurencecount" select="count(./preceding-sibling::cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName])=0"/>
		<xsl:if test="$isFirstTableOccurencecount">
			<xsl:variable name="tableHasDeletedColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='COLUMN_NAME']/cas:value='DELETED' or cas:property[cas:key='COLUMN_NAME']/cas:value='deleted'  or cas:property[cas:key='COLUMN_NAME']/cas:value='Deleted'])=1"/>
			<xsl:variable name="nrOfPrimaryKeys" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true'])"/> 
			<xsl:variable name="tablePrimaryKey" select="//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true']/cas:property[cas:key='COLUMN_NAME']/cas:value"/>
			<xsl:variable name="tableHasCaseIdColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='COLUMN_NAME']/cas:value='CASEID' or cas:property[cas:key='COLUMN_NAME']/cas:value='caseid'  or cas:property[cas:key='COLUMN_NAME']/cas:value='CaseId' or cas:property[cas:key='COLUMN_NAME']/cas:value='FGOCaseId'])=1"/>
			<xsl:variable name="tableHasPrimaryKeyColumn" select="count(//cas:dataset[cas:property[cas:key='TABLE_NAME']/cas:value=$tableName][cas:property[cas:key='IsPrimaryKey']/cas:value='true']) &gt; 0"/>
			<xsl:choose>
			
			<xsl:when test="$isFirstTableOccurencecount and (not($tableHasDeletedColumn) or $nrOfPrimaryKeys &gt; 1 or not($tableHasPrimaryKeyColumn))">
				IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[generated_vw_<xsl:value-of select="$tableName"/>]'))
				BEGIN
				    DROP VIEW [dbo].[vw_<xsl:value-of select="$tableName"/>]
				END
				GO
				IF EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[<xsl:value-of select="$tableName"/>]'))
				BEGIN
				exec('CREATE VIEW [dbo].[generated_vw_<xsl:value-of select="$tableName"/>] AS 
				select 
				<xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1"> ROW_NUMBER() OVER (ORDER BY <xsl:choose><xsl:when test="$columnName='BLOB_DATA' or $columnName='CALENDAR'">sched_name</xsl:when><xsl:otherwise><xsl:value-of select="$columnName"/></xsl:otherwise></xsl:choose>) AS keyattribute,</xsl:if>
				<xsl:if test="not($tableHasDeletedColumn)"> 0 AS DELETED,</xsl:if>
				 * from <xsl:value-of select="$tableName"/>')
				 END
				GO
				
			</xsl:when>
			<xsl:when test="$isFirstTableOccurencecount and string-length(substring-before($tablePrimaryKey, 'RECORDID')) &gt; 0 and not($tableHasCaseIdColumn)">
				IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'[dbo].[generated_vw_<xsl:value-of select="$tableName"/>]'))
				BEGIN
				    DROP VIEW [dbo].[vw_<xsl:value-of select="$tableName"/>]
				END
				GO
				IF EXISTS (SELECT * FROM sys.tables WHERE object_id = OBJECT_ID(N'[dbo].[<xsl:value-of select="$tableName"/>]'))
				BEGIN
				
				exec('CREATE VIEW [dbo].[generated_vw_<xsl:value-of select="$tableName"/>] AS 
				select 
				cmfrecord.CASEID,
				<xsl:if test="not($tableHasPrimaryKeyColumn) or $nrOfPrimaryKeys &gt; 1"> ROW_NUMBER() OVER (ORDER BY <xsl:choose><xsl:when test="$columnName='BLOB_DATA' or $columnName='CALENDAR'">sched_name</xsl:when><xsl:otherwise><xsl:value-of select="$columnName"/></xsl:otherwise></xsl:choose>) AS keyattribute,</xsl:if>
				<xsl:if test="not($tableHasDeletedColumn)"> 0 AS DELETED,</xsl:if>
				 <xsl:value-of select="concat($tableName,'.*')"/> from <xsl:value-of select="$tableName"/>
				 inner join cmfrecord on cmfrecord.id=<xsl:value-of select="concat($tableName,'.',$tablePrimaryKey)"/>')
				 END
				GO
			</xsl:when>
			</xsl:choose>
		</xsl:if>
	</xsl:template>
	
</xsl:stylesheet>