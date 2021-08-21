"use strict";
// Set up your details and preferences here.

// The channel name to work on (yours). lower-case only, please.
const channelName = "anaerin";     

// Your oAuth token.
const oAuthToken = "";

// How many similar messages there have to have been to count as a raid.
const similarMessageThreshold = 4; 

// Ban raiders?
const banRaider = true;            

// Or timeout raiders. Please don't do both, or you may run into rate limits.
const timeoutRaider = false;       

// Seconds to timeout raiders for. Only applies if timeoutRaider = true. Default is 5 minutes.
const timeoutLength = 300;         

// Set subs only? If not, followers only will be set instead.
const subsOnly = false;            

// How long someone has to have been following to be allowed in followers only mode (in minutes, default is 12 hours)
const followersOnlyAge = 720;

// Seconds before Subs/Followers only and Unique Chat are unset. Default is 5 minutes.
const raidCleanupDelay = 300;

// How often the rolling buffer should shorten itself so it doesn't eat RAM keeping a complete history of chat, in ms. Default is 1 second.
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
import RollingArray from './lib/rollingArray.js';

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

let timeout = false;

client.on('ban', (channel, username, reason) => {
	console.info(`${channel}: User ${username} banned for ${reason}`);
});

client.on('clearchat', (channel) => {
	console.info(`${channel}: Chat was cleared`);
});

client.on('connected', (address, port) => {
	console.info(`SERVER: Connected to ${address}:${port}`);
});

client.on('connecting', (address, port) => {
	console.info(`SERVER: Connecting to ${address}:${port}`);
});

client.on('disconnected', (reason) => {
	console.info(`SERVER: Disconnected from server (${reason})`);
});

client.on('emoteonly', (channel, enabled) => {
	console.info(`${channel}: Emote only mode ${enabled?"enabled":"disabled"}`);
});

client.on('followersonly', (channel, enabled, length) => {
	console.info(`${channel}: Followers only mode ${enabled?"enabled, " + length:"disabled"}`);
});

client.on('hosted', (channel, username, viewers, autohost) => {
	console.info(`${channel}: Now being ${autohost?"auto":""}hosted by ${username} with ${viewers} viewers`);
});

client.on('hosting', (channel, target, viewers) => {
	console.info(`${channel}: Now hosting ${target} for ${viewers} viewers`);
});

client.on('join', (channel, username, self) => {
	console.info(`${channel}: ${self?"We":username} joined`);
});

client.on('logon', () => {
	console.info(`SERVER: Connected, logging in`);
});

client.on('messagedeleted', (channel, username, deletedMessage, userState) => {
	console.info(`${channel}: Message ${userState["target-msg-id"]} deleted by ${username}: '${deletedMessage}'`);
});

client.on('notice', (channel, msgid, message) => {
	console.info(`${channel}: NOTICE - ${msgid} (${message})`);
});

client.on('part', (channel, username, self) => {
	console.info(`${channel}: ${self?"We":username} left`);
});

client.on('ping', () => {
	console.info(`SERVER: Received keepalive message`);
});

client.on('pong', (latency) => {
	console.info(`SERVER: Round-Trip Time ${latency}s`);
});

client.on('r9kbeta', (channel, enabled) => {
	console.info(`${channel}, r9kBeta mode ${enabled?"enabled":"disabled"}`);
});

client.on('raided', (channel, username, viewers) => {
	console.info(`${channel}: Incoming raid from ${username} with ${viewers} viewers`);
});

client.on('reconnect', () => {
	console.info(`SERVER: Reconnecting`);
});

client.on('resub', (channel, username, months, message, userstate, method) => {
	console.info(`${channel}: Resub from ${username}, ${userstate["msg-param-cumulative-months"]} months, ${userstate["msg-param-should-share-streak"]?months + " consecutively,":""} - ${message}`);
});

