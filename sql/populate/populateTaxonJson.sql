
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 09/22/22
-- Description: Initialize taxon_json from taxonomy_node, create ghost nodes, and initialize JSON for this tree ID.
-- Updated: 
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.populateTaxonJSON') IS NOT NULL
	DROP PROCEDURE dbo.populateTaxonJSON
GO

CREATE PROCEDURE dbo.populateTaxonJSON
	@treeID AS INT

AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

   -- A constant error code to use when throwing exceptions.
	DECLARE @errorCode AS INT = 50000

	-- Delete any existing nodes associated with the tree ID.
	DELETE FROM taxon_json WHERE tree_id = @treeID

   BEGIN TRY

      --==========================================================================================================
      -- Get the rank index of "species".
      --==========================================================================================================
      DECLARE @speciesRankIndex AS INT = (
         SELECT TOP 1 rank_index
         FROM taxon_rank
         WHERE rank_name = 'species'
         AND tree_id = @treeID
      )
      IF @speciesRankIndex IS NULL THROW @errorCode, 'Invalid species rank index', 1

      --==========================================================================================================
      -- Create taxon_json records for all taxonomy nodes with the specified tree ID. After all have been created, 
      -- populate the parent ID column for these records.
      --==========================================================================================================
      EXEC dbo.initializeTaxonJSONFromTaxonomyNode
         @speciesRankIndex = @speciesRankIndex,
         @treeID = @treeID

      --==========================================================================================================
      -- Create intermediate and parent ghost (hidden/unassigned) nodes.
      --==========================================================================================================
      EXEC dbo.createGhostNodes 
         @speciesRankIndex = @speciesRankIndex,
         @treeID = @treeID

      --==========================================================================================================
      -- Populate the "has_assigned_siblings" and "has_unassigned_siblings" columns.
      --==========================================================================================================
      UPDATE tj
      SET has_assigned_siblings = CASE
         WHEN 0 = (
            SELECT COUNT(*)
            FROM taxon_json assigned
            WHERE assigned.parent_id = tj.parent_id
            AND assigned.is_ghost_node = 0
            AND assigned.id <> tj.id
            AND assigned.rank_index = tj.rank_index
         ) THEN 0 ELSE 1
      END,
      has_unassigned_siblings = CASE
         WHEN 0 = (
            SELECT COUNT(*)
            FROM taxon_json unassigned
            WHERE unassigned.parent_id = tj.parent_id
            AND unassigned.is_ghost_node = 1
            AND unassigned.id <> tj.id
            AND unassigned.rank_index = tj.rank_index
         ) THEN 0 ELSE 1
      END
      FROM taxon_json tj
      WHERE tj.tree_id = @treeID

      --==========================================================================================================
      -- Populate the "has species" column for all ghost nodes.
      --==========================================================================================================
      UPDATE ghostNode
      SET has_species = CASE
         WHEN 0 < (
            -- The number of species that are immediate children of the ghost node.
            SELECT COUNT(*)
            FROM taxon_json ctj
            WHERE ctj.parent_id = ghostNode.id
            AND ctj.rank_index = @speciesRankIndex
            AND ctj.tree_id = @treeID
         ) THEN 1 ELSE 0
      END
      FROM taxon_json ghostNode
      WHERE ghostNode.tree_id = @treeID
      AND ghostNode.is_ghost_node = 1

      --==========================================================================================================
      -- Populate the JSON lineage column from the top to the bottom of the tree.
      --==========================================================================================================
      EXEC dbo.initializeJsonLineageColumn 
         @treeID = @treeID

      --==========================================================================================================
      -- Populate the JSON column from the bottom to the top of the tree.
      --==========================================================================================================
      EXEC dbo.initializeJsonColumn
         @speciesRankIndex = @speciesRankIndex,
         @treeID = @treeID

      /*
      Use this when exporting JSON (this example uses a tree ID of 202100000):

         DECLARE @treeID AS INT = 202100000 -- (example tree ID)
         EXEC dbo.exportNonSpeciesTaxonomyJSON @treeID = @treeID
         EXEC dbo.exportSpeciesTaxonomyJSON @treeID = @treeID
      */

   END TRY
	BEGIN CATCH
		DECLARE @errorMsg AS VARCHAR(200) = ERROR_MESSAGE()
		RAISERROR(@errorMsg, 18, 1)
	END CATCH 
END
