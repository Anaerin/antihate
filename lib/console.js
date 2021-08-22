'use strict';
import blessed from 'blessed';
import contrib from 'blessed-contrib';
export default class UI {
	#screen;
	#log;
	#status;
	#latency;
	#raiders;
	#grid;
	constructor() {
		this.#screen = blessed.screen({
			smartCSR: true,
			dockBorders: true,
			title: "Anti-Hate Bot"
		});
		this.#grid = new contrib.grid({
			rows: 20, cols: 6, screen: this.#screen
		});
		this.#status = this.#grid.set(0,0,1,5, blessed.box, {
			border: {
				type: 'line'
			},
			style: {
				fg: 'white'
			},
			label: 'Status'
		});
		this.#status.height = 3;
		this.#latency = this.#grid.set(0,5,1,1, blessed.box, {
			width: '20%',
			height: '50',
			border: {
				type: 'line'
			},
			style: {
				fg: 'white'
			},
			label: 'Latency',
			align: 'center'
		});
		this.#latency.height = 3;
		this.#log = this.#grid.set(1,0,19,5, blessed.log, {
			width: '80%',
			border: {
				type: 'line'
			},
			style: {
				fg: 'white'
			},
			label: 'Chat Log',
			tags: true,
			scrollback: 1000
		});
		this.#log.top = 3;
		this.#raiders = this.#grid.set(1,5,19,1, blessed.list, {
			width: '20%',
			border: {
				type: 'line'
			},
			style: {
				fg: 'white'
			},
			label: 'Raiders'
		});
		this.#raiders.top = 3;
		this.#screen.key(['escape', 'q', 'C-c'], (ch, key) => {
			return process.exit(0);
		});
		this.#screen.render();
	}
	setLatency(latency) {
		this.#latency.content = `${latency}s`;
		if (latency < 0.5) this.#latency.style.fg = 'green';
		else if (latency < 0.75) this.#latency.style.fg = 'yellow';
		else this.#latency.style.fg = 'red';
	}
	setRaiders(raiders) {
		this.#raiders.clearItems();
		this.#raiders.setItems(raiders);
		//this.log(`--RAIDERS: ${raiders.join()}--`);
	}
	clearRaiders() {
		this.#raiders.clearItems();
	}
	setStatus(status) {
		this.#status.content = status;
	}
	log(value) {
		this.#log.log(value);
	}
	lockdown(enabled=false) {
		if (enabled) {
			this.#status.style.bg = 'red';
			this.#status.style.fg = 'black';
		} else {
			this.#status.style.bg = 'black';
			this.#status.style.fg = 'white';
		}
	}
	escape(message) {
		return blessed.escape(message);
	}
}