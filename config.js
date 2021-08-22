export default config = {
	// The channel name to work on (yours). lower-case only, please.
	userName:"anaerin",

	// Your oAuth token.
	oAuthToken:"",

	// How many similar messages there have to have been to count as a raid.
	similarMessageThreshold:4,

	// Ban raiders?
	banRaider: true,

	// Or timeout raiders. Please don't do both, or you may run into rate limits.
	timeoutRaider: false,

	// Seconds to timeout raiders for. Only applies if timeoutRaider: true. Default is 5 minutes.
	timeoutLength: 300,

	// Set subs only? If not, followers only will be set instead.
	subsOnly: false,

	// How long someone has to have been following to be allowed in followers only mode (in minutes, default is 12 hours)
	followersOnlyAge: 720,

	// Seconds before Subs/Followers only and Unique Chat are unset. Default is 5 minutes.
	raidCleanupDelay: 300,

	// How often the rolling buffer should shorten itself so it doesn't eat RAM keeping a complete history of chat, in ms. Default is 1 second.
	pruneFrequency: 1000,

	// How long (in ms) to keep messages in the buffer. Default is 5 seconds.
	keepFor: 5000,

	// How unique messages have to be to trigger the likeness. 1 is identical, 0 is completely different. Default is 0.9
	threshold: 0.9,

	// Minimum length the messages have to be to count. default is 30 characters.
	minLength: 30,

	// Reason to use in timeouts and bans.
	reason: "[AUTOMATIC] Part of a raid"
}
