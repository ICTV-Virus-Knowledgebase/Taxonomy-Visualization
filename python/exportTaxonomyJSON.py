
import contextlib
import pyodbc
import subprocess


# Populate the names of the database server and the current ICTVonline database.
dbServer = "ICTVDEV"
ictvDB = "ICTVonline39"


# Export taxonomy JSON files for non-species and species taxa in every MSL release.
def exportTaxonomyJSON(dbServer_, ictvDB_, treeID_):

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

   # Variables used in the SQL below.
   treeConstraint = ""
   treeLimit = ""

   # If a tree ID was provided, we will limit the tree ID query to one result.
   if treeID_ not in (None, ''):
      treeConstraint = f"AND tree_id = {treeID_} "
      treeLimit = "TOP 1 "

   # SQL to retrieve tree ID(s) in the ICTV database's taxonomy "table of contents" table.
   treeSQL = f"""
      SELECT {treeLimit}tree_id
      FROM taxonomy_toc
      WHERE msl_release_num IS NOT NULL
      {treeConstraint}
      ORDER BY tree_id ASC
   """

   # Open the database connection
   with contextlib.closing(pyodbc.connect(dbConnectionString)) as dbConnection:

      # Get all tree IDs in the ICTV database.
      treeCursor = dbConnection.cursor()

      # Iterate over all tree IDs that are returned.
      for row in treeCursor.execute(treeSQL):
         
         # Get the tree ID as a string.
         treeID = str(row.tree_id)

         # Get the year from the tree ID.
         year = treeID[0:4]
         formattedYear = year if treeID[4] == "0" else f"{year}.{treeID[4]}"

         # Create the command line text to run sqlcmd for non-species taxa.
         nonSpeciesCMD = (f"sqlcmd -S {dbServer_} "
               f"-Q \"EXEC [{ictvDB_}].dbo.exportNonSpeciesTaxonomyJSON @treeID = {treeID}\" "
               f"-o \"JSON\\nonSpecies_{formattedYear}.json\" "
               "-y 0 ")

         # Run the command
         subprocess.run(nonSpeciesCMD, shell=True)

         # Create the command line text to run sqlcmd for species taxa.
         speciesCMD = (f"sqlcmd -S {dbServer_} "
               f"-Q \"EXEC [{ictvDB_}].dbo.exportSpeciesTaxonomyJSON @treeID = {treeID}\" "
               f"-o \"JSON\\species_{formattedYear}.json\" "
               "-y 0 ")

         # Run the command
         subprocess.run(speciesCMD, shell=True)




if __name__ == '__main__':
    
    exportTaxonomyJSON(dbServer, ictvDB, None)