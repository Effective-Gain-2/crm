const express = require('express');
const { passportButton, passportCallback } = require('../controllers/PassportController');
const passport = require('passport');
const router = express.Router();

router.get('/google-button', passportButton);

router.get('/google-login', passport.authenticate('google', {scope:["profile", "email"]}));

router.get('/google', (req, res) => {
    passport.authenticate('google', {failureRedirect:'/auth/google-button'}, (err, user, info) => {
        if (err) {
            return res.redirect('/auth/google-button');
        }
        if (!user) {
            return res.redirect('/auth/google-button');
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.redirect('/auth/google-button');
            }
            passportCallback(req, res);
        });
    })(req, res);
});

router.get('/profile', (req, res)=>{
    if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const userData = {
        id: req.user.id,
        displayName: req.user.displayName,
        email: req.user.emails?.[0]?.value,
        photos: req.user.photos?.[0]?.value,
        provider: req.user.provider
    };
    
    res.json(userData);
});

router.get('/status', (req, res) => {
    if (req.user) {
        res.json({ 
            authenticated: true, 
            user: {
                displayName: req.user.displayName,
                email: req.user.emails?.[0]?.value
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router