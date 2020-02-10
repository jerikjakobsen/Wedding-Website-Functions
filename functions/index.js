const functions = require('firebase-functions');
const admin = require('firebase-admin')
admin.initializeApp()
const db = admin.firestore()
const express = require('express')

const app = express()

app.get('/guests/:name',(req,res) => {
    let guest = {}
    db.collection('guests').where('name', '==', req.params.name).get()
    .then(docs => {
        if (docs.empty) {
            return res.status(404).json({
                error: "Guest not found",
                name: req.params.name,
            })
        } else {
        guest.party = docs.docs[0].data().party
        return db.collection('guests').where('party','==', guest.party).get()
        }
    })
    .then(docs => {
        guest.members = []
        docs.forEach(member => {
            guest.members.push(member.data())
        })

        guest.members = guest.members.sort((a,b)=> (a.name > b.name ? 1 : -1))
        return res.status(200).json(guest)
    })
    .catch(err => {
        console.error(err)
        res.status(500).json({error: err.code})
    })
})


app.post('/guestlists', (req, res) => {
    let batch = db.batch()
    const guestlist = []
    req.body.forEach(pers => {
        const person = {}
        person.name = pers.name
        person.party = pers.party
        person.attending = false
        guestlist.push(person)
    })

    guestlist.forEach(pers => {
        batch.set(db.collection('guests').doc(), pers)
    })

    return batch.commit()
    .then(()=> {
        res.status(200).json({message: `Commited ${guestlist.length}`})
    })
    .catch(err => {
        console.error(err)
        res.status(500).json({error: err.code})
    })
})

app.post('/guests', (req,res) => {
    let batch = db.batch()
    let dbGuests =  db.collection('guests')
    const newList = []
    dbGuests.where('party', '==', req.body.party).get()
    .then(docs => {
        if (docs.empty) {
            return res.status(404).json({error: err.code})
        } else {

        docs.docs.forEach(doc => {
            newList.push({
                id: doc.id,
                name: doc.data().name
            })})

        newList.forEach(person => {
            const attend = req.body.members.filter(pers => pers.name === person.name)[0].attending
            batch.update(dbGuests.doc(person.id), {attending: attend})
            })
        
        return batch.commit()
        }
    }).then(() => {
        res.status(200).json({message: "Success"})
    })
    .catch(err => {
        console.error(err)
        res.status(500).json({error: err.code})
    })

    /*
    {
        party: 2,
        members: [
            {
                name: john,
                attending: true
            },
            {
                name: ngan,
                attending: false
            }
        ]
    }
    */
})


exports.api = functions.https.onRequest(app)