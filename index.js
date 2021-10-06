const express = requires()
const cors= requires('cors')
require('dotenv').config()
// const MongoUtil=require()
// const ObjectId=require('mongodb').ObjectId

let app = express()

//allow JSON
app.use(express.json())


//CORS
//allow other people to user
app.use(cors())



async function main(){



}

main()

app.listen