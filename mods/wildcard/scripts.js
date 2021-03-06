'use strict';

exports.BattleScripts = {
	getAbility(name) {
		let item = this.getItem(name);
		return item.exists ? item : Object.getPrototypeOf(this).getAbility.call(this, name);
	},
	getEffect: function (name) {
		if (name && typeof name !== 'string') {
			return name;
		}
		let id = toId(name);
		if (id.startsWith('ability')) return Object.assign(Object.create(this.getAbility(id.slice(7))), {id});
		return Object.getPrototypeOf(this).getEffect.call(this, name);
	},
	getZMove(move, pokemon, skipChecks) {
		let item = pokemon.getItem();
		let dual = pokemon.getAbility();
		if (pokemon.side.zMoveUsed) return;
		if (!item.zMove && !dual.zMove) return;
		if (item.zMoveUser && !item.zMoveUser.includes(pokemon.template.species)) return;
		let moveData = pokemon.getMoveData(move);
		if (!moveData || !moveData.pp) return; // Draining the PP of the base move prevents the corresponding Z-move from being used.

		if (move.name === item.zMoveFrom) {
			if (item.zMoveUser && !item.zMoveUser.includes(pokemon.template.species)) return;
			return item.zMove;
		}
		if (move.name === dual.zMoveFrom) {
			if (dual.zMoveUser && !dual.zMoveUser.includes(pokemon.template.species)) return;
			return dual.zMove;
		}
		if (move.type === item.zMoveType || move.type === dual.zMoveType) {
			if (move.category === "Status") {
				return move.name;
			} else if (move.zMovePower) {
				return this.zMoveTable[move.type];
			}
		}
	},
	getZMoveCopy(move, pokemon) {
		move = this.getMove(move);
		let zMove;
		if (pokemon) {
			let item = pokemon.getItem();
			if (move.name === item.zMoveFrom) {
				return this.getMoveCopy(item.zMove);
			}
			let dual = pokemon.getAbility();
			if (move.name === dual.zMoveFrom) {
				return this.getMoveCopy(dual.zMove);
			}
		}

		if (move.category === 'Status') {
			zMove = this.getMoveCopy(move);
			zMove.isZ = true;
			return zMove;
		}
		zMove = this.getMoveCopy(this.zMoveTable[move.type]);
		zMove.basePower = move.zMovePower;
		zMove.category = move.category;
		return zMove;
	},
	canZMove(pokemon) {
		if (pokemon.side.zMoveUsed) return;
		let atLeastOne = false;
		let zMoves = [];
		for (let i = 0; i < pokemon.moves.length; i++) {
			if (pokemon.moveSlots[i].pp <= 0) {
				zMoves.push(null);
				continue;
			}
			let move = this.getMove(pokemon.moves[i]);
			if (this.getZMove(move, pokemon)) {
				let zMove = this.getZMoveCopy(move, pokemon);
				zMoves.push({move: zMove.name, target: zMove.target, basePower: zMove.basePower, category: zMove.category});
				atLeastOne = true;
			} else {
				zMoves.push(null);
			}
		}
		if (atLeastOne) return zMoves;
	},
	pokemon: {
		hasItem(item) {
			if (this.ignoringItem()) return false;
			if (!Array.isArray(item)) {
				item = toId(item);
				return item === this.item || item === this.ability;
			}
			item = item.map(toId);
			return item.includes(this.item) || item.includes(this.ability);
		},
		eatItem() {
			if (!this.hp || !this.isActive) return false;
			let source = this.battle.event.target;
			let item = this.battle.effect;
			if (this.battle.runEvent('UseItem', this, null, null, item) && this.battle.runEvent('TryEatItem', this, null, null, item)) {
				this.battle.add('-enditem', this, item, '[eat]');

				this.battle.singleEvent('Eat', item, this.itemData, this, source, item);
				this.battle.runEvent('EatItem', this, null, null, item);

				this.lastItem = this.item;
				if (this.item === item.id) {
					this.item = '';
					this.itemData = {id: '', target: this};
				}
				if (this.ability === item.id) {
					this.baseAbility = this.ability = '';
					this.abilityData = {id: '', target: this};
				}
				this.usedItemThisTurn = true;
				this.ateBerry = true;
				this.battle.runEvent('AfterUseItem', this, null, null, item);
				return true;
			}
			return false;
		},
		useItem(unused, source) {
			let item = this.battle.effect;
			if ((!this.hp && !item.isGem) || !this.isActive) return false;
			if (!source && this.battle.event && this.battle.event.target) source = this.battle.event.target;
			if (this.battle.runEvent('UseItem', this, null, null, item)) {
				switch (item.id) {
				case 'redcard':
					this.battle.add('-enditem', this, item, '[of] ' + source);
					break;
				default:
					if (!item.isGem) {
						this.battle.add('-enditem', this, item);
					}
					break;
				}

				this.battle.singleEvent('Use', item, this.itemData, this, source, item);

				this.lastItem = this.item;
				if (this.item === item.id) {
					this.item = '';
					this.itemData = {id: '', target: this};
				}
				if (this.ability === item.id) {
					this.baseAbility = this.ability = '';
					this.abilityData = {id: '', target: this};
				}
				this.usedItemThisTurn = true;
				this.battle.runEvent('AfterUseItem', this, null, null, item);
				return true;
			}
			return false;
		},
		isGrounded(negateImmunity) {
			if ('gravity' in this.battle.pseudoWeather) return true;
			if ('ingrain' in this.volatiles && this.battle.gen >= 4) return true;
			if ('smackdown' in this.volatiles) return true;
			let item = (this.ignoringItem() ? '' : this.item);
			let dual = (this.ignoringItem() ? '' : this.ability);
			if (item === 'ironball' || dual === 'ironball') return true;
			// If a Fire/Flying type uses Burn Up and Roost, it becomes ???/Flying-type, but it's still grounded.
			if (!negateImmunity && this.hasType('Flying') && !('roost' in this.volatiles)) return false;
			if (this.hasAbility('levitate') && !this.battle.suppressingAttackEvents()) return null;
			if ('magnetrise' in this.volatiles) return false;
			if ('telekinesis' in this.volatiles) return false;
			return item !== 'airballoon' && dual !== 'airballoon';
		},
		setAbility: function (ability, source, isFromFormechange) {
			if (!this.hp) return false;
			ability = this.battle.getAbility(ability);
			let oldAbility = this.ability;
			if (!isFromFormechange) {
				if (['illusion', 'battlebond', 'comatose', 'disguise', 'multitype', 'powerconstruct', 'rkssystem', 'schooling', 'shieldsdown', 'stancechange'].includes(ability.id)) return false;
				if (['battlebond', 'comatose', 'disguise', 'multitype', 'powerconstruct', 'rkssystem', 'schooling', 'shieldsdown', 'stancechange'].includes(oldAbility)) return false;
			}
			this.battle.singleEvent('End', this.battle.getAbility(oldAbility), this.abilityData, this, source);
			let ally = this.side.active.find(ally => ally && ally !== this && !ally.fainted);
			if (ally && ally.innate) {
				ally.removeVolatile(ally.innate);
				delete ally.innate;
			}
			this.ability = ability.id;
			this.abilityData = {id: ability.id, target: this};
			if (ability.id) {
				this.battle.singleEvent('Start', ability, this.abilityData, this, source);
				if (ally && ally.ability !== this.ability) {
					ally.innate = 'ability' + ability.id;
					ally.addVolatile(ally.innate);
				}
			}
			this.abilityOrder = this.battle.abilityOrder++;
			return oldAbility;
		},
		hasAbility: function (ability) {
			if (!this.ignoringAbility()) {
				if (Array.isArray(ability) ? ability.map(toId).includes(this.ability) : toId(ability) === this.ability) {
					return true;
				}
			}
			let ally = this.side.active.find(ally => ally && ally !== this && !ally.fainted);
			if (!ally || ally.ignoringAbility()) return false;
			if (Array.isArray(ability)) return ability.map(toId).includes(ally.ability);
			return toId(ability) === ally.ability;
		},
		takeDual(source) {
			if (!this.isActive) return false;
			if (!this.ability) return false;
			if (!source) source = this;
			let dual = this.getAbility();
			if (dual.effectType !== 'Item') return false;
			if (this.battle.runEvent('TakeItem', this, source, null, dual)) {
				this.baseAbility = this.ability = '';
				this.abilityData = {id: '', target: this};
				return dual;
			}
			return false;
		},
	},
};
