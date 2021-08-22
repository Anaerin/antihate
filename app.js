"use strict";
import config from './config.js';
import tmi from 'tmi.js';
import RollingArray from './lib/rollingArray.js';
import UI from './lib/console.js';

const ui = new UI();

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

ui.setStatus("Disconnected.");
const client = new tmi.Client(connectionOptions);

let timeout = false;

client.on('ban', (channel, username, reason) => {
	ui.log(`${channel}:   {blue-fg}User ${username} banned for ${reason}{/}`);
});

client.on('clearchat', (channel) => {
	ui.log(`${channel}:   {blue-fg}Chat was cleared{/}`);
});

client.on('connected', (address, port) => {
	ui.log(`{red-fg}SERVER: Connected to ${address}:${port}{/}`);
	ui.setStatus(`Connected to ${address}:${port}`);
});

client.on('connecting', (address, port) => {
	ui.log(`{red-fg}SERVER: Connecting to ${address}:${port}{/}`);
	ui.setStatus(`Connecting to ${address}:${port}...`);
});

client.on('disconnected', (reason) => {
	ui.log(`{red-fg}SERVER: Disconnected from server (${reason}){/}`);
	ui.setStatus(`Disconnected`);
});

client.on('emoteonly', (channel, enabled) => {
	ui.log(`${channel}:   {blue-fg}Emote only mode ${enabled?"enabled":"disabled"}{/}`);
});

client.on('followersonly', (channel, enabled, length) => {
	ui.log(`${channel}:   {blue-fg}Followers only mode ${enabled?"enabled, " + length:"disabled"}{/}`);
});

client.on('hosted', (channel, username, viewers, autohost) => {
	ui.log(`${channel}:   {blue-fg}Now being ${autohost?"auto":""}hosted by ${username} with ${viewers} viewers{/}`);
});

client.on('hosting', (channel, target, viewers) => {
	ui.log(`${channel}:   {blue-fg}Now hosting ${target} for ${viewers} viewers{/}`);
});

client.on('join', (channel, username, self) => {
	ui.log(`${channel}:   {blue-fg}${self?"We":username} joined channel ${channel}{/}`);
});

client.on('logon', () => {
	ui.log(`{red-fg}SERVER: Connected, logging in{/}`);
	ui.setStatus(`Connected, logging in...`);
});

client.on('messagedeleted', (channel, username, deletedMessage, userState) => {
	ui.log(`${channel}:   {red-fg}Message ${userState["target-msg-id"]} deleted by ${username}: '{white-fg}${deletedMessage}'{/}`);
});

client.on('notice', (channel, msgid, message) => {
	ui.log(`${channel}:   {fg-green}NOTICE - ${msgid} (${message}){/}`);
});

client.on('part', (channel, username, self) => {
	ui.log(`${channel}:   {blue-fg}${self?"We":username} left channel ${channel}{/}`);
});

client.on('ping', () => {
	ui.log(`{red-fg}SERVER: Received keepalive message{/}`);
});

client.on('pong', (latency) => {
	ui.setLatency(latency);
});

client.on('r9kbeta', (channel, enabled) => {
	ui.log(`${channel}:   {blue-fg}r9kBeta mode ${enabled?"enabled":"disabled"}{/}`);
});

client.on('raided', (channel, username, viewers) => {
	ui.log(`${channel}:   {yellow-fg}Incoming raid from ${username} with ${viewers} viewers{/}`);
});

client.on('reconnect', () => {
	ui.log(`{red-fg}SERVER: Reconnecting{/}`);
	ui.setStatus(`Reconnecting...`);
});

client.on('resub', (channel, username, months, message, userstate, method) => {
	ui.log(`${channel}:   {blue-fg}Resub from ${username}, ${userstate["msg-param-cumulative-months"]} months, ${userstate["msg-param-should-share-streak"]?months + " consecutively,":""} - {white-fg}${message}{/}`);
});

client.on('slowmode', (channel, enabled, length) => {
	ui.log(`${channel}:   {blue-fg}Slow mode ${enabled?"enabled for "+length+" seconds":disabled}{/}`);
});

client.on('subgift', (channel, username, streak, recipient, method, userstate) => {
	ui.log(`${channel}:   {blue-fg}Sub Gift from ${username} to ${recipient}; ${userstate["msg-param-sender-count"]} gifts from them.{/}`);
});

client.on('submysterygift', (channel, username, number, method, userstate) => {
	ui.log(`${channel}:   {blue-fg}Sub Mystery Gift ${number} from ${userstate}; ${userstate["msg-param-sender-count"]} gifts from them.{/}`);
});

client.on('subscribers', (channel, enabled) => {
	ui.log(`${channel}:   {blue-fg}Subscribers only mode ${enabled?"enabled":"disabled"}{/}`);
});

client.on('subscription', (channel, username, method, message, userstate) => {
	ui.log(`${channel}:   {blue-fg}Subscription from ${username} - {white-fg}${message}{/}`);
});

client.on('timeout', (channel, username, reason, duration) => {
	ui.log(`${channel}:   {blue-fg}Timeout for ${username} (${duration} seconds){/}`);
});

client.on('unhost', (channel, viewers) => {
	ui.log(`${channel}:   {blue-fg}Stopped hosting with ${viewers} viewers{/}`);
});

function decorateUsername(tags) {
	let output = "";
	if (tags.staff) output += "{cyan-fg}$";
	if (tags.broadcaster) output += "{lightred-fg}&";
	if (tags.mod) output += "{lightblue-fg}@";
	if (tags.vip) output += "{lightmagenta-fg}+";
	output += tags.username;
	return output + "{/}";
}

let lockdown = false;
let actedOnThisRaid = [];
setInterval(() => {
	if (lockdown && (lockdown + (config.raidCleanupDelay * 1000)) < Date.now()) {
		ui.log(`#${channelName}:   {red-fg}RAID timeout passed, revoking lockdown{/}`);
		ui.setStatus(`Connected...`);
		ui.clearRaiders();
		if (!testMode) {
			if (config.subsOnly) client.subscribersoff(channelName);
			else client.followersonlyoff(channelName);
			client.r9kbetaoff(channelName);
		} else {
			if (config.subsOnly) ui.log(`#${channelName}:   {red-fg}TESTMODE - would remove Subs only mode{/}`);
			else ui.log(`#${channelName}:   {red-fg}TESTMODE - would remove Followers only mode{/}`);
		}
		timeout = false;
		lockdown = false;
		actedOnThisRaid = [];
	}
}, 500);

client.on('message', (channel, tags, message, self) => {
	const matchingMessages = rollingArray.likeRecently(message); // Get all the messages that are similar to this one.
	const matchLevel = matchingMessages.length / config.similarMessageThreshold;
	let matchIndicator;
	if (matchLevel < 0.25) matchIndicator = "{black-bg} {/}";
	else if (matchLevel < 0.5) matchIndicator = "{green-bg} {/}";
	else if (matchLevel < 0.75) matchIndicator = "{yellow-bg} {/}";
	else matchIndicator = "{red-bg}{black-fg}!{/}";
	switch(tags["message-type"]) {
		case "action":
			ui.log(`${channel}: ${matchIndicator} * ${decorateUsername(tags)} ${ui.escape(message)}`);
			break;
		case "chat":
			ui.log(`${channel}: ${matchIndicator} <${decorateUsername(tags)}> ${ui.escape(message)}`);
			break;
		case "whisper":
			//ui.log(`${channel}: ${matchIndicator} [${decorateUsername(tags)}] ${message}`); We don't deal with whispers
			return;
		default:
			ui.log(`${channel}: ${matchIndicator} ?${decorateUsername(tags)}? ${ui.escape(message)}`);
			break;
	}
	if(self) return;
	if(tags.mod) return;
	if (matchingMessages.length > config.similarMessageThreshold) {
		// We have more similar messages than our threshold: This is a raid, batten down the hatches.
		let messageIDs = [];
		let userIDs = [];
		if (!lockdown) {
			ui.lockdown(true);
			ui.log(`${channel}:   {red-bg}{white-fg}RAID DETECTED, going into lockdown{/}`);
			ui.setStatus(`LOCKDOWN`);
			if (!testMode) {
				if (config.subsOnly) client.subscribers(channel); // If subs only is set, turn on subs only.
				else client.followersonly(channel, config.followersOnlyAge); // Otherwise, turn on followers only.
				client.r9kbeta(channel); // Turn on unique chat
			} else {
				if (config.subsOnly) ui.log(`${channel}:   {red-fg}TESTMODE - would set Subs only mode{/}`);
				else ui.log(`${channel}:   {red-fg}TESTMODE - would set Followers only mode for ${config.followersOnlyAge}{/}`);
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
		//ui.log(`${channel}: RAID MEMBERS: ${userIDs.join()}`);
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
					ui.log(`${channel}:   {red-fg}TESTMODE - would delete message ${id}{/}`);
				});
			} else {
				// We're going to timeout or ban the user, which will purge the history anyway. So no need to delete.
				userIDs.forEach((id) => {
					// And timeout or ban the user that said them as above.
					if (config.timeoutRaider) ui.log(`${channel}:   {red-fg}TESTMODE - would timeout ${id} for ${config.timeoutLength}, with reason ${config.reason}{/}`);
					if (config.banRaider) ui.log(`${channel}:   {red-fg}TESTMODE - would ban ${id} with reason ${config.reason}{/}`);
					actedOnThisRaid.push(id);
				});
			}
		}
		ui.setRaiders(actedOnThisRaid);
		rollingArray.deleteIDs(matchingMessages.map((elem) => elem.tags.id));
	}
	rollingArray.addEntry(tags, message);
});

client.connect();