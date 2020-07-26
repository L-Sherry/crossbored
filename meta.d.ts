
type DeducedConstructorForIgClass<IgClassLike extends {init: any}>
	= new(...args: Parameters<IgClassLike["init"]>) => IgClassLike;

type IGConstructor<IgClassLike extends {init: any}>
	= ImpactClass<IgClassLike> & DeducedConstructorForIgClass<IgClassLike>;

export { IGConstructor };
