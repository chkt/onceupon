import { createToken, LogTokens, token_type } from '../token';
import { ParseContext } from '../parse';


export function parseBytes(bytes:Uint8Array, context:ParseContext) : LogTokens {
	const type = Object.getPrototypeOf(bytes).constructor.name;

	let hex = `${ bytes.byteLength.toString(16) }+0-` + bytes
		.slice(0, context.bytesHead)
		.reduce((prev, value) => prev + value.toString(16).padStart(2, '0'), '');

	if (bytes.byteLength > context.bytesHead && context.bytesTail !== 0) {
		const offset = Math.max(context.bytesHead, bytes.byteLength - context.bytesTail);

		hex += `+${ offset.toString(16) }-` + bytes
			.slice(offset)
			.reduce((prev, value) => prev + value.toString(16).padStart(2, '0'), '');
	}

	return [
		createToken(token_type.type_name, type),
		createToken(token_type.object_bytes, hex)
	];
}
