
import argparse
import contextlib
import pyodbc
import subprocess


#-----------------------------------------------------------------------------------
# Export release data and save as releases.json.
#-----------------------------------------------------------------------------------
def exportReleasesJSON(dbServer_, ictvDB_):

   # Validate parameters
   if dbServer_ in (None, '') or not dbServer_.strip():
      raise Exception("The dbServer parameter is invalid")
   
   if ictvDB_ in (None, '') or not ictvDB_.strip():
      raise Exception("The ictvDB parameter is invalid")
   
   # Delete an existing version of releases.json.
   deleteCMD = (f"del \"JSON\\releases.json")
   subprocess.run(deleteCMD, shell=True)

   # Create the command line text to run sqlcmd.
   releasesCMD = (f"sqlcmd -S {dbServer_} "
         f"-Q \"EXEC [{ictvDB_}].dbo.exportReleasesJSON \" "
         f"-o \"JSON\\releases.json\" "
         "-y 0 ")

   # Run the command
   subprocess.run(releasesCMD, shell=True)
      

#-----------------------------------------------------------------------------------
# Export JSON files for non-species and species taxa.
#-----------------------------------------------------------------------------------
def exportTaxonomyJSON(dbServer_, ictvDB_, mslReleaseNum_):

   # Validate parameters
   if dbServer_ in (None, '') or not dbServer_.strip():
      raise Exception("The dbServer parameter is invalid")
   
   if ictvDB_ in (None, '') or not ictvDB_.strip():
      raise Exception("The ictvDB parameter is invalid")
   

   # The database connection string
   dbConnectionString = ("Driver={SQL Server Native Client 11.0};"
      f"Server={dbServer_};"
      f"Database={ictvDB_};"
      "Trusted_Connection=yes;")

   treeSQL = None

   if isinstance(mslReleaseNum_, int):

      # Return the tree ID that corresponds to this MSL release number.
      treeSQL = f"""
         SELECT TOP 1 toc.tree_id, tn.name
         FROM taxonomy_toc toc
         JOIN taxonomy_node tn ON tn.taxnode_id = toc.tree_id
         WHERE toc.msl_release_num = {mslReleaseNum_}
      """
   else:

      # Return all tree IDs that have a valid MSL release number.
      treeSQL = """
         SELECT toc.tree_id, tn.name
         FROM taxonomy_toc toc
         JOIN taxonomy_node tn ON tn.taxnode_id = toc.tree_id
         WHERE toc.msl_release_num IS NOT NULL
         ORDER BY toc.tree_id ASC
      """

   # Open the database connection
   with contextlib.closing(pyodbc.connect(dbConnectionString)) as dbConnection:

      # Get all tree IDs in the ICTV database.
      treeCursor = dbConnection.cursor()

      # Iterate over all tree IDs that are returned.
      for row in treeCursor.execute(treeSQL):
         
         # Get the tree ID and tree name as strings.
         treeID = str(row.tree_id)
         treeName = str(row.name)

         # Delete existing versions of the JSON files for this release.
         deleteCMD = (f"del \"JSON\\taxonomy_{treeName}.json")
         subprocess.run(deleteCMD, shell=True)

         # Create the command line text to run sqlcmd for non-species taxa.
         nonSpeciesCMD = (f"sqlcmd -S {dbServer_} "
               f"-Q \"EXEC [{ictvDB_}].dbo.exportTaxonomyJSON @treeID = {treeID}\" "
               f"-o \"JSON\\taxonomy_{treeName}.json\" "
               "-y 0 ")

         # Run the command
         subprocess.run(nonSpeciesCMD, shell=True)



# Example usage: py exportTaxonomyJSON.py --dbServer "ICTVDEV" --ictvDB "ICTVonline39" --release 39

if __name__ == '__main__':

   parser = argparse.ArgumentParser(description="Export one or more MSL releases from the taxonomy_json table and save as JSON files.")
   parser.add_argument("--dbServer", dest="dbServer", metavar='SERVER_NAME', nargs=1, required=True, help="The database server name")
   parser.add_argument("--ictvDB", dest="ictvDB", metavar='ICTV_DB', nargs=1, required=True, help="The database name")
   parser.add_argument("--release", dest="release", metavar='N', required=False, nargs="?", type=int, help="An MSL release number")

   args = parser.parse_args()

   # Export one or more MSL releases from the taxonomy_json table and save as JSON files.
   exportTaxonomyJSON(args.dbServer[0], args.ictvDB[0], args.release)

   # Export release data as JSON and save as a .json file.
   exportReleasesJSON(args.dbServer[0], args.ictvDB[0])