import { compareTwoStrings } from './compareStrings.js';
export default class RollingArray {
	#arr = [];
	#keepFor;
	#shears;
	#threshold;
	#minLength;
	constructor({ pruneFrequency = 1000, keepFor = 5000, threshold = 0.9, minLength = 30}) {
		this.#keepFor = keepFor;
		this.#shears = setInterval(this.#pruneEntries.bind(this), pruneFrequency);
		this.#threshold = threshold;
		this.#minLength = minLength;
	}
	addEntry(tags, what) {
		this.#arr.push({
			time: Date.now(),
			tags: tags,
			what: what
		});
	}
	deleteIDs(ids) {
		ids.forEach((id) => {
			this.#arr.forEach((elem) => {
				if (elem.tags.id == id) elem.tags.id = false;
			});
		});
	}
	#pruneEntries() {
		let entries = this.#arr.reduce((acc, val, idx) => {
			return acc + (val.time < (Date.now() - this.#keepFor));
		}, 0);
		this.#arr.splice(0,entries);
	}
	likeRecently(message) {
		return this.#arr.map((val) => {
			if (val.what.length < this.#minLength) return;
			let similarity = compareTwoStrings(message, val.what);
			if (similarity < this.#threshold) {
				return val;
			}
		});
	}
}