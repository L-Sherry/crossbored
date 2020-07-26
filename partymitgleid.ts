import type { IGConstructor } from "./meta";

const rundeAktionen = {
	"BALLE_SALVE": ["AIM_START", "THROW_NORMAL", "THROW_NORMAL_REV",
			"THROW_NORMAL", "ENDE"],
	"EINGELADEN_BALLE": ["AIM_START", "THROW_CHARGED", "ENDE"],
	"SCHLAG_COMBO": ["GEHEN", "ATTACK", "ATTACK_REV", "ATTACK",
			 "ATTACK_FINISHER?", "ZURUCK", "ENDE"],
	"SPEZIAL_WIRF1": ["AIM_START", "EINSTARKUNG", "THROW_SPECIAL1", "ENDE"],
	"SPEZIAL_WIRF2": ["AIM_START", "EINSTARKUNG", "THROW_SPECIAL2", "ENDE"],
	"SPEZIAL_WIRF3": ["AIM_START", "EINSTARKUNG", "THROW_SPECIAL3", "ENDE"],
	"SPEZIAL_SCHLAG1": ["EINSTARKUNG", "GEHEN", "ATTACK_SPECIAL1",
			    "ZURUCK", "ENDE"],
	"SPEZIAL_SCHLAG2": ["EINSTARKUNG", "GEHEN", "ATTACK_SPECIAL2",
			    "ZURUCK", "ENDE"],
	"SPEZIAL_SCHLAG3": ["EINSTARKUNG", "GEHEN", "ATTACK_SPECIAL3",
			    "ZURUCK", "ENDE"],
};

const istSpezial = (rundeAktionName : string) => (
	rundeAktionName.startsWith('SPEZIAL_')
);

const gehenTritts = (pos: Vec3) => new ig.Action("[GEHEN]", [
		{
			type: "NAVIGATE_TO_POINT",
			target: pos,
			maxTime: 0,
			precise: true
		}, {
			type: "SET_FACE",
			face: "WEST"
		}
	]);
const zuruckTritts = (tritts : Vec3[]) => new ig.Action("[ZURUCK]", [
		{
			type: "SET_FACE",
			face: "WEST",
			rotate: false
		}, {
			type: "SET_FACE_FIX",
			value: true
		}, ...tritts.map(pos => ({
			type: "JUMP_TO_POINT",
			// halte dich ein referenz um es zu andern
			target: pos,
			forceHeight: 16
		})), {
			type: "SET_FACE_FIX",
			value: false
		}
	]);

// TODO
const einstarkungTritts = () => new ig.Action("[EINSTARKUNG]", []);

type Gemeinmodel = sc.PlayerModel | sc.PartyMemberModel;

interface RundeBasiertPartyMitgleid extends sc.PlayerBaseEntity {
	init(this: this, x: number, y: number, z: number,
	     settings: RundeBasiertPartyMitgleidOptionen): void;
	tritts: {
		GEHEN: {
			punkt: Vec3,
			aktionen: ig.Action[]
		},
		ZURUCK: {
			punkten: Vec3[],
			aktionen: ig.Action[]
		},
		EINSTARKUNG: { aktionen: ig.Action[] }
		ENDE: { aktionen: ig.Action[] }
	},
	model: Gemeinmodel,
	modelChanged(model: Gemeinmodel, message: number, data: unknown) : void
}

interface RundeBasiertPartyMitgleidOptionen extends ig.Entity.Settings {
	partyMemberName: string
}

declare global {
	namespace ig.ACTION_STEP {
		interface WAIT {
			rundeBasiertZeit?: number
		}
	}
}

ig.ACTION_STEP.WAIT.inject({
	start: function(entity: ig.ActorEntity) {
		const alteTrittTimer = entity.stepTimer;
		this.parent(entity);
		if (this.rundeBasiertZeit !== undefined
		    && entity instanceof RundeBasiertPartyMitgleid) {
			(entity.stepData as {time:number}).time
				= this.rundeBasiertZeit;
			entity.stepTimer
				= alteTrittTimer + this.rundeBasiertZeit;
		}
	}
});

type RundeBasiertPartyMitgleidConstructor
	= IGConstructor<RundeBasiertPartyMitgleid>;
type Constructor = RundeBasiertPartyMitgleidConstructor;

type SpielerAktionBlockTyp
	= keyof ig.ACTION_STEP.SET_PLAYER_ACTION_BLOCK["blockData"];

const RundeBasiertPartyMitgleid : Constructor = sc.PlayerBaseEntity.extend({
	init: function(x : number, y : number, z : number,
		       settings : RundeBasiertPartyMitgleidOptionen) {
		this.parent(x, y, z, settings);
		const { partyMemberName } = settings;
		if (partyMemberName === "player")
			this.model = sc.model.player;
		else
			this.model
				= sc.party.getPartyMemberModel(partyMemberName);
		this.animSheet = this.model.animSheet;
		this.proxies = this.model.getBalls();
		this.params = this.model.params;
		// man braucht es für status effekt ?
		// this.params.setCombatant(this);

		// nur im PartyMemberModel
		for (const laufAnim in this.model.walkAnims)
			this.storeWalkAnims(laufAnim,
					    this.model.walkAnims[laufAnim]);
		// der Spieler benutzt die vorgabenmässig walkAnims, und die
		// vorgabenmäsig walkAnims.battle.idle ist 'idle'...
		// aber combatIdle is toll ! ... war toll, jetzt ist es kaputt.
		// aber es war toll beim mein arbeit mit nightmarsh...
		if (!this.model.walkAnims
		    && this.animSheet.hasAnimation("guard"))
			this.storedWalkAnims.battle.idle = "guard";

		this.setDefaultConfig(this.configs.battle);
		this.initAnimations();
		this.setAttribute("dashDir", {x:-1, y:0});
		this.initAktionen(partyMemberName);
		this.throwDirData = Vec2.create();
		sc.Model.addObserver(this.model,
				     this as RundeBasiertPartyMitgleid);
	},
	initAktionen(name : string) {
		const aktionamende = new ig.Action("[endfur${name}]", [{
			type: "KAMPFSYSTEM_AKTION_AM_ENDE",
			tag: name
		}]);
		const gehenpunkt = Vec3.create();
		const gehenaktionen = gehenTritts(gehenpunkt);
		// das ist kein springpunkte
		const zurucktrittpunkten : Vec3[] = [];
		for (let i = 0; i < 4; ++i)
			zurucktrittpunkten.push(Vec3.create());
		const zuruckaktionen = zuruckTritts(zurucktrittpunkten);
		this.tritts = {
			GEHEN: {
				punkt: gehenpunkt,
				aktionen: gehenaktionen
			},
			ZURUCK: {
				punkten: zurucktrittpunkten,
				aktionen: zuruckaktionen
			},
			EINSTARKUNG: {
				aktionen: einstarkungTritts()
			},
			ENDE: {
				aktionen: aktionamende
			}
		};
	},

	zielAn: function(einEntity : ig.Entity) {
		this.setDefaultConfig(this.configs.aiming);
		Vec2.sub(einEntity.coll.pos, this.coll.pos, this.throwDirData);
		Vec2.normalize(this.throwDirData);
	},
	tunAktion: function(aktionen : ig.Action[],
			    bewege : Vec3 | null) : void {
		if (bewege) {
			Vec3.assign(this.tritts.GEHEN.punkt, bewege);
			const punkten : Vec3[] = this.tritts.ZURUCK.punkten;
			punkten.forEach((punkt, i) => (
				Vec3.lerp(bewege, this.coll.pos,
					  (1+i) / punkten.length, punkt)
			));
		}

		let i = aktionen.length - 1;
		this.setAction(aktionen[i]);
		while (i --> 0)
			this.pushInlineAction(aktionen[i], true, false);
	},
	senkAktionZeit: function(aktion: ig.Action,
				 blockTyp: SpielerAktionBlockTyp) {
		let blockZeit = 0;
		const zeitTritts : ig.ACTION_STEP.WAIT[] = [];
		//const zufälligZeitTritts: ig.ACTION_STEP.WAIT_RANDOM[] = [];
		// kein zweig unterstuzung
		let tritt : ig.ActionStepBase | null = aktion.rootStep;
		while (tritt !== null) {
			if (tritt instanceof ig.ACTION_STEP.WAIT) {
				if (tritt.time.constructor === Number)
					zeitTritts.push(tritt);
			//else if (tritt instanceof ig.ACTION_STEP.WAIT_RANDOM)
			//	zufälligZeitTritts.push(tritt);
			} else if (tritt instanceof
					 ig.ACTION_STEP.SET_PLAYER_ACTION_BLOCK)
				blockZeit += tritt.blockData[blockTyp] || 0;
			tritt = tritt._nextStep;
		}
		if (blockZeit == 0 || zeitTritts.length == 0)
			return;
		const zeitVonTritt = (tritt : ig.ACTION_STEP.WAIT) =>
			tritt.time === -1 ? 1e3 : tritt.time as number;
		// -1 ist endlos erwartung
		let totalZeit : number
			= zeitTritts.reduce((a,t) => a + zeitVonTritt(t), 0);
		if (totalZeit <= blockZeit)
			return;
		zeitTritts.sort((a,b) => zeitVonTritt(b) - zeitVonTritt(a));
		let i = zeitTritts.length;
		while (i --> 0) {
			const tritt = zeitTritts[i];

			totalZeit -= zeitVonTritt(tritt);
			if (totalZeit > blockZeit) {
				tritt.rundeBasiertZeit = 0;
			} else {
				tritt.rundeBasiertZeit = blockZeit - totalZeit;
				totalZeit += tritt.rundeBasiertZeit;
				break;
			}
		}
	},
	vorbereitAktion: function(aktionenAlsString: string[],
				  elementModus : sc.ELEMENT)
			 : ig.Action[] | null {
		const aktionen : ig.Action[] = [];
		for (const aktion of aktionenAlsString) {
			const optional = aktion.endsWith("?");
			const wahrename
				= optional ? aktion.slice(0, -1) : aktion;

			const unseretritts = this.tritts[wahrename];
			if (unseretritts) {
				aktionen.push(unseretritts.aktionen);
				continue;
			}
			const spieleraktionname
				= wahrename as keyof typeof sc.PLAYER_ACTION

			const id = sc.PLAYER_ACTION[spieleraktionname];
			console.assert(id !== undefined, "ohno");
			// für PlayerModel und PartyMemberModel:
			// guck an this.currentElementMode und benutze
			// this.elementConfigs || this.baseConfig
			// (die PlayerSubConfig sind)
			// (es is wie PlayerModel.getActionByElement,
			//  aber auch für PartyMemberModel)
			let igAktion =
				this.model.elementConfigs[elementModus]
					  .getAction(id);
			if (!igAktion)
				igAktion = this.model.baseConfig.getAction(id);

			if (igAktion) {
				this.senkAktionZeit(igAktion, 'action');
				aktionen.push(igAktion);
			} else if (!optional)
				return null;
		}
		return aktionen;
	},

	zahlAktionenFurElementModusAuf: function(element : sc.ELEMENT) {
		const ret : Partial<Record<keyof typeof rundeAktionen,
					   ig.Action[]>>
			= {};
		let name : keyof typeof rundeAktionen;
		for (name in rundeAktionen) {
			const aktionen = rundeAktionen[name];
			const vielleicht
				= this.vorbereitAktion(aktionen, element);
			if (vielleicht)
				ret[name] = vielleicht;
		}
		return ret;
	},
	// für die aktuel element modus
	zahlAktionenAuf: function() {
		this.aktionen = [];
		const aufzahl = this.zahlAktionenFurElementModusAuf.bind(this);
		for (const elementname in sc.ELEMENT) {
			const element = sc.ELEMENT[elementname];
			console.assert(element === this.aktionen.length,
				       "ohno");
			this.aktionen.push(aufzahl(element));
		}
	},
	/*
	wirfBalleSalve: function(einEntity) {
		this.zielAn(einEntity);
		this.tunAktion(["AIM_START", "THROW_NORMAL",
				"THROW_NORMAL_REV", "THROW_NORMAL"]);

	},
	wirfEingeladeBalle: function(einEntity) {
		this.zielAn(einEntity);
		this.tunAktion(["AIM_START", "THROW_CHARGED"]);
	},
	schlagCombo: function(einEntity) {
		//this.tunAktion([
	}*/
	modelChanged: function(model: sc.Model, message: number,
			       data: unknown) {
		// TODO
	}
});


// const mitgleider = [];
// let mitgleid;
// for (let i = sc.party.getPartySize(); --i; )
//     mitgleider.push(sc.party.getPartyMemberModelByIndex(i));

export { RundeBasiertPartyMitgleid, RundeBasiertPartyMitgleidConstructor };
