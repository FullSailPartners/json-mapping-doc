import { register } from 'node:module';
import { readFileSync } from 'node:fs';

export function getFile(path) {
    return JSON.parse(readFileSync(path, 'utf-8'));
}
