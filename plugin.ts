import type { IGConstructor } from "./meta";
// Typescript.  this is like... EIN NEUE SPRACHE !

const machen_mir_ein_module = (name: string, deps : string[],
			       func : () => void) =>
	ig.module(name).requires(...deps).defines(func);

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

declare interface TotlichenLinie extends ig.GuiElementBase {
	pattern: ig.ImagePattern;
	timer: number;
	settings: {
		gradientSize: number;
		gradientTimer: number;
		gradientScale: number;
		lineSize: number;
		lineTimer: number;
		lineRotation: number;
		lineInitialScale: number;
		lineStartColor: ig.RGBColor;
		lineEndColor: ig.RGBColor;
	}
	start: () => void;
	updateDrawablesAnfang: ig.GuiElementBase["updateDrawables"];
	updateDrawablesEnde: ig.GuiElementBase["updateDrawables"];
	init: () => void;
};

const totlichenlinie
	: () => IGConstructor<TotlichenLinie>
	= () => ig.GuiElementBase.extend({
		pattern: null,
		settings: {
			gradientSize: 80,
			gradientTimer: 1,
			pauseTimer: 0.3,
			lineSize: 8,
			lineTimer: 1.5,
			lineRotation: 2 * Math.PI * 1.5,
			lineInitialScale: 1.5,
			lineStartColor: new ig.RGBColor("white"),
			lineEndColor: new ig.RGBColor("black")
		},
		// fun fact: rendering gradients is serious business.
		// Filling pixels with R = G = B = Math.round(x / width * 255)
		// is waaay too ugly when the width is more than 256.
		// yes, your image editor does dithering. just like opengl.
		init: function() {
			this.parent();
			// shameless rip
			const i = ig.MessageOverlayGui.BottomShadow;
			if (!i.pattern)
				new i;
			this.pattern = i.pattern;
			this.settings.gradientScale
				= this.settings.gradientSize / 128;
			this.timer = 0;
			// FIXME: ablenk am starten
		},
		start: function() {
			this.timer = 0;
		},
		update: function() {
			this.timer += ig.system.tick;
		},

		updateDrawablesAnfang: function(g : ig.GuiRenderer) {
			const settings = this.settings;
			// Typescript.  this is like... A NEW LANGUAGE !
			const bis = -settings.gradientSize;
			const zum = (ig.system.height - settings.lineSize) / 2;
			const quotient = this.timer / settings.gradientTimer;
			let oben = Math.ceil(quotient * (zum - bis) + bis);
			if (oben > 0) {
				g.addColor("black", 0, 0,
					   ig.system.width, oben);
				g.addColor("black", 0, ig.system.height - oben,
					   ig.system.width, oben);
			}
			const alphaOben = Math.max(oben, 0);
			g.addColor(`rgb(255,255,255,${quotient})`,
				   0, alphaOben,
				   ig.system.width,
				   ig.system.height - 2 * alphaOben);

			// fucking patterns, how do they work
			const massstab = settings.gradientScale;

			let quellhohe = 128, vonY = 0;
			let unten = oben + settings.gradientSize;
			if (unten > zum) {
				vonY = (unten-zum)/massstab;
				quellhohe = 128 - vonY;
				unten = zum;
			} else if (oben < 0) {
				//vonY = -oben / massstab;
				//quellhohe = 128 - vonY;
				//oben = 0;
			}

			g.addTransform().setTranslate(0,
						      ig.system.height - unten)
					.setScale(1, massstab);
			g.addPattern(this.pattern,
				     0, 0,
				     0, vonY,
				     ig.system.width, quellhohe);
			g.undoTransform();

			g.addTransform().setTranslate(0, unten)
					.setScale(1, -massstab);
			g.addPattern(this.pattern,
				     0, 0,
				     0, vonY,
				     ig.system.width, quellhohe);
			g.undoTransform();
/*
			g.addTransform().setPivot(0, ).setScale(1, -massstab);



			g.addPattern(this.pattern,
				     0, oben, 0, vonY,
				     ig.system.width, quellhohe);

			g.addTransform().setScale(1, massstab);

			g.addPattern(this.pattern,
				     0, ig.system.height - oben,
				     0, vonY,
				     ig.system.width, quellhohe);
			g.undoTransform();*/
		},
		updateDrawablesEnde: function(g: ig.GuiRenderer) {
			const settings = this.settings;
			// color me blind
			g.addColor("black", 0, 0,
				   ig.system.width, ig.system.height);
			// now, let's draw the awesomest line
			const quotient
				= ((this.timer - settings.gradientTimer
				    - settings.pauseTimer)
				    / settings.lineTimer).limit(0, 1);

			const leichtausfunk = window.KEY_SPLINES.EASE_OUT;
			const leichtaus = leichtausfunk.get(quotient);

			const massstab = (1 - leichtaus);
			const rotieren = quotient * settings.lineRotation;
			const trafo = g.addTransform();
			trafo.setPivot(ig.system.width / 2,
				       ig.system.height / 2)
			     .setRotate(rotieren).setScale(massstab, massstab);

			const farbe = new ig.RGBColor;
			ig.RGBColor.interpolate(settings.lineStartColor,
						settings.lineEndColor,
						leichtaus, farbe);
			const cssfarbe = farbe.toRGB();
			const weite
				= ig.system.width * settings.lineInitialScale;
			const links = (weite - ig.system.width) / -2;
			const oben = (ig.system.height - settings.lineSize) / 2;

			g.addColor(cssfarbe, links, oben,
				   weite, settings.lineSize);
			g.undoTransform();
		},
		updateDrawables: function(g: ig.GuiRenderer) {
			if (this.timer < this.settings.gradientTimer)
				this.updateDrawablesAnfang(g);
			else if (this.timer < (this.settings.gradientTimer
					       + this.settings.pauseTimer
					       + this.settings.lineTimer))
				this.updateDrawablesEnde(g);
		}
	});

class DasKampfsystem {
	static TotlichenLinie
		: ReturnType<typeof totlichenlinie> | null
		= null;
	liniegui
		: TotlichenLinie | null
		= null;
	constructor() {
	};
	static bind_to_game() {
		machen_mir_ein_module("crossbored.stupidanimation",
				      ["game.feature.msg.gui.message-overlay",
				       "impact.base.utils" /* RGBColor */],
				      () => {
			this.TotlichenLinie = totlichenlinie();
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
