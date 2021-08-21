# AntiHate #
A simple little node app to catch and deal with hate raids on twitch (hopefully).

## How it works ##
The app logs into Twitch Chat using the credentials you provide, and keeps a 5 second rolling history of chat in it's internal buffer. Every time a new message comes in, it compares it to the messages in it's buffer. If 5 messages are similar enough, and long enough, it engages followers only (or subs only) mode, r9kbeta mode (also called "Unique Chat"), and deletes the messages that triggered it, along with timing out or banning the people in question. Then, after 30 seconds have passed, it removes the restrictions, to hopefully bring things back to normal.

In theory, legitimate chat members won't get caught, spam messages will be removed, and everything will go on as normal. Settings can be modified to suit your needs, adjusting sensitivity and the like, so hopefully everything should be customizible for you.

## How to set it up ##
First, have node.js installed. Then clone this repo using git (or download it from the zip file and unpack it), then open a command prompt in the folder you cloned/extracted into.

Next, type `npm install` to download the dependencies.

Then open `app.js` in your text editor of choice (notepad will do) and edit the settings at the top of the file. They're all documented, and should be reasonably sane defaults. You will need to get your oAuth token, which you [can do here](https://twitchapps.com/tmi/), and make sure you put in your username in lower-case.

Once you've saved your changes, run `node app.js`, and the app will run and connect to Twitch. You're now up and running.

To close, press `CTRL-C`.

Any problems, bugs, anything like that, do let me know, raise a ticket or whatever.