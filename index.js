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
    // await MongoUtil.connect(process.env.MONGO_URI,"free-food-sightings")

    app.get('/', (req,res)=>{
        res.json({
            "message":"Hello World"
        })

    })

}

main()

app.listen(3000){

    console.log("Server Running")

}