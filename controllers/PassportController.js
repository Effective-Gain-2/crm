const passportButton = async (req, res) => {
    res.send("<a href='/auth/google-login'>Login with Google</a>")
}

const passportCallback = async (req, res) => {
    if (req.user) {
        const userData = {
            id: req.user.id,
            displayName: req.user.displayName,
            email: req.user.emails?.[0]?.value,
            photos: req.user.photos?.[0]?.value,
            provider: req.user.provider
        };
        
        res.redirect(`http://localhost:3001/gmail-success?data=${encodeURIComponent(JSON.stringify(userData))}`);
    } else {
        res.redirect('http://localhost:3001/gmail-error');
    }
}

module.exports ={passportButton, passportCallback}
