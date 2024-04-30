
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 09/22/22
-- Description: Create intermediate and parent ghost nodes.
-- Updated: 03/09/23 dmd: Added species rank index parameter to pass to createIntermediateGhostNodes.
--          04/25/24 dmd: Renaming taxon_json to taxonomy_json.
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.createGhostNodes') IS NOT NULL
	DROP PROCEDURE dbo.createGhostNodes
GO

CREATE PROCEDURE dbo.createGhostNodes
   @speciesRankIndex AS INT,
	@treeID AS INT

AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

	-- A constant error code to use when throwing exceptions.
	DECLARE @errorCode AS INT = 50000

	BEGIN TRY

		--==========================================================================================================
		-- Create parent ghost nodes
		--==========================================================================================================
		EXEC dbo.createParentGhostNodes @treeID = @treeID


		-- Variables used by taxon_cursor
		DECLARE @childCounts AS NVARCHAR(1000)
		DECLARE @id AS INT
		DECLARE @rankIndex AS INT
		DECLARE @taxNodeID AS INT

		--==========================================================================================================
		-- Declare a cursor for all non-ghost taxa above "species".
		--==========================================================================================================
		DECLARE taxon_cursor CURSOR FOR 

			SELECT 
				child_counts,
				id,
				rank_index,
				taxnode_id

			FROM taxonomy_json tj
			WHERE tj.tree_id = @treeID
			AND tj.is_ghost_node = 0
			AND tj.rank_index < @speciesRankIndex
			AND tj.taxnode_id <> @treeID
			ORDER BY tj.rank_index ASC
		
		OPEN taxon_cursor  
		FETCH NEXT FROM taxon_cursor INTO @childCounts, @id, @rankIndex, @taxNodeID

		WHILE @@FETCH_STATUS = 0  
		BEGIN

			--==========================================================================================================
			-- Create intermediate ghost nodes for this taxon (if necessary).
			--==========================================================================================================
			EXEC dbo.createIntermediateGhostNodes
				@childCounts = @childCounts,
				@parentID = @id,
				@parentRankIndex = @rankIndex,
				@parentTaxnodeID = @taxNodeID,
            @speciesRankIndex = @speciesRankIndex,
				@treeID = @treeID

			FETCH NEXT FROM taxon_cursor INTO @childCounts, @id, @rankIndex, @taxNodeID
		END 

		CLOSE taxon_cursor  
		DEALLOCATE taxon_cursor 
		
	END TRY
	BEGIN CATCH
		DECLARE @errorMsg AS VARCHAR(200) = ERROR_MESSAGE()
		RAISERROR(@errorMsg, 18, 1)
	END CATCH 
END
