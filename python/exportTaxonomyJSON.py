
import contextlib
import pyodbc
import subprocess


# Populate the names of the API DB, the database server, and the current ICTVonline database.
apiDB = "ICTV_API"
dbServer = "ICTVDEV"
taxonomyDB = "ICTVonline39"


# Export taxonomy JSON files for non-species and species taxa in every MSL release.
def exportTaxonomyJSON(apiDB_, dbServer_, taxonomyDB_, treeID_):

    # Validate parameters
    if apiDB_ in (None, '') or not apiDB_.strip():
        raise Exception("The apiDB parameter is invalid")
    
    if dbServer_ in (None, '') or not dbServer_.strip():
        raise Exception("The dbServer parameter is invalid")
    
    if taxonomyDB_ in (None, '') or not taxonomyDB_.strip():
        raise Exception("The taxonomyDB parameter is invalid")
    

    # The database connection string
    dbConnectionString = ("Driver={SQL Server Native Client 11.0};"
        f"Server={dbServer_};"
        f"Database={apiDB_};"
        "Trusted_Connection=yes;")

    # SQL to drop existing and create new taxonomy views for this taxonomy database. 
    viewsSQL = f"EXEC dbo.createIctvOnlineViews @ictvOnlineDbName = '{taxonomyDB_}' "
    
    treeConstraint = ""
    treeLimit = ""

    # If a tree ID was provided, we will limit the tree ID query to one result.
    if treeID_ not in (None, ''):
        treeConstraint = f"AND tree_id = {treeID_} "
        treeLimit = "TOP 1 "

    # SQL to retrieve tree ID(s) in the taxonomy database's taxonomy "table of contents" table.
    treeSQL = f"""
        SELECT {treeLimit}tree_id
        FROM v_taxonomy_toc
        WHERE msl_release_num IS NOT NULL
        {treeConstraint}
        ORDER BY tree_id ASC
    """

    # Open the database connection
    with contextlib.closing(pyodbc.connect(dbConnectionString)) as dbConnection:

        # Create views for this taxonomy database.
        viewCursor = dbConnection.cursor()
        viewCursor.execute(viewsSQL)

        # Get all tree IDs in the taxonomy database.
        treeCursor = dbConnection.cursor()

        # Create views for this taxonomy database.
        # Iterate over all tree IDs that are returned.
        for row in treeCursor.execute(treeSQL):
            
            # Get the tree ID as a string.
            treeID = str(row.tree_id)

            # Get the year from the tree ID.
            year = treeID[0:4]
            formattedYear = year if treeID[4] == "0" else f"{year}.{treeID[4]}"

            # Create the command line text to run sqlcmd for non-species taxa.
            nonSpeciesCMD = (f"sqlcmd -S {dbServer_} "
                f"-Q \"EXEC [{apiDB_}].dbo.exportNonSpeciesTaxonomyJSON @treeID = {treeID}\" "
                f"-o \"JSON\\nonSpecies_{formattedYear}.json\" "
                "-y 0 ")

            # Run the command
            subprocess.run(nonSpeciesCMD, shell=True)

             # Create the command line text to run sqlcmd for species taxa.
            speciesCMD = (f"sqlcmd -S {dbServer_} "
                f"-Q \"EXEC [{apiDB_}].dbo.exportSpeciesTaxonomyJSON @treeID = {treeID}\" "
                f"-o \"JSON\\species_{formattedYear}.json\" "
                "-y 0 ")

            # Run the command
            subprocess.run(speciesCMD, shell=True)





if __name__ == '__main__':
    
    exportTaxonomyJSON(apiDB, dbServer, taxonomyDB, None)