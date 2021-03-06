const express = require('express')
const cors = require('cors')
require('dotenv').config()
const mongo_util = require('./Util.js')
const ObjectId = require('mongodb').ObjectId;



let app = express();
app.use(express.json());
app.use(cors());



async function main() {

 
    await mongo_util.connect(process.env.MONGO_URI, "ghost_sightings")
    console.log("Database connected")

    app.get('/search_cases', async (req, res) => {

        try {
            let db = mongo_util.getDatabase();
            search_parameters={}

            
            search_entity_tags = req.query.search_entity_tags
            from_date = req.query.from_date
            to_date = req.query.to_date


            if(search_entity_tags){

                let search_entity_tags_object_id = search_entity_tags.map(tag=>ObjectId(tag))
            
            

                search_parameters["entity_tags"]={
                    '$in':search_entity_tags_object_id
                }


            }

            if(from_date && to_date){

                search_parameters["date"] = {
                    '$gte': new Date(from_date),
                    '$lte': new Date(to_date)
                }
            

            }else if(from_date){

                search_parameters["date"] = {
                    '$gte': new Date(from_date)
                }

            }else if(to_date){
                

                search_parameters["date"] = {
                    '$lte': new Date(to_date)
                }

            }

            
            let search_results = await db.collection('cases').find(search_parameters).toArray()
            

            let witnesses = [] 
            
            for(let search_result of search_results){

                witness=await db.collection('witness').findOne({"cases":ObjectId(search_result._id)},{"projection":{"cases":0}})
                witness["case"]=search_result
                witnesses.push(witness)

            }
            
            

            res.status(200)
            res.json(witnesses)


        
        } catch (e) {
            res.status(500)
            res.send(e)         
        }

    })

    app.get('/list_entity_tags', async (req, res) => {

        try {
            let db = mongo_util.getDatabase();
    
            
    
            let entity_tags = await db.collection('entity_tags').find().toArray()
                        
        

            res.status(200)
            res.json(entity_tags)
            

        } catch (e) {
            res.status(500)
            res.send(e)         
        }
    })

    app.get('/cases', async (req, res) => {

        try {
            let db = mongo_util.getDatabase();
    
            
    
            let witnesses = await db.collection('witness').find({},{"projection":{"display_name":1,"cases":1}}).toArray()
                        
            for(let witness of witnesses){
                cases_details=[]
                for(let c of witness.cases){


                    case_detail=await db.collection('cases').findOne({"_id":c},{"projection":{"case_title":1, "generic_description":1, "date":1}})
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
            let db = mongo_util.getDatabase()


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
                entity_tag_detail=await db.collection('entity_tags').findOne({"_id":entity_tag_id},{"projection":{"entity":1,"_id":1}})
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
            let db = mongo_util.getDatabase()
                
            let case_id = req.body.case_id
            let comment_id = new ObjectId()
            let content = req.body.content
            let like = req.body.like


            let check_id_exists = await db.collection('cases').findOne({
                "_id": ObjectId(case_id)
            })
                
            if(check_id_exists && content){
            
                let insert_new_comment = await db.collection('comments').insertOne({
                    "_id": ObjectId(comment_id),
                    "content": content,
                    "like":like
                })

                let update_in_cases = await db.collection('cases').updateOne({ 
                    "_id": ObjectId(case_id)
                }, {
                        $push: {
                            "comments": ObjectId(comment_id)
                        }
                })
            
                
                res.status(200)
                res.send(insert_new_comment)

            }else{
                        
                res.status(400)
                res.send("Malformed input")


            }

        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })


    
    app.put('/edit_comment/:id', async (req, res) => {
        
        try {
            let db = mongo_util.getDatabase()
                
                
            let comment_id = req.params.id
            let content=req.body.content
            let like=req.body.like

            let check_id_exists = await db.collection('comments').findOne({
                "_id": ObjectId(comment_id)
            })

            
            if(check_id_exists && content){
                let edit_comment = await db.collection('comments').updateOne({
                    "_id": ObjectId(comment_id)
                    
                },{
                    "$set":{
                        "content": content,
                        "like":like
                    }
                })

                
            
                
                res.status(200)
                res.send(edit_comment)

            }else{
                            
                res.status(400)
                res.send("Malformed input")


            }

        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })

    
    app.delete('/delete_comment/:id', async (req, res) => {
        
        try {
            let db = mongo_util.getDatabase()
            
            let comment_id = req.params.id

            let check_id_exists = await db.collection('comments').findOne({
                "_id": ObjectId(comment_id)
            })

            
            if(check_id_exists && comment_id){
        
                
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

            }else{
                            
                res.status(400)
                res.send("Malformed input")


            }

        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })

    

   


    // Add_case format:
    // {
    //      "witness":{
    //                     "email_address":"test@this.com"
    //                     "display_name":"",
    //                     "occupation":"NSMan",
    //                     "age":"23",
    //                     "company_name":""
    //                 },
    //     "case":     {
    //                     "case_title":"Ghost in Woodlands",
    //                     "generic_description":"This is a scary ghost adventure",
    //                     "type_of_activity":"Ghost-Hunting",
    //                     "location":"Woodlands Drive 40",
    //                     "date":"27-2034",
    //                     "entity_tags":["616509e7154896339f81b009","616509f8154896339f81b00a"]
    //                 },
    //     "encounters":[
    //                     {
    //                         "image":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     },
    //                     {
    //                         "image":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     }
    //                 ]
    // }


    app.post('/add_case', async (req, res) => {

        
        try {
            
            let db = mongo_util.getDatabase()
                
            let user_input = req.body

            let encounter_list_details=false
            for(let encounter of user_input.encounters){

                let check_image = encounter.image && /https?:\/\/[^\s].[^\s]*$/.test(encounter.image)
                let check_number_of_entities = encounter.number_of_entities && !isNaN(encounter.number_of_entities) && parseInt(encounter.number_of_entities)>=1

                if(check_image && encounter.equipment_used && encounter.contact_type && check_number_of_entities && encounter.time_of_encounter){

                    encounter_list_details=true

                }else{

                    encounter_list_details=false

                }

            }

            let check_display_name =user_input.witness.display_name && user_input.witness.display_name.length<=25
            let check_age = user_input.witness.age && !isNaN(user_input.witness.age) && (parseInt(user_input.witness.age)>=10 && parseInt(user_input.witness.age)<=120)
            let check_case_title = user_input.case.case_title && user_input.case.case_title.length<=50
            let check_location = user_input.case.location && user_input.case.location.length<=100
            
            if(encounter_list_details && user_input.witness.email_address && check_display_name && check_age && check_case_title && user_input.case.type_of_activity && check_location && user_input.case.date && user_input.case.entity_tags && user_input.encounters.length!=0){
                

            
                //encounters
                let encounters_id=[]

                for(let encounter of user_input.encounters){

                    let encounter_id=new ObjectId()
                    encounters_id.push(encounter_id)
                    await db.collection('encounters').insertOne({
                            "_id": encounter_id,
                            "image":encounter.image,
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
                        "location":user_input.case.location,
                        "date":new Date(user_input.case.date),
                        "entity_tags":user_input.case.entity_tags.map(tag=>ObjectId(tag)),
                        "encounters":encounters_id,
                        "comments":[]

                })


                
                
                    

                // witness

                let email = await db.collection('witness').findOne({"email_address":user_input.witness.email_address},{"projection":{"email_address":1}})
                
                
                if(email){
                    
                    await db.collection('witness').updateOne({ 
                        "email_address": user_input.witness.email_address
                    }, {
                            $push: {
                                "cases":case_id
                            }
                    })


                }else{

                    

                    let witness_id = new ObjectId()

                    await db.collection('witness').insertOne({ 
                        "_id": witness_id,
                        "email_address":user_input.witness.email_address,
                        "display_name":user_input.witness.display_name,
                        "occupation":user_input.witness.occupation,
                        "age":user_input.witness.age,
                        "company_name":user_input.witness.company_name,                     
                        "cases":[case_id]
                            
                    })


                }
            
            
            
            
            
                
                res.status(200)
                res.send("New case added!")
                
                }else{
                    
                    res.status(400)
                    res.send("Malformed input")


                }



        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })


     // update_case format:
    // {
    
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
    //                    {
    //                         "id":"6168245cce90d6d9d1afd5cd",
    //                         "image":["http://test.com"],
    //                         "sightings_description":"The ghost can everywhere",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     },
    //                     {
    //                         "image":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     },
    //                     {
    //                         "image":["http://test.com"],
    //                         "sightings_description":"The ghost can be seen here",
    //                         "equipment_used":["phone","camera"],
    //                         "contact_type":["visual"],
    //                         "number_of_entities":3,
    //                         "time_of_encounter":"midday"
    //                     }
    //                 ]
    // }

    //needs encounter id if there is a change in the encounter
    app.put('/edit_case/:id', async (req, res) => {

        try {
            let db = mongo_util.getDatabase()
            
            let user_input = req.body
            let case_id=req.params.id
            
            let check_id_exists = await db.collection('cases').findOne({
                "_id": ObjectId(case_id)
            })

            
            let encounter_list_details=false
            for(let encounter of user_input.encounters){

                let check_image = encounter.image && /https?:\/\/[^\s].[^\s]*$/.test(encounter.image)
                let check_number_of_entities = encounter.number_of_entities && !isNaN(encounter.number_of_entities) && parseInt(encounter.number_of_entities)>=1
                
                if((check_image && encounter.equipment_used && encounter.contact_type && check_number_of_entities && encounter.time_of_encounter)||encounter.encounter_status=="deleted"){

                    encounter_list_details=true

                }else{

                    encounter_list_details=false

                }

            }

            
           
            let check_case_title = user_input.case.case_title && user_input.case.case_title.length<=50
            let check_location = user_input.case.location && user_input.case.location.length<=100

                                                                                                                                                               
            if(check_id_exists && encounter_list_details && check_case_title && user_input.case.type_of_activity && check_location  && user_input.case.date && user_input.case.entity_tags && user_input.encounters.length!=0){
                //cases
                if("case" in user_input){
                    await db.collection('cases').updateOne({
                        "_id": ObjectId(case_id)
                    }, {
                        '$set': {
                            "case_title":user_input.case.case_title,
                            "generic_description":user_input.case.generic_description,
                            "type_of_activity":user_input.case.type_of_activity,
                            // "rating":user_input.case.rating,
                            "location":user_input.case.location,
                            "date": new Date(user_input.case.date),
                            "entity_tags":user_input.case.entity_tags.map(tag=>ObjectId(tag))
                        }
                    }) 
                }

            
            
                //encounters
                if("encounters" in user_input){

                    let encounters_id=[]

                    for(let encounter of user_input.encounters){

                        if(encounter._id.includes("front_end_id")){

                            let encounter_id=new ObjectId()
                            encounters_id.push(encounter_id)
                            await db.collection('encounters').insertOne({
                                    "_id": encounter_id,
                                    "image":encounter.image,
                                    "sightings_description":encounter.sightings_description,
                                    "equipment_used":encounter.equipment_used,
                                    "contact_type":encounter.contact_type,
                                    "number_of_entities":encounter.number_of_entities,
                                    "time_of_encounter":encounter.time_of_encounter
                            })



                        }else if(encounter.encounter_status=="deleted"){
                            
                            let test = await db.collection('encounters').deleteOne({
                                "_id": ObjectId(encounter._id)
                            })
                            
                            await db.collection('cases').updateOne({            
                                "encounters": ObjectId(encounter._id)
                            }, {
                                    "$pull": {
                                        "encounters": ObjectId(encounter._id)
                                    }
                            })




                        } else {
                            await db.collection('encounters').updateOne({ 
                                "_id": ObjectId(encounter._id)
                            }, {
                                    $set: {
                                        "image":encounter.image,
                                        "sightings_description":encounter.sightings_description,
                                        "equipment_used":encounter.equipment_used,
                                        "contact_type":encounter.contact_type,
                                        "number_of_entities":encounter.number_of_entities,
                                        "time_of_encounter":encounter.time_of_encounter
                                    }
                            })


                            
                        }

                    }

                    if(encounters_id){
                        await db.collection('cases').updateOne({ 
                            "_id": ObjectId(case_id)
                        }, {
                                $push: {
                                    "encounters":{$each: encounters_id}
                                }
                        })
                    }
                }


                
                
                res.status(200)
                res.send("Case updated!")
            
            }else{
                
                res.status(400)
                res.send("Malformed input")


            }


        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })





    app.delete('/delete_case/:id', async (req, res) => {

        try {
            let db = mongo_util.getDatabase()
            
            let case_id= req.params.id

            let check_id_exists = await db.collection('cases').findOne({
                "_id": ObjectId(case_id)
            })

            if(check_id_exists && case_id){
                let ids_to_delete = await db.collection('cases').findOne({
                    "_id": ObjectId(case_id)
                },{
                    "projection":{
                        
                        comments:1,
                        encounters:1


                    }             

                })

                


                encounter_ids=ids_to_delete.encounters
                comment_ids=ids_to_delete.comments



                if(encounter_ids){
                    for(let id of encounter_ids){

                        await db.collection('encounters').deleteOne({
                            "_id": id
                        })

                    }
                }

                if(comment_ids){
                    for(let id of comment_ids){

                        await db.collection('comments').deleteOne({
                            "_id": id
                        })

                    }

                }

                
                let deleted_in_cases = await db.collection('witness').updateOne({            
                    "cases": ObjectId(case_id)
                }, {
                        "$pull": {
                            "cases": ObjectId(case_id)
                        }
                })
                


                await db.collection('cases').deleteOne({
                    "_id": ObjectId(case_id)
                })


            

          
        
        
            
                res.status(200)
                res.send("Case deleted!")

            }else{
                    
                res.status(400)
                res.send("Malformed input")


            }



        } catch (e) {
            res.status(500)
            res.send(e)         
        }


    })


   

}

main();

// START SERVER  
app.listen(process.env.PORT, () => {
    console.log("Server started")
})