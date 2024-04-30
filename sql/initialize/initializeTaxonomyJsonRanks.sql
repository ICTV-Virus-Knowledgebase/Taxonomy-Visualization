
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 09/22/22
-- Description: Initialize taxon_rank using level_id's in taxonomy_toc.
-- Updated: 04/03/24 dmd: Added a delete statement to clear taxon_rank before repopulating it.
--          04/25/24 dmd: Now using ICTVonline table names instead of view names, renamed from initializeTaxonRanks.
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.initializeTaxonomyJsonRanks') IS NOT NULL
	DROP PROCEDURE dbo.initializeTaxonomyJsonRanks
GO

CREATE PROCEDURE dbo.initializeTaxonomyJsonRanks
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

   DECLARE @treeID AS INT

   -- Delete all existing records.
   DELETE FROM taxonomy_json_rank


   -- Create a cursor over every entry in taxonomy_toc.
   DECLARE tree_cursor CURSOR FOR
         
      -- Get all tree IDs from taxonomy_toc.
      SELECT DISTINCT tree_id 
      FROM taxonomy_toc 
      WHERE msl_release_num IS NOT NULL
      AND tree_id NOT IN (
         SELECT tree_id
         FROM taxonomy_json_rank
      )

   OPEN tree_cursor  
   FETCH NEXT FROM tree_cursor INTO @treeID

   WHILE @@FETCH_STATUS = 0  
   BEGIN

      -- Create a record for every taxonomy level associated with this tree ID (MSL release).
      INSERT INTO taxonomy_json_rank (
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
         FROM taxonomy_node tn
         WHERE tn.tree_id = @treeID
      ) levels
      JOIN taxonomy_level tl ON tl.id = levels.level_id
      ORDER BY levels.level_id

      FETCH NEXT FROM tree_cursor INTO @treeID
   END 

   CLOSE tree_cursor  
   DEALLOCATE tree_cursor 

END

