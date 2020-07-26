import type { IGConstructor } from "./meta";
import type { TotlichenLinieConstructor } from "./effekt";
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


class DasKampfsystem {
	static effekt : { TotlichenLinie: TotlichenLinieConstructor } | null
		= null;
	constructor() {
	};
	static bind_to_game() {
		machen_mir_ein_module("crossbored.stupidanimation",
				      ["game.feature.msg.gui.message-overlay",
				       "impact.base.utils" /* RGBColor */],
				      async () => {
			this.effekt = await import("./effekt.js");
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
