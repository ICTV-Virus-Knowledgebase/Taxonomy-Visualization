
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ==========================================================================================================
-- Author: don dempsey
-- Created on: 09/21/22
-- Description: Initialize the taxonomy_json table from the ICTV taxonomy_node table.
-- Updated: 07/19/23 dmd: Replaced specific references to an ICTVonline* db with views.
--          04/03/24 dmd: Replacing hard-coded level ID for species, retrieving the rank index for genus,
--                        species nodes are now being populated with valid json_lineage and parent_id,
--                        non-species nodes that have immediate species node children now have valid 
--                        species_json.
--          04/25/24 dmd: Renaming taxon_json to taxonomy_json, replacing views with ICTV tables,
--                        renaming taxon_rank to taxonomy_json_rank.
-- ==========================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.initializeTaxonomyJsonFromTaxonomyNode') IS NOT NULL
	DROP PROCEDURE dbo.initializeTaxonomyJsonFromTaxonomyNode
GO

CREATE PROCEDURE dbo.initializeTaxonomyJsonFromTaxonomyNode
   @speciesRankIndex AS INT,
	@treeID AS INT
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

   -- A constant error code to use when throwing exceptions.
	DECLARE @errorCode AS INT = 50000

   BEGIN TRY

      -- Get the species level_id from taxonomy_level.
      DECLARE @speciesLevelID AS INT = (SELECT TOP 1 id FROM taxonomy_level WHERE name = 'species')
      IF @speciesLevelID IS NULL THROW @errorCode, 'Invalid level_id for species', 1   

      -- Get the rank_index for genus.
      DECLARE @genusRankIndex AS INT = (
         SELECT TOP 1 rank_index 
         FROM taxonomy_json_rank 
         WHERE tree_id = @treeID
         AND rank_name = 'genus'
      )
      IF @genusRankIndex IS NULL THROW @errorCode, 'Invalid rank index for genus', 1   


      -- Add taxonomy node records to the taxon JSON table.
      INSERT INTO taxonomy_json (
         child_counts,
         child_json,
         has_species,
         is_ghost_node,
         [json],
         parent_distance,
         parent_id,
         parent_taxnode_id,
         rank_index,
         [source],
         species_json,
         taxnode_id,
         tree_id
      )
      SELECT
         ISNULL(child_counts, ''),
         child_json = NULL,
         has_species,
         is_ghost_node = 0,
         [json] = NULL,
         parent_distance = rank_index - ISNULL(parent_rank_index, 0),
         parent_id = NULL,
         parent_taxnode_id,
         rank_index,
         'T',
         species_json = NULL,
         taxnode_id,
         tree_id

      FROM (
         SELECT 
            child_counts = tn.taxa_desc_cts,
            has_species = CASE
               WHEN 0 < (
                  SELECT COUNT(*)
                  FROM taxonomy_node species
                  WHERE species.parent_id = tn.taxnode_id
                  AND species.level_id = @speciesLevelID
                  AND species.tree_id = @treeID
               ) THEN 1 ELSE 0
            END,
            parent_rank_index = parentRank.rank_index,
            parent_taxnode_id = tn.parent_id,
            rank_index = tr.rank_index,
            tn.taxnode_id,
            tn.tree_id

         FROM taxonomy_node tn
         JOIN taxonomy_json_rank tr ON (
            tr.level_id = tn.level_id
            AND tr.tree_id = @treeID
         )
         LEFT JOIN taxonomy_node parentTN ON (
            parentTN.taxnode_id = tn.parent_id
            AND parentTN.tree_id = @treeID
         )
         LEFT JOIN taxonomy_json_rank parentRank ON (
            parentRank.level_id = parentTN.level_id
            AND parentRank.tree_id = @treeID
         )
         WHERE tn.tree_id = @treeID
      ) taxa


      -- Populate taxonomy_json parent_id for 1) child nodes with parent nodes that are 
      -- one rank above (otherwise, the parent is a ghost node), and 2) child species
      -- nodes whose parent has species nodes as immediate children.
      UPDATE tj
      SET tj.parent_id = parent_tj.id
      FROM taxonomy_json tj
      JOIN taxonomy_json parent_tj ON (
         parent_tj.taxnode_id = tj.parent_taxnode_id
         AND (
            -- The child is directly beneath the parent (no intervening ghost nodes).
            parent_tj.rank_index = tj.rank_index - 1

            -- Or the child is a species and the parent has species nodes as immediate children.
            OR (parent_tj.has_species = 1 AND tj.rank_index = @speciesRankIndex)
         )
         AND parent_tj.id <> tj.id
         AND parent_tj.tree_id = tj.tree_id
         
      )
      WHERE tj.tree_id = @treeID
      AND tj.is_ghost_node = 0
      AND parent_tj.is_ghost_node = 0


      -- Populate the parent ID of all species whose parent has a rank index less than "genus".
      UPDATE species
      SET species.parent_id = parent.id
      FROM taxonomy_json species
      JOIN taxonomy_json parent ON parent.taxnode_id = species.parent_taxnode_id
      WHERE species.rank_index = @speciesRankIndex
      AND parent.rank_index < @genusRankIndex
      AND species.tree_id = @treeID
      AND parent.tree_id = @treeID

   END TRY
	BEGIN CATCH
		DECLARE @errorMsg AS VARCHAR(200) = ERROR_MESSAGE()
		RAISERROR(@errorMsg, 18, 1)
	END CATCH 
END
