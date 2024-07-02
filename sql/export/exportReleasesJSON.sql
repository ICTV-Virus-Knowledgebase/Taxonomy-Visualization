SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 04/17/24
-- Description: Export MSL release data as JSON for the visual taxonomy browser.
-- Updated: 05/08/24 dmd: Replacing ".5" years with the taxonomy_node.name for the tree ID, removing "r" 
--						  from release names.
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.exportReleasesJSON') IS NOT NULL
	DROP PROCEDURE dbo.exportReleasesJSON
GO

CREATE PROCEDURE dbo.exportReleasesJSON
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON


	DECLARE @dataJSON AS VARCHAR(MAX) = ''
	DECLARE @displayOrderJSON AS VARCHAR(MAX) = ''
	DECLARE @json AS VARCHAR(MAX) = ''
	DECLARE @mslReleaseNum AS INT
	DECLARE @rankCount AS INT
	DECLARE @yearAB AS VARCHAR(10)
	
	-- Get the taxonomy level (rank) for "tree".
	DECLARE @treeLevelID AS INT = (
		SELECT TOP 1 id
		FROM taxonomy_level
		WHERE name = 'tree'
	)
   
	--==========================================================================================================
	-- Create a cursor to iterate over the MSL release data.
	--==========================================================================================================
	DECLARE releaseCursor CURSOR FOR 

		SELECT 
			toc.msl_release_num,
			rankCount = (
				SELECT COUNT(DISTINCT tnRank.level_id)
				FROM taxonomy_node tnRank
				WHERE tnRank.tree_id = toc.tree_id
				AND tnRank.level_id <> @treeLevelID
			),
			yearAB = tn.name

		FROM taxonomy_toc toc
		JOIN taxonomy_node tn ON tn.taxnode_id = toc.tree_id
		WHERE toc.msl_release_num IS NOT NULL
		ORDER BY toc.msl_release_num DESC
		
	OPEN releaseCursor  
	FETCH NEXT FROM releaseCursor INTO @mslReleaseNum, @rankCount, @yearAB

	WHILE @@FETCH_STATUS = 0  
	BEGIN
		--==========================================================================================================
		-- Add this release to the data JSON fragment.
		--==========================================================================================================
		SET @dataJSON = @dataJSON + 
			'"'+@yearAB+'": { '+
         '"year": "'+@yearAB+'", '+
         '"rankCount": '+CAST(@rankCount AS VARCHAR(3))+', '+
         '"releaseNum": '+CAST(@mslReleaseNum AS VARCHAR(3))+'},'

		--==========================================================================================================
		-- Add this release to the display order JSON fragment.
		--==========================================================================================================
		SET @displayOrderJSON = @displayOrderJSON + '"'+@yearAB+'",'

		FETCH NEXT FROM releaseCursor INTO @mslReleaseNum, @rankCount, @yearAB
	END 

	CLOSE releaseCursor  
	DEALLOCATE releaseCursor 

	--==========================================================================================================
	-- Assemble the final JSON from the data and display order fragments.
	--==========================================================================================================
	SET @json = '{ "data": {'+
		LEFT(@dataJSON, LEN(@dataJSON) - 1)+
		'}, "displayOrder": ['+
		LEFT(@displayOrderJSON, LEN(@displayOrderJSON) - 1)+
	']}'

	--==========================================================================================================
	-- Return the JSON
	--==========================================================================================================
	SELECT @json

END