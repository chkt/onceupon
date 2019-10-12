export class Composition {
	public parts : string[];
	public embeds : any[];

	constructor(parts:string[], embeds:any[]) {
		this.parts = parts;
		this.embeds = embeds;
	}
}


export function compose(parts:TemplateStringsArray, ...embeds:any[]) : Composition {
	return new Composition(Array.from(parts), embeds);
}
