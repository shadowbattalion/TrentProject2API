const client_of_mongo = require("mongodb").MongoClient


let database

async function connect(uri, database_name)
{
    let mongo_client = await client_of_mongo.connect(uri, {
        useUnifiedTopology:true
    })
    database = mongo_client.db(database_name)
    
}

function getDatabase() {
    return database
}

module.exports = {
    connect, getDatabase
}