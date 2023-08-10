
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 07/27/23
-- Description: Create views in ICTV_API that reference tables in the current ICTVonline database.
-- Updated: 
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.createIctvOnlineViews') IS NOT NULL
	DROP PROCEDURE dbo.createIctvOnlineViews
GO

CREATE PROCEDURE dbo.createIctvOnlineViews
	@ictvOnlineDbName AS VARCHAR(50)

AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

	DECLARE @sqlCommand AS NVARCHAR(1000)
	
	
	--==========================================================================================================
	-- The taxonomy_level table
	--==========================================================================================================
	IF OBJECT_ID('dbo.v_taxonomy_level') IS NOT NULL 
		DROP VIEW dbo.v_taxonomy_level

	SET @sqlCommand = 'CREATE VIEW dbo.v_taxonomy_level AS SELECT * FROM ['+@ictvOnlineDbName+'].dbo.taxonomy_level'
	EXECUTE sp_executesql @sqlCommand

	--==========================================================================================================
	-- The taxonomy_node table
	--==========================================================================================================
	IF OBJECT_ID('dbo.v_taxonomy_node') IS NOT NULL
		DROP VIEW dbo.v_taxonomy_node

	SET @sqlCommand = 'CREATE VIEW dbo.v_taxonomy_node AS SELECT * FROM ['+@ictvOnlineDbName+'].dbo.taxonomy_node'
	EXECUTE sp_executesql @sqlCommand

	--==========================================================================================================
	-- The taxonomy_toc table
	--==========================================================================================================
	IF OBJECT_ID('dbo.v_taxonomy_toc') IS NOT NULL
		DROP VIEW dbo.v_taxonomy_toc

	SET @sqlCommand = 'CREATE VIEW dbo.v_taxonomy_toc AS SELECT * FROM ['+@ictvOnlineDbName+'].dbo.taxonomy_toc'
	EXECUTE sp_executesql @sqlCommand

END