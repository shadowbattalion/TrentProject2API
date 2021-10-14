const express = require('express')
const cors = require('cors')
require('dotenv').config()
const MongoUtil = require('./MongoUtil.js')
const ObjectId = require('mongodb').ObjectId;
const cookieParser = require('cookie-parser');


let app = express();

// important for RESTFul API:

// allow Express to process JSON payload
// in POST, PUT and PATCH requests
app.use(express.json());

// enable CORS so that our React applications
// hosted on a domain name can use it
app.use(cors());

app.use(cookieParser());

// set a cookie
app.use(async function (req, res, next) {
    // check if client sent cookie
    let cookie = req.cookies.cookieName
   
    if (cookie === undefined) {
        // no: set a new cookie
        let randomNumber=new ObjectId()
        res.cookie('cookieName',randomNumber, { maxAge: 900000, httpOnly: true });
        console.log('cookie created successfully');
    } else {
        // yes, cookie was already present 
        console.log('cookie exists', cookie);
    } 
    next(); // <-- important!
});
  
// let static middleware do its job
app.use(express.static(__dirname + '/public'));

async function main() {

    //Endpoints test area

    app.get('/', (req, res) => {
        res.json({
            "message": "hello world"
        })
    })




    await MongoUtil.connect(process.env.MONGO_URI, "ghost_sightings")

    app.get('/cases', async (req, res) => {

        try {
            let db = MongoUtil.getDB();
    
            
    
            let witnesses = await db.collection('witness').find().toArray()
                        
            for(let witness of witnesses){
                cases_details=[]
                for(let c of witness.cases){


                    case_detail=await db.collection('cases').findOne({"_id":c},{"projection":{"entity_tags":0,"comments":0}})
                    cases_details.push(case_detail)
                    


                }

                witness.cases=cases_details

            } 






            


            res.status(200)
            res.json(witnesses)
            

        } catch (e) {
            res.status(500)
            res.send(e)         
        }
    })


    app.get('/case/:id', async (req, res) => {

        try {
            let db = MongoUtil.getDB()


            let cases_id = req.params.id
            let cases_detail = await db.collection('cases').findOne({"_id":ObjectId(cases_id)})
            let witness =  await db.collection('witness').findOne({"cases":ObjectId(cases_id)})
            
        
            encounter_details=[]
            for(let encounter_id of cases_detail.encounters){
                encounter_detail=await db.collection('encounters').findOne({"_id":encounter_id})
                encounter_details.push(encounter_detail)
            }
            cases_detail.encounters=encounter_details


            entity_tag_details=[]
            for(let entity_tag_id of cases_detail.entity_tags){
                entity_tag_detail=await db.collection('entity_tags').findOne({"_id":entity_tag_id},{"projection":{"entity":1,"_id":0}})
                entity_tag_details.push(entity_tag_detail)
            }
            cases_detail.entity_tags=entity_tag_details

            comment_details=[]
            if(cases_detail.comments){
                for(let comment_id of cases_detail.comments){
                    comment_detail=await db.collection('comments').findOne({"_id":comment_id})
                    comment_details.push(comment_detail)
                }
            }
            cases_detail.comments=comment_details
        

            res.status(200)
            res.json([cases_detail,witness])

        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })


    //Case_id required in body
    app.post('/post_comment', async (req, res) => {

        try {
            let db = MongoUtil.getDB()
            
            let case_id = req.body.case_id
            let comment_id = new ObjectId()
            let content = req.body.content
            

        
            let insert_new_comment = await db.collection('comments').insertOne({
                "_id": ObjectId(comment_id),
                "content": content
            })

            let update_in_cases = await db.collection('cases').updateOne({ 
                "_id": ObjectId(case_id)
            }, {
                    $push: {
                        "comments": ObjectId(comment_id)
                    }
            })
        
            
            res.status(200)
            res.send({"new_comment_inserted":insert_new_comment, "cases_updated":update_in_cases})



        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })


    
    app.put('/edit_comment/:id', async (req, res) => {

        try {
            let db = MongoUtil.getDB()
            
            
            let comment_id = req.params.id
            let content=req.body.content

          

            let edit_comment = await db.collection('comments').updateOne({
                "_id": ObjectId(comment_id)
                
            },{
                "$set":{
                    "content": content
                }
            })

            
        
            
            res.status(200)
            res.send(edit_comment)



        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })

    
    app.delete('/delete_comment/:id', async (req, res) => {

        try {
            let db = MongoUtil.getDB()
            
            let comment_id = req.params.id
            
                
            let deleted_comments = await db.collection('comments').deleteOne({
                "_id": ObjectId(comment_id)
            })
        
            let deleted_in_cases = await db.collection('cases').updateOne({            
                "comments": ObjectId(comment_id)
            }, {
                    "$pull": {
                        "comments": ObjectId(comment_id)
                    }
            })
        
            
            res.status(200)
            res.send({"comment_deleted":deleted_comments, "cases_updated":deleted_in_cases})



        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })

    

    // app.get("/check_registered", async(req,res)=>{

    //     try {
    //         let db = MongoUtil.getDB()
            
    //         let result=false
            
            

    //         if(req.cookies.cookieName){

    //             let registered = await db.collection('witness').findOne({"_id":ObjectId(req.cookies.cookieName)})
    //             result=registered.registered?true:false

    //         }

           
        
            
    //         res.status(200)
    //         res.send(result)



    //     } catch (e) {
    //         res.status(500)
    //         res.send(e)         
    //     }


    // })


    // Add_case format:
    // {
    //      "witness":{
    //                     "occupation":"NSMan",
    //                     "display_name":"",
    //                     "gender":"male",
    //                     "age":"23",
    //                     "company":"",
    //                     "investigator":false,
    //                     "email":"test@this.com"
    //                 },
    //     "case":     {
    //                     "case_title":"Ghost in Woodlands",
    //                     "generic_description":"This is a scary ghost adventure",
    //                     "type_of_activity":"Ghost-Hunting",
    //                     "rating":3,
    //                     "location":"Woodlands Drive 40",
    //                     "coordinates":[21.2, 32.4],
    //                     "date":"27-2034",
    //                     "entity_tags":["616509e7154896339f81b009","616509f8154896339f81b00a"]
    //                 },
    //     "encounters":[
    //                     {
    //                         "images":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     },
    //                     {
    //                         "images":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     }
    //                 ]
    // }


    app.post('/add_case', async (req, res) => {

        // try {
            let db = MongoUtil.getDB()
            
            let user_input = req.body


            //encounters
            let encounters_id=[]

            for(let encounter of user_input.encounters){

                let encounter_id=new ObjectId()
                encounters_id.push(encounter_id)
                await db.collection('encounters').insertOne({
                        "_id": encounter_id,
                        "images":encounter.images,
                        "sightings_description":encounter.sightings_description,
                        "equipment_used":encounter.equipment_used,
                        "contact_type":encounter.contact_type,
                        "number_of_entities":encounter.number_of_entities,
                        "time_of_encounter":encounter.time_of_encounter
                })




            }

            //case

            let case_id = new ObjectId()

            await db.collection('cases').insertOne({
                    "_id": case_id,
                    "case_title":user_input.case.case_title,
                    "generic_description":user_input.case.generic_description,
                    "type_of_activity":user_input.case.type_of_activity,
                    "rating":user_input.case.rating,
                    "location":user_input.case.location,
                    "coordinates":user_input.case.coordinates,
                    "date":user_input.case.date,
                    "entity_tags":user_input.case.entity_tags, //remember to resolve this with ObjectId().
                    "encounters":encounters_id,
                    "comments":[]

            })


            
            
                

            // witness

            let registered = await db.collection('witness').findOne({"_id":ObjectId(req.cookies.cookieName)})
            
            if(registered===null){
                console.log(req.cookies.cookieName)
                let test = await db.collection('witness').updateOne({ 
                    "_id": ObjectId(req.cookies.cookieName)
                }, {
                        $set: {
                            "display_name":user_input.witness.display_name,
                            "occupation":user_input.witness.occupation,
                            "gender":user_input.witness.gender,
                            "age":user_input.witness.age,
                            "company":user_input.witness.company,
                            "investigator":user_input.witness.investigator,
                            "email":user_input.witness.email,
                            "cases":[case_id]
                        }
                })

                console.log(test)




            }else{


                await db.collection('witness').updateOne({ 
                    "_id": ObjectId(req.cookies.cookieName)
                }, {
                        $push: {
                            "cases":[case_id]
                        }
                })



            }
           
        
        
        
        
            
            res.status(200)
            res.send("New case added!")



        // } catch (e) {
        //     res.status(500)
        //     res.send(e)         
        // }


    })



    // app.get('/sightings', async (req, res) => {

    //     try {
    //         let db = MongoUtil.getDB();
    
    //         // start with an empty critera object
    //         let criteria = {};
    
    //         // we fill in the critera depending on whether specific
    //         // query string keys are provided
    
    //         // if the `description` key exists in req.query
    //         if (req.query.description) {
    //             criteria['description'] = {
    //                 '$regex': req.query.description,
    //                 '$options': 'i'
    //             }
    //         }
    
    //         if (req.query.food) {
    //             criteria['food'] = {
    //                 '$in': [req.query.food]
    //             }
    //         }
    
    //         // console.log(criteria)
    
    //         let sightings = await db.collection('sightings').find(criteria).toArray()
    //         res.status(200)
    //         res.send(sightings)

    //     } catch (e) {
    //         res.status(500)
    //         res.send({
    //                 'error':"We have encountered an internal server error"
    //         })         
    //     }
    // })

    // app.post('/sighting', async (req, res) => {

    //     try {
    //         // req.body is an object that contains the
    //         // data sent to the express endpoint
    //         let description = req.body.description;
    //         let food = req.body.food;
    //         // check if the datetime key exists in the req.body object
    //         // if it does, create a new Date object from it
    //         // or else, default to today's date
    //         let datetime = req.body.datetime ? new Date(req.body.datetime) : new Date();

    //         let db = MongoUtil.getDB();
    //         let result = await db.collection('sightings').insertOne({
    //             description, food, datetime
    //         })

    //         // inform the client that the process is successful
    //         res.status(200);
    //         res.json(result);
    //     } catch (e) {
    //         res.status(500);
    //         res.json({
    //             'error': "We have encountered an interal server error. Please contact admin"
    //         });
    //         console.log(e);
    //     }
    // })

    //

    // app.put('/sighting/:id', async(req,res)=>{
    //     // assume that we are replacing the document
    //     let description = req.body.description;
    //     let food = req.body.food;
    //     let datetime = req.body.datetime ? new Date(req.body.datetime) : new Date();

    //     let db = MongoUtil.getDB();
    //     let results = await db.collection('sightings').updateOne({
    //         '_id': ObjectId(req.params.id)
    //     },{
    //         '$set':{
    //             description, food, datetime
    //         }
    //     })
    //     res.status(200);
    //     res.send(results)
    // })

    // app.delete('/sighting/:id', async(req,res) => {
    //     let db = MongoUtil.getDB();
    //     let results = await db.collection('sightings').remove({
    //         '_id': ObjectId(req.params.id)
    //     })
    //     res.status(200);
    //     res.send(results);
    // })


}

main();

// START SERVER
app.listen(3000, () => {
    console.log("Server started")
})