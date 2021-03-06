'use strict';

/**@type {{[k: string]: ItemData}} */
let BattleItems = {
	"assaultjacket": {
		id: "assaultjacket",
		name: "Assault Jacket",
		spritenum: 581,
		fling: {
			basePower: 80,
		},
		onModifyDefPriority: 1,
		onModifyDef: function (def) {
			return this.chainModify(1.5);
		},
		onDisableMove: function (pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				if (this.getMove(moveSlot.move).category === 'Status') {
					pokemon.disableMove(moveSlot.id);
				}
			}
		},
		num: 640,
		gen: 6,
		desc: "Holder's Def is 1.5x, but it can only select damaging moves.",
	},
	"assaultarmor": {
		id: "assaultarmor",
		name: "Assault Armor",
		spritenum: 581,
		fling: {
			basePower: 80,
		},
		onModifyDefPriority: 1,
		onModifyDef: function (def) {
			return this.chainModify(1.3);
		},
		onModifySpDPriority: 1,
		onModifySpD: function (spd) {
			return this.chainModify(1.3);
		},
		onDisableMove: function (pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				if (this.getMove(moveSlot.move).category === 'Status') {
					pokemon.disableMove(moveSlot.id);
				}
			}
		},
		num: 640,
		gen: 6,
		desc: "Holder's Def and SpD are 1.3x, but it can only select damaging moves.",
	},
	"brightpowder": {
		id: "brightpowder",
		name: "Bright Powder",
		spritenum: 51,
		fling: {
			basePower: 10,
		},
		onSourceModifyDamage: function (damage, source, target, move) {
			if (move.type === 'Ghost' || move.type === 'Dark') {
				this.debug('-30% reduction');
					this.add(target, this.effect, '[weaken]');
					return this.chainModify(0.7);
			}
		},
		num: 213,
		gen: 2,
		desc: "The holder takes 30% less damage from Dark and Ghost Attacks.",
	},
};

exports.BattleItems = BattleItems;
