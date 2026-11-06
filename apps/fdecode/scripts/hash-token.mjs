import { randomBytes } from "node:crypto";
import { hashToken } from "../config.mjs";

const token = process.argv[2];
if (token) {
	console.log(hashToken(token));
} else {
	const generated = randomBytes(24).toString("base64url");
	console.log(`token: ${generated}`);
	console.log(`hash:  ${hashToken(generated)}`);
}
