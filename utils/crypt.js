const crypto = require('crypto');

const iv = crypto.randomBytes(16)
function cryptText (text){
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.SECRET_KEY, 'hex'), iv)
    let encrypted = cipher.update(text, 'utf-8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
}

function decryptText (text){
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.SECRET_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = {
    cryptText,
    decryptText
}