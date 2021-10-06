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

    app.post('/sighting',async(req,res)=>{

        try{
            let description = req.body.description
            let food = req.body.food
            let datetime = req.body.datetime ? new Date(req.body.datetime): new Date() //optional date
            let db = MongoUtil.getDB()
            let result = await db.collection('sightings').insertOne({
                "description":description,
                "food":food,
                "datetime":datetime
            })

            res.status(200)
            res.send(result)
        }catch(e){

            res.status(500)
            res.json({
                "error":"We have encountered an internal server error"
            })
            console.log(e)

        }
    })
}

main()

app.listen(3000){

    console.log("Server Running")

}