declare namespace ig {
	interface minimalRGBColor {
		r: number;
		g: number;
		b: number;
	}
	interface RGBColor extends minimalRGBColor {
		ok: boolean;
		toRGB() : string;
		toHex() : string;
		assign(color: minimalRGBColor) : void;
		addColor(color: minimalRGBColor, interpolate: number) : void;
	}
	interface RGBColorConstructor {
		new (csscolor?: string): RGBColor;
		interpolate(from: minimalRGBColor, to: minimalRGBColor,
			    ratio: number,
			    res: minimalRGBColor): void
	}

	let RGBColor : RGBColorConstructor;

	namespace MessageOverlayGui {
		// where's my forward delcarations ?
		// https://github.com/microsoft/TypeScript/issues/31894
		interface BottomShadow {
		}
		interface BottomShadowConstructor {
			pattern: ig.ImagePattern;
			new() : BottomShadow;
		}
		let BottomShadow : BottomShadowConstructor;
	}

	interface GuiTransform {
		setScale: (x: number, y: number) => this;
		setRotate: (angle: number) => this;
		setPivot: (x: number, y: number) => this;
	}
}

declare interface Window {
	KEY_SPLINES: KEY_SPLINES;
}

declare interface Number {
	map(from_range_begin: number, from_range_end: number,
	    to_range_begin: number, to_range_end: number) : number;
}
