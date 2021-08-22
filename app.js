"use strict";
import config from './config.js';
import tmi from 'tmi.js';
import RollingArray from './lib/rollingArray.js';

const args = new Map();
const argv = process.argv.slice(2);
while (argv.length > 1) {
	let argument = new String(argv.shift());
	if (argument.startsWith("--")) { 
		argument = argument.slice(2).toLowerCase();
		args.set(argument, argv.shift());
	}
}

let channelName = config.userName;
let testMode = false;
if (args.has("testchannel")) {
	channelName = args.get("testchannel");
	testMode = true;
}

const connectionOptions = {
	options: {
		skipMembership: true,
		skipUpdatingEmotesets: true
	},
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: config.userName,
		password: config.oAuthToken
	},
	channels: [ channelName ]
}

if (!config.oAuthToken) {
	console.warn(`NOTICE: oAuthToken is not set. Will log in anonymously to ${channelName} in test mode.`);
	testMode = true;
	connectionOptions.identity = {};
}

const rollingArray = new RollingArray({ pruneFrequency: config.pruneFrequency, keepFor: config.keepFor, threshold: config.threshold, minLength: config.minLength } );

const client = new tmi.Client(connectionOptions);

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

function decorateUsername(tags) {
	let output = "";
	if (tags.staff) output += "$";
	if (tags.broadcaster) output += "&";
	if (tags.mod) output += "@";
	if (tags.vip) output += "+";
	output += tags.username;
	return output;
}

let lockdown = false;
let actedOnThisRaid = [];
setInterval(() => {
	if (lockdown && (lockdown + (raidCleanupDelay * 1000)) < Date.now()) {
		console.info(`#${channelName}: RAID timeout passed, revoking lockdown`);
		if (!testMode) {
			if (config.subsOnly) client.subscribersoff(channelName);
			else client.followersonlyoff(channelName);
			client.r9kbetaoff(channelName);
		} else {
			if (config.subsOnly) console.info(`#${channelName}: TESTMODE - would remove Subs only mode`);
			else console.info(`#${channelName}: TESTMODE - would remove Followers only mode`);
		}
		timeout = false;
		lockdown = false;
		actedOnThisRaid = [];
	}
}, 500);

client.on('message', (channel, tags, message, self) => {
	const matchingMessages = rollingArray.likeRecently(message); // Get all the messages that are similar to this one.
	switch(tags["message-type"]) {
		case "action":
			console.info(`${channel}: ${matchingMessages.length}/${similarMessageThreshold} * ${decorateUsername(tags)} ${message}`);
			break;
		case "chat":
			console.info(`${channel}: ${matchingMessages.length}/${similarMessageThreshold} <${decorateUsername(tags)}> ${message}`);
			break;
		case "whisper":
			console.info(`${channel}: ${matchingMessages.length}/${similarMessageThreshold} [${decorateUsername(tags)}] ${message}`);
			break;
		default:
			console.info(`${channel}: ${matchingMessages.length}/${similarMessageThreshold} ?${decorateUsername(tags)}? ${message}`);
			break;
	}
	if(self) return;
	if(tags.mod) return;
	if (matchingMessages.length > similarMessageThreshold) {
		// We have more similar messages than our threshold: This is a raid, batten down the hatches.
		let messageIDs = [];
		let userIDs = [];
		if (!lockdown) {
			console.warn(`${channel}: RAID DETECTED, going into lockdown`);
			if (!testMode) {
				if (config.subsOnly) client.subscribers(channel); // If subs only is set, turn on subs only.
				else client.followersonly(channel, config.followersOnlyAge); // Otherwise, turn on followers only.
				client.r9kbeta(channel); // Turn on unique chat
			} else {
				if (config.subsOnly) console.info(`${channel}: TESTMODE - would set Subs only mode`);
				else console.info(`${channel}: TESTMODE - would set Followers only mode for ${config.followersOnlyAge}`);
			}
		}
		lockdown = Date.now();
		messageIDs.push(tags.id);
		if (!actedOnThisRaid.includes(tags.username)) userIDs.push(tags.username);
		matchingMessages.forEach((val) => {
			if (val.tags.id) {
				if (!messageIDs.includes(val.tags.id)) messageIDs.push(val.tags.id);
				if (!userIDs.includes(val.tags.username) && !actedOnThisRaid.includes(val.tags.username)) userIDs.push(val.tags.username);
			}
		});
		console.info(`${channel}: RAID MEMBERS: ${userIDs.join()}`);
		if (!testMode) {
			if (!config.timeoutRaider && !config.banRaider) {
				// We're not timing out or banning anyone, so just delete the messages.
				messageIDs.forEach((id) => {
					client.deletemessage(channel, id); // Delete messages that matched.
				});
			} else {
				// We're going to timeout or ban the user, which will purge the history anyway. So no need to delete.
				userIDs.forEach((id) => {
					// And timeout or ban the user that said them as above.
					if (config.timeoutRaider) client.timeout(channel, id, config.timeoutLength, config.reason); 
					if (config.banRaider) client.ban(channel, id, config.reason);
					actedOnThisRaid.push(id);
				});
			}
		} else {
			if (!config.timeoutRaider && !config.banRaider) {
				// We're not timing out or banning anyone, so just delete the messages.
				messageIDs.forEach((id) => {
					console.info(`${channel}: TESTMODE - would delete message ${id}`);
				});
			} else {
				// We're going to timeout or ban the user, which will purge the history anyway. So no need to delete.
				userIDs.forEach((id) => {
					// And timeout or ban the user that said them as above.
					if (config.timeoutRaider) console.info(`${channel}: TESTMODE - would timeout ${id} for ${config.timeoutLength}, with reason ${config.reason}`);
					if (config.banRaider) console.info(`${channel}: TESTMODE - would ban ${id} with reason ${config.reason}`);
				});
			}
		}
		rollingArray.deleteIDs(matchingMessages.map((elem) => elem.tags.id));
	}
	rollingArray.addEntry(tags, message);
});

client.connect();