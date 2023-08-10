
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 09/22/22
-- Description: Initialize taxon_rank using level_id's in taxonomy_toc.
-- Updated: 
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.initializeTaxonRanks') IS NOT NULL
	DROP PROCEDURE dbo.initializeTaxonRanks
GO

CREATE PROCEDURE dbo.initializeTaxonRanks
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

    DECLARE @treeID AS INT

    DECLARE tree_cursor CURSOR FOR
            
        -- Get all tree IDs from taxonomy_toc.
        SELECT DISTINCT tree_id 
        FROM v_taxonomy_toc 
        WHERE msl_release_num IS NOT NULL
        AND tree_id NOT IN (
            SELECT tree_id
            FROM taxon_rank
        )

    OPEN tree_cursor  
    FETCH NEXT FROM tree_cursor INTO @treeID

    WHILE @@FETCH_STATUS = 0  
    BEGIN

        -- Create a record for every taxonomy level associated with this tree ID (MSL release).
        INSERT INTO taxon_rank (
            level_id,
            rank_index,
            rank_name,
            tree_id
        )
        SELECT 
            level_id,
            ROW_NUMBER() OVER(ORDER BY level_id ASC) - 1 AS rank_index,
            name as rank_name,
            @treeID as tree_id
        
        FROM (
            SELECT DISTINCT tn.level_id
            FROM v_taxonomy_node tn
            WHERE tn.tree_id = @treeID
        ) levels
        JOIN v_taxonomy_level tl ON tl.id = levels.level_id
        ORDER BY levels.level_id

        FETCH NEXT FROM tree_cursor INTO @treeID
    END 

    CLOSE tree_cursor  
    DEALLOCATE tree_cursor 

END