client.on('slowmode', (channel, enabled, length) => {
	console.info(`${channel}: Slow mode ${enabled?"enabled for "+length+" seconds":disabled}`);
});

client.on('subgift', (channel, username, streak, recipient, method, userstate) => {
	console.info(`${channel}: Sub Gift from ${username} to ${recipient}; ${userstate["msg-param-sender-count"]} gifts from them.`);
});

client.on('submysterygift', (channel, username, number, method, userstate) => {
	console.info(`${channel}: Sub Mystery Gift ${number} from ${userstate}; ${userstate["msg-param-sender-count"]} gifts from them.`);
});

client.on('subscribers', (channel, enabled) => {
	console.info(`${channel}: Subscribers only mode ${enabled?"enabled":"disabled"}`);
});

client.on('subscription', (channel, username, method, message, userstate) => {
	console.info(`${channel}: Subscription from ${username} - ${message}`);
});

client.on('timeout', (channel, username, reason, duration) => {
	console.info(`${channel}: Timeout for ${username} (${duration} seconds)`);
});

client.on('unhost', (channel, viewers) => {
	console.info(`${channel}: Stopped hosting with ${viewers} viewers`);
});

client.on('message', (channel, tags, message, self) => {
	switch(tags["message-type"]) {
		case "action":
			console.info(`${channel}: * ${tags["username"]} ${message}`);
			break;
		case "chat":
			console.info(`${channel}: <${tags["username"]}> ${message}`);
			break;
		case "whisper":
			console.info(`${channel}: [${tags["username"]}] ${message}`);
			break;
		default:
			console.info(`${channel}: ?${tags["username"]}? ${message}`);
			break;
	}
	
	if(self) return;
	const matchingMessages = rollingArray.likeRecently(message); // Get all the messages that are similar to this one.
	console.info(`${channel}: Matches ${matchingMessages.length} messages in history`);
	if (matchingMessages.length > similarMessageThreshold) {
		// We have more similar messages than our threshold: This is a raid, batten down the hatches.
		console.warn(`${channel}: RAID DETECTED, going into lockdown`);
		let messageIDs = [];
		let userIDs = [];
		if (subsOnly) client.subscribers(channelName); // If subs only is set, turn on subs only.
		else client.followersonly(channelName, followersOnlyAge); // Otherwise, turn on followers only.
		client.r9kbeta(channelName); // Turn on unique chat
		messageIDs.push(tags.id);
		userIDs.push(tags.username);
		matchingMessages.forEach((val) => {
			if (val.tags.id) {
				if (!messageIDs.includes(val.tags.id)) messageIDs.push(val.tags.id);
				if (!userIDs.includes(val.tags.username)) userIDs.push(val.tags.username);
			}
		});
		console.info(`${channel}: RAID MEMBERS: ${userIDs.join()}`);
		if (!timeoutRaider && !banRaider) {
			// We're not timing out or banning anyone, so just delete the messages.
			messageIDs.forEach((id) => {
				client.deletemessage(channelName, id); // Delete messages that matched.
			});
		} else {
			// We're going to timeout or ban the user, which will purge the history anyway. So no need to delete.
			userIDs.forEach((id) => {
				// And timeout or ban the user that said them as above.
				if (timeoutRaider) client.timeout(channelName, id, timeoutLength, reason); 
				if (banRaider) client.ban(channelName, id, reason);
			});
		}
		rollingArray.deleteIDs(matchingMessages.map((elem) => elem.tags.id));
		if (!timeout) {
			// If we don't have a timeout already set, set one to clear the subs/followers only and unique chat.
			setTimeout(() => {
				console.info(`${channel}: RAID timeout passed, revoking lockdown`);
				if (subsOnly) client.subscribersoff(channelName);
				else client.followersonlyoff(channelName);
				client.r9kbetaoff(channelName);
				timeout = false;
			}, raidCleanupDelay * 1000);
		}
	}
	rollingArray.addEntry(tags, message);
});

client.connect();