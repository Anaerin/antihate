"use strict";
// Set up your details and preferences here.

// The channel name to join (yours).
const channelName = "anaerin";     

// Your oAuth token.
const oAuthToken = "";             

// How many similar messages there have to have been to count as a raid.
const similarMessageThreshold = 4; 

// Ban raiders.
const banRaider = true;            

// Timeout raiders. Please don't do both, or you may run into rate limits.
const timeoutRaider = false;       

// Seconds to timeout raiders for. Only applies if timeoutRaider = true. Default is 5 minutes.
const timeoutLength = 300;         

// Set subs only? If not, followers only will be set instead.
const subsOnly = false;            

// How long someone has to have been following to be allowed in followers only mode (in minutes, default is 12 hours)
const followersOnlyAge = 720;

// Seconds before Subs/Followers only and Unique Chat are unset. Default is 30.
const raidCleanupDelay = 30;

// How often the array should shorten itself so it doesn't eat RAM keeping a complete history of chat, in ms. Default is 1 second.
const pruneFrequency = 1000;

// How long (in ms) to keep messages in the buffer. Default is 5 seconds.
const keepFor = 5000;

// How unique messages have to be to trigger the likeness. 1 is identical, 0 is completely different. Default is 0.9
const threshold = 0.9;

// Minimum length the messages have to be to count. default is 30 characters.
const minLength = 30;

// Reason to use in timeouts and bans.
const reason = "[AUTOMATIC] Part of a raid"

// Shouldn't need to touch anything below this line.
//-------------------------------------------------------------------------------------------------------------------------------------------

import tmi from 'tmi.js';
import RollingArray from './lib/rollingArray';

const rollingArray = new RollingArray({ pruneFrequency, keepFor, threshold, minLength } );

const client = new tmi.Client({
	options: {
		skipMembership: true,
		skipUpdatingEmotesets: true
	},
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: channelName,
		password: oAuthToken
	},
	channels: [ channelName ]
});

client.connect();

let timeout = false;

client.on('message', (channel, tags, message, self) => {
	if(self) return;
	const matchingMessages = rollingArray.likeRecently(message); // Get all the messages that are similar to this one.
	if (matchingMessages.length > similarMessageThreshold) {
		// We have more similar messages than our threshold: This is a raid, batten down the hatches.
		if (subsOnly) client.subscribers(channelName); // If subs only is set, turn on subs only.
		else client.followersonly(channelName, followersOnlyAge); // Otherwise, turn on followers only.
		client.r9kbeta(channelName); // Turn on unique chat
		client.deletemessage(channelName, tags.id); // Delete the message that just tripped the alert
		if (timeoutRaider) client.timeout(channelName, tags.username, timeoutLength, reason); // If timeout is set, timeout the user that tripped the alert
		if (banRaider) client.ban(channelName, tags.username, reason); // if ban is set, ban the user that tripped the alert
		matchingMessages.forEach((val) => {
			if (val.tags.id) {
				client.deletemessage(channelName, val.tags.id); // Delete the previous messages that matched.
				// And timeout or ban as above.
				if (timeoutRaider) client.timeout(channelName, val.tags.username, timeoutLength, reason); 
				if (banRaider) client.ban(channelName, val.tags.username, reason);
			}
		});
		rollingArray.deleteIDs(matchingMessages.map((elem) => elem.tags.id));
		if (!timeout) {
			// If we don't have a timeout already set, set one to clear the subs/followers only and unique chat.
			setTimeout(() => {
				if (subsOnly) client.subscribersoff(channelName);
				else client.followersonlyoff(channelName);
				client.r9kbetaoff(channelName);
				timeout = false;
			}, raidCleanupDelay * 1000);
		}
	}
	rollingArray.addEntry(tags, message);
});