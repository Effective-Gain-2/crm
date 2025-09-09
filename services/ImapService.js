const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: "funkyhomercaat@gmail.com",
        pass: 'qwvx wcqs eysm ohvw'
    }
})

const main = async () => {
    // Wait until client connects and authorizes
    await client.connect();

    // Select and lock a mailbox. Throws if mailbox does not exist
    let lock = await client.getMailboxLock('INBOX');
    try {
        // fetch latest message source
        // client.mailbox includes information about currently selected mailbox
        // "exists" value is also the largest sequence number available in the mailbox
        let message = await client.fetchOne(client.mailbox.exists, { source: true });
        console.log(message.source.toString());

        // list subjects for all messages
        // uid value is always included in FETCH response, envelope strings are in unicode.
        for await (let message of client.fetch('1:*', { envelope: true })) {
            console.log(`${message.uid}: ${message.envelope.subject}`);
        }
    } finally {
        // Make sure lock is released, otherwise next `getMailboxLock()` never returns
        lock.release();
    }

    // log out and close connection
    await client.logout();
};

main().catch(err => console.error(err));