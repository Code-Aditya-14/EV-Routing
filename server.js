const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt=require('jsonwebtoken')
const Stations = require('./models/stations')
require('dotenv').config()

const DB = process.env.DB;
mongoose.connect(DB, {
	useNewUrlParser: true, 
	useUnifiedTopology: true
}).then(() => {
	console.log(`DB connection successful`);
}).catch((err) => console.log(err));

const JWT_SECRET="hfkadhskjh95093ufhaoihgav%";

const app = express()
app.use(bodyParser.json())

app.use('/', express.static(path.join(__dirname, 'static')))
app.use('/login', express.static(path.join(__dirname, 'static/login.html')))
app.use('/booking', express.static(path.join(__dirname, 'static/booking.html')))
app.use('/details', express.static(path.join(__dirname, 'static/details.html')))
app.use('/enquiry', express.static(path.join(__dirname, 'static/enquiry.html')))

// apis
app.post('/api/login', async (req, res) => {
	const { username, password } = req.body
	if(!username || typeof username !== 'string')
	{
		return res.json({ status: 'error', idx: '1', error: 'Invalid username/password' });
	}
	if(!password || typeof password !== 'string')
	{
		return res.json({ status: 'error', idx: '1', error: 'Invalid username/password' });
	}

    const user = await Stations.findOne({ username }).lean()
    if (!user) {
        return res.json({ status: 'error', idx: '1', error: 'Invalid username/password' })
    }

    if (password == user.password) {
    // the username, password combination is successful
    
        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                ID: user.ID
            },
            JWT_SECRET,
            {
                expiresIn: 3600,
            },
        )
        console.log(token)
        return res.json({ status: 'ok', data: token, ID: user.ID })
    }
	res.json({ status: 'error', idx: '1', error: 'Invalid username/password' });
})

app.post('/api/book', async (req, res) => {
	const { name, phone, email, evstation, timing } = req.body
    const user = await Stations.findOne({ ID: evstation }).lean()
    if (!user) {
        return res.json({ status: 'error', idx: '1', error: 'Please Select an EV-Station' })
    }
    console.log(user)

    const date1 = new Date(timing);
	const date2 = new Date();
	if(!timing || date1-date2<=0)
	{
		return res.json({ status: 'failed', idx: '3', error: 'Future time should selected' });
	}

    try {
        var cnt=0;
        console.log(cnt)
        console.log(user.Timing)
        for(var i=0; i<(user.Timing).length; i++)
        {
            const timedif = Math.abs(user.Timing[i]-timing);
            console.log(timedif);
            if(timedif<1000*60*60){
                cnt++;
            }
        }
        console.log(cnt, user.NoOfPoints)
        if(cnt >= user.NoOfPoints)
        {
            return res.json({ status: 'failed', idx: '10', error: 'Slots already booked.' });
        }
        else 
        {
            const result=await Stations.updateOne(
                {
                    ID: evstation
                }, 
                {
                    $push: {
                        consumerN: name,
                        consumerPh: phone,
                        consumerE: email,
                        Timing: timing
                    }
                }
            );
            console.log(result)
            if(result.acknowledged === true)
            {
                return res.json({ status : 'ok' })
            }
            return res.json({ status: 'failed', idx: '10', error: 'Slots already booked' });
        }
    } catch (err) {
        return res.json({ status: 'failed', idx: '10', error: err });
    }
})

app.post('/api/getDetails', async (req, res) => {
	const { ID } = req.body
    try {
        const user = await Stations.findOne({ ID }).lean()
        return res.json({ status : 'ok', name: user.consumerN, phone: user.consumerPh, email: user.consumerE, timing: user.Timing })
    } catch(err) {
        return res.json({ status: 'failed', idx: '10', error: 'Invalid Charging station' });
    }
})

var port=process.env.PORT || 3000

app.listen(port, ()=> {
    console.log(`Server at ${port}`)
})