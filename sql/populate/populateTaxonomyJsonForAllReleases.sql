
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ===================================================================================================================
-- Author: don dempsey
-- Created on: 04/25/24
-- Description: Populate taxonomy_json for all releases in the taxonomy_toc table.
-- Updated:  
-- ===================================================================================================================

-- Delete any existing versions.
IF OBJECT_ID('dbo.populateTaxonomyJsonForAllReleases') IS NOT NULL
	DROP PROCEDURE dbo.populateTaxonomyJsonForAllReleases
GO

CREATE PROCEDURE dbo.populateTaxonomyJsonForAllReleases
AS
BEGIN
	SET XACT_ABORT, NOCOUNT ON

   -- A constant error code to use when throwing exceptions.
	DECLARE @errorCode AS INT = 50000

   BEGIN TRY

      DECLARE @treeID AS INT

      --==========================================================================================================
      -- Make sure taxonomy_json_rank has already been populated.
      --==========================================================================================================
      IF 1 > (
         SELECT COUNT(*)
         FROM taxonomy_json_rank
      ) THROW @errorCode, 'No taxonomy JSON ranks exist. Run the stored procedure initializeTaxonomyJsonRanks and try again.', 1


      --==========================================================================================================
      -- Iterate over every tree ID (corresponding to an MSL release) in the taxonomy_toc table.
      --==========================================================================================================
      DECLARE release_cursor CURSOR FORWARD_ONLY FOR

         SELECT tree_id 
         FROM taxonomy_toc 
         WHERE msl_release_num IS NOT NULL
         ORDER BY tree_id

      OPEN release_cursor  
      FETCH NEXT FROM release_cursor INTO @treeID

      WHILE @@FETCH_STATUS = 0  
      BEGIN

         --==========================================================================================================
         -- Populate the taxonomy JSON table for the specified tree ID (MSL release).
         --==========================================================================================================
         EXEC dbo.populateTaxonomyJSON @treeID = @treeID

         FETCH NEXT FROM release_cursor INTO @treeID
      END

      CLOSE release_cursor  
      DEALLOCATE release_cursor

   END TRY
	BEGIN CATCH
		DECLARE @errorMsg AS VARCHAR(200) = ERROR_MESSAGE()
		RAISERROR(@errorMsg, 18, 1)
	END CATCH 
END
