const { ObjectId } = require('bson')

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

    app.get('/sightings', async(res,req)=>{

        try{
            let db = MongoUtil.getDB()
            let criteria = {}

            if(req.query.description){

                criteria["description"]={
                    '$regex':req.query.description,
                    '$options':'i'
                }

            }

            if(req.query.food){

                criteria["food"]={
                    '$in':[req.query.food]
                }

            }

            let sightings= await db.collection('sightings').find(criteria).toArray()

            res.status(200)
            res.send(sightings)

        }catch(e){

            res.status(500)
            res.json({
                "error":"We have encountered an internal server error"
            })
            console.log(e)


        }


        }
       
        )


    app.put('/sighting/:id', async(req,res)=>{

        let description = req.body.description
        let food = req.body.food
        let datetime = req.body.datetime ? new Date(req.body.datetime): new Date() 

        let db = MongoUtil.getDB()
        let results = await db.collection('sightings').updateOne({
            '_id':ObjectId(req.params.id)},
            {
                '$set':{description,food,datetime}

            }
        )
        
        res.status(200)
        res.send(results)


    })

    app.delete('/sighting/:id', async(req,res)=>{

        let db = MongoUtil.getDB()
        


        res.status(200)
        res.send(results)

    })



    
    
}

main()

app.listen(3000){

    console.log("Server Running")

}