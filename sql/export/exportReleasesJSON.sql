SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 04/17/24
-- Description: Export MSL release data as JSON for the visual taxonomy browser.
-- Updated:
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
	DECLARE @yearPoint5 AS VARCHAR(10)
	
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
			msl_release_num,
			rankCount,
			yearAB = CASE
				WHEN releasesInYear > 1 AND a_or_b = '0' THEN release_year+'a'
				WHEN releasesInYear > 1 AND a_or_b = '5' THEN release_year+'b'
				ELSE release_year
			END
		FROM (
			SELECT 
				RIGHT(LEFT(toc.tree_id, 5), 1) AS a_or_b,
				toc.msl_release_num,
				rankCount = (
					SELECT COUNT(DISTINCT tn.level_id)
					FROM taxonomy_node tn
					WHERE tn.tree_id = toc.tree_id
					AND tn.level_id <> @treeLevelID
				),
				LEFT(toc.tree_id, 4) AS release_year,
				releasesInYear = (
					SELECT COUNT(*)
					FROM taxonomy_toc countTOC
					WHERE countTOC.msl_release_num IS NOT NULL
					AND LEFT(countTOC.tree_id, 4) = LEFT(toc.tree_id, 4) 
				)
			FROM taxonomy_toc toc
			WHERE toc.msl_release_num IS NOT NULL
		) releases
		ORDER BY msl_release_num DESC
		
	OPEN releaseCursor  
	FETCH NEXT FROM releaseCursor INTO @mslReleaseNum, @rankCount, @yearAB

	WHILE @@FETCH_STATUS = 0  
	BEGIN
		--==========================================================================================================
		-- Add this release to the data JSON fragment.
		--==========================================================================================================
		SET @dataJSON = @dataJSON + 
			'"r'+@yearAB+'": { '+
				'"year": "'+@yearAB+'", '+
				'"rankCount": '+CAST(@rankCount AS VARCHAR(3))+', '+
				'"releaseNum": '+CAST(@mslReleaseNum AS VARCHAR(3))+'},'

		--==========================================================================================================
		-- Add this release to the display order JSON fragment.
		--==========================================================================================================
		SET @displayOrderJSON = @displayOrderJSON + '"r'+@yearAB+'",'

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