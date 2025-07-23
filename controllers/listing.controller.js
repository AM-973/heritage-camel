const express = require('express')
const router = express.Router()
const Listing = require('../models/listing')
const isSignedIn = require('../middleware/is-signed-in')
const upload = require('../config/multer')
const cloudinary = require('../config/cloudinary')

router.get('/new', isSignedIn, (req, res) => {
    res.render('listings/new.ejs')
})

router.post('/', isSignedIn, upload.single('image'), async (req, res) => {
    try {
        req.body.User = req.session.user._id
        req.body.image = {
            url: req.file.path,
            cloudinary_id: req.file.filename
        }
        await Listing.create(req.body)
        res.redirect('/listings')
    } catch (error) {
        console.log(error)
        res.send('Something went wrong')
    }
})

router.get('/', async (req, res) => {
    const foundListings = await Listing.find().populate('User')
    
    res.render('listings/index.ejs', { foundListings: foundListings })
})

router.get('/mylistings', isSignedIn, async (req, res) => {
    try {
        const userListings = await Listing.find({ User: req.session.user._id }).populate('User')
        
        res.render('listings/mylistings.ejs', { foundListings: userListings })
    } catch (error) {
        console.log(error)
        res.redirect('/')
    }
})


router.get('/:listingId', async (req, res) => {
    try {
        const foundListing = await Listing.findById(req.params.listingId).populate('User').populate('comments.author')
        
        res.render('listings/show.ejs', { foundListing: foundListing })
    } catch (error) {
        console.log(error)
        res.redirect('/')
    }
})

router.delete('/:listingId', isSignedIn, async (req, res) => {
    try {
        const foundListing = await Listing.findById(req.params.listingId).populate('User')

        if (!foundListing.User._id.equals(req.session.user._id)) return res.send('Not authorized')

        if (foundListing.image?.cloudinary_id) {
            await cloudinary.uploader.destroy(foundListing.image.cloudinary_id)
        }

        await foundListing.deleteOne()
        res.redirect('/listings')
    } catch (err) {
        console.error(err)
        res.send('Error deleting listing')
    }
})

router.get('/:listingId/edit', isSignedIn, async (req, res) => {
    const foundListing = await Listing.findById(req.params.listingId).populate('User')

    if (foundListing.User._id.equals(req.session.user._id)) {
        return res.render('listings/edit.ejs', { foundListing: foundListing })
    }
    return res.send('Not authorized')


})


router.put('/:listingId', isSignedIn, upload.single('image'), async (req, res) => {
    try {
        const foundListing = await Listing.findById(req.params.listingId).populate('User')
        if (!foundListing) {
            return res.send('Listing not found')
        }
        if (!foundListing.User._id.equals(req.session.user._id)) {
            return res.send('Not authorized')
        }
        foundListing.title = req.body.title
        foundListing.description = req.body.description
        foundListing.location = req.body.location
        foundListing.notes = req.body.notes
        if (req.body.date) {
            foundListing.date = new Date(req.body.date)
        }
        if (req.file) {
            if (foundListing.image?.cloudinary_id) {
                try {
                    await cloudinary.uploader.destroy(foundListing.image.cloudinary_id)
                } catch (cloudinaryError) {
                }
            }
            foundListing.image = {
                url: req.file.path,
                cloudinary_id: req.file.filename
            }
        }
        await foundListing.save()
        return res.redirect(`/listings/${req.params.listingId}`)

    } catch (error) {
        res.send('ERROR 404')
    }
})

router.post('/:listingId/comments', isSignedIn, async (req, res) => {
    try {
        const foundListing = await Listing.findById(req.params.listingId)
        req.body.author = req.session.user._id
        foundListing.comments.push(req.body)
        await foundListing.save()
        res.redirect(`/listings/${req.params.listingId}`)
    } catch (error) {
        res.send('ERROR 404')
    }
})

router.delete('/:listingId/comments/:commentId', isSignedIn, async (req, res) => {
    try {
        const foundListing = await Listing.findById(req.params.listingId).populate('comments.author')
        const comment = foundListing.comments.id(req.params.commentId)
        foundListing.comments.pull(req.params.commentId)
        await foundListing.save()
        res.redirect(`/listings/${req.params.listingId}`)
    } catch (error) {
        res.send('ERROR 404')
    }
})

module.exports = router