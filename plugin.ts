import type { IGConstructor } from "./meta";
import type { TotlichenLinieConstructor } from "./effekt";
import type { RundeBasiertPartyMitgleidConstructor } from "./partymitgleid";
// Typescript.  this is like... EIN NEUE SPRACHE !

const machen_mir_ein_module = (name: string, deps : string[],
			       func : () => void) =>
	window.ig.module(name).requires(...deps).defines(func);

// Typische Microsoft Produkt: nichts funktioniert nie

function injekt_mir<
	KlassTyp /* extends {
		[hinweis in Hinweis] : (this: KlassTyp, ...args: Args) => Return
	}*/,
	Hinweis extends keyof KlassTyp,
	Args extends any[],
	Return
>(
	objekt: /*KlassTyp*/{[hinweis in Hinweis] : (this: KlassTyp, ...args: Args) => Return},
	name: Hinweis,
	umhulle: (this: KlassTyp,
		  altern: (...args : Args) => Return,
		  ...args: Args) => Return
): void {
	const alte
		: (this: KlassTyp, ...args : Args) => Return
		= objekt[name];

	const neues
		: (this: KlassTyp, ...args: Args) => Return
		= function(...args: Args) : Return {
			/* funktioniert nicht:
			const altern
				: (...args: Args) => Return
				= alte.bind(this);*/
			const altern
				: (...args: Args) => Return
				= (...args: Args) => alte.apply(this, args);
			// funktioniert nicht
			//return umhulle.apply(this, [altern, ...args]);
			// funktioniert noch nicht
			//return umhulle.call(this, altern, ...args);

			// funktioniert.  Logik. Es gibt keines.
			return umhulle.bind(this, altern)(...args);
		};

	objekt[name] = neues;
}

declare namespace ig.ACTION_STEP {
	interface KAMPFSYSTEM_AKTION_AM_ENDE {}
	interface KAMPFSYSTEM_AKTION_AM_ENDE_KONSTRUKTOR {
		new (optionen: {tag: string}): KAMPFSYSTEM_AKTION_AM_ENDE
	}
	var KAMPFSYSTEM_AKTION_AM_ENDE: KAMPFSYSTEM_AKTION_AM_ENDE_KONSTRUKTOR;
}

const feststellekampfsystem = () => {
	ig.ACTION_STEP.KAMPFSYSTEM_AKTION_AM_ENDE = window.ig.ActionStepBase.extend({
		init: function(settings : {tag: string}) {
			this.tag = settings.tag;
		},
		start: function(locals: unknown) {
			/*
			sc.crossbored_kampf_system.actionAmEnde(this.tag);
			*/
			console.log(`${this.tag} finished`);
		}
	});
};

class DasKampfsystem {
	static effekt : { TotlichenLinie: TotlichenLinieConstructor } | null
		= null;
	static partymitgleid : {
		RundeBasiertPartyMitgleid: RundeBasiertPartyMitgleidConstructor
	} | null = null;
	constructor() {
	};
	static bind_to_game() {
		machen_mir_ein_module("crossbored.steps",
				      ["impact.base.action"],
				      feststellekampfsystem);
		machen_mir_ein_module("crossbored.stupidanimation",
				      ["game.feature.msg.gui.message-overlay",
				       "impact.base.utils" /* RGBColor */],
				      async () => {
			this.effekt = await import("./effekt.js");
		});

		machen_mir_ein_module("crossbored.roundbasedpartymember",
				      ["game.feature.player.entities."
				       +"player-base",
				       "crossbored.steps"], async () => {
			this.partymitgleid = await import("./partymitgleid.js");
		});

		(window as any).kampfsystem = this;
	};
}



export default class Velssystem {
	prestart() : void {
		// impact_go_brrrr();
	}
	postload() : void {
		DasKampfsystem.bind_to_game();
	}
}
