
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ==========================================================================================================
-- Author: don dempsey
-- Created on: 07/19/23
-- Description: Initialize the taxon_json.json_lineage column
-- Updated: 
-- ==========================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.initializeJsonLineageColumn') IS NOT NULL
	DROP PROCEDURE dbo.initializeJsonLineageColumn
GO

CREATE PROCEDURE dbo.initializeJsonLineageColumn
    @treeID AS INT
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

	-- Variables used by ranked_node_cursor
	DECLARE @id AS INT
	DECLARE @parentLineage AS NVARCHAR(MAX)
	
	--==========================================================================================================
	-- Iterate over every node one rank at a time from realm down to species.
	--==========================================================================================================
	DECLARE ranked_node_cursor CURSOR FOR
		
		SELECT 
			tj.id,
			ptj.json_lineage AS parent_lineage

		FROM taxon_json tj
		LEFT JOIN taxon_json ptj ON ptj.id = tj.parent_id
		WHERE tj.tree_id = @treeID
		ORDER BY tj.rank_index ASC

	OPEN ranked_node_cursor  
	FETCH NEXT FROM ranked_node_cursor INTO @id, @parentLineage

	WHILE @@FETCH_STATUS = 0  
	BEGIN

		IF @parentLineage IS NULL OR @parentLineage = ''
			SET @parentLineage = ''
		ELSE
			SET @parentLineage = @parentLineage+','

		-- Populate the node's JSON lineage with its parent lineage and it's own ID.
		UPDATE taxon_json SET
		json_lineage = @parentLineage+CAST(@id AS VARCHAR(12))
		WHERE id = @id

		FETCH NEXT FROM ranked_node_cursor INTO @id, @parentLineage
	END 

	CLOSE ranked_node_cursor  
	DEALLOCATE ranked_node_cursor 

END