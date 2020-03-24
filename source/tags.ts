export function extendTags(tags:ReadonlyArray<string>, add:string) : ReadonlyArray<string> {
	if (add.search(/^[ _0-9a-z]+$/) !== 0) return tags;

	const res = [ ...tags, ...add.split(' ')];

	for (let i = res.length - 1, l = tags.length - 1; i > l; i -= 1) {
		if (res[i] === '' || res.indexOf(res[i], 0) !== i) res.splice(i , 1);
	}

	return res;
}
