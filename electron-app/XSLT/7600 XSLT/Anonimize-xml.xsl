<?xml version="1.0" encoding="UTF-8"?>
<!-- XML-base template -->

<xsl:stylesheet version="1.0" 
				xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
				xmlns:sfa_ftc="urn:oecd:ties:fatcacrstypes:v2"
				xmlns:sfa="urn:oecd:ties:stffatcatypes:v2"
				>
	
	
	<xsl:template match="@*|node()">
		<xsl:copy>
			<xsl:apply-templates select="@*|node()"/>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="sfa_ftc:TIN[count(ancestor::sfa_ftc:ReportingFI) = 0]">
		<xsl:element name="{name()}">
			<xsl:attribute name="issuedBy">NL</xsl:attribute>
			<xsl:text>123456789</xsl:text>
		</xsl:element>		
	</xsl:template>	
	
	<xsl:template match="sfa:AddressFree">
		<xsl:element name="{name()}">AddressFree</xsl:element>		
	</xsl:template>
	<xsl:template match="sfa:FirstName">
		<xsl:element name="{name()}">Firstname</xsl:element>		
	</xsl:template>
	<xsl:template match="sfa_ftc:Name[count(ancestor::sfa_ftc:Organisation) &gt; 0]">
		<xsl:element name="{name()}">
		<xsl:attribute name="nameType">OECD207</xsl:attribute>
		<xsl:text>Just a name</xsl:text>
		</xsl:element>		
	</xsl:template>
	<xsl:template match="sfa:LastName">
		<xsl:element name="{name()}">Lastname</xsl:element>		
	</xsl:template>
	<xsl:template match="sfa:AccountNumber">
		<xsl:element name="{name()}">12345780</xsl:element>		
	</xsl:template>	 
	
	<xsl:template match="sfa_ftc:PaymentAmnt">
		<xsl:element name="{name()}">
		<xsl:attribute name="currCode">USD</xsl:attribute>
		<xsl:text>10</xsl:text></xsl:element>		
	</xsl:template>	 
	<xsl:template match="sfa_ftc:AccountBalance">
		<xsl:element name="{name()}">
		<xsl:attribute name="currCode">USD</xsl:attribute>
			<xsl:text>10</xsl:text></xsl:element>		
	</xsl:template>
</xsl:stylesheet>