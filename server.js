require('dotenv').config({ quiet: true })
const express = require('express')
const app = express()
const methodOverride = require('method-override')
const morgan = require('morgan')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const path = require('path')
const authController = require('./controllers/auth.controller')
const listingController = require('./controllers/listing.controller')
const isSignedIn = require('./middleware/is-signed-in')
const passUserToView = require('./middleware/pass-user-to-view')


// DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
mongoose.connection.on('connected', () => {
    console.log(`Connected to MongoDB ${mongoose.connection.name} 🙃.`)
})


app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))
app.use(morgan('dev'))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
    })
}))
app.use(passUserToView)

app.get('/', (req, res) => {
    res.render('index.ejs', { title: 'my App'})
})

app.use(express.static(path.join(__dirname, 'public')))

app.use('/auth', authController)
app.use('/listings', listingController)

const port = process.env.PORT ? process.env.PORT : "3000"
app.listen(port, () => {
    console.log(`The express app is ready on port ${port}`)
})