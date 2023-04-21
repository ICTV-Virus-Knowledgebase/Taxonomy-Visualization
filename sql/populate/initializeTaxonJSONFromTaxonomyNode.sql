
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ==========================================================================================================
-- Author: don dempsey
-- Created on: 09/21/22
-- Description: Initialize the taxon_json table from the ICTV taxonomy_node table.
-- Updated: 
-- ==========================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.initializeTaxonJSONFromTaxonomyNode') IS NOT NULL
	DROP PROCEDURE dbo.initializeTaxonJSONFromTaxonomyNode
GO

CREATE PROCEDURE dbo.initializeTaxonJSONFromTaxonomyNode
    @speciesRankIndex AS INT,
	@treeID AS INT
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

	-- Delete any existing records for this tree ID.
	--DELETE FROM taxon_json WHERE tree_id = @treeID

	-- Add taxonomy node records to the taxon JSON table.
	INSERT INTO taxon_json (
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
					FROM [ICTVonline38].dbo.taxonomy_node species
					WHERE species.parent_id = tn.taxnode_id
					AND species.level_id = 600
					AND species.tree_id = @treeID
				) THEN 1 ELSE 0
			END,
			parent_rank_index = ptr.rank_index,
			parent_taxnode_id = tn.parent_id,
			rank_index = tr.rank_index,
			tn.taxnode_id,
			tn.tree_id

		FROM [ICTVonline38].dbo.taxonomy_node tn
		JOIN taxon_rank tr ON (
			tr.level_id = tn.level_id
			AND tr.tree_id = @treeID
		)
		LEFT JOIN [ICTVonline38].dbo.taxonomy_node ptn ON (
			ptn.taxnode_id = tn.parent_id
			AND ptn.tree_id = @treeID
		)
		LEFT JOIN taxon_rank ptr ON (
			ptr.level_id = ptn.level_id
			AND ptr.tree_id = @treeID
		)
		WHERE tn.tree_id = @treeID
	) taxa


	-- Populate parent taxon_json IDs for child nodes with parent nodes that are one rank above.
	UPDATE tj
	SET tj.parent_id = parent_tj.id
	FROM taxon_json tj
	JOIN taxon_json parent_tj ON (
		parent_tj.taxnode_id = tj.parent_taxnode_id
		AND parent_tj.rank_index = tj.rank_index - 1
		AND parent_tj.id <> tj.id
		AND parent_tj.tree_id = tj.tree_id
	)


    -- dmd 031423
    -- Populate the parent ID of all species whose parent has a rank index of at 
    -- least 2 less than the species rank index.
    UPDATE species
    SET species.parent_id = parent.id
    FROM taxon_json species
    JOIN taxon_json parent ON parent.taxnode_id = species.parent_taxnode_id
    WHERE species.rank_index = @speciesRankIndex
    AND parent.rank_index < (@speciesRankIndex - 1)
END
