// Empreinte FNV-1a 64 bits d'un JSON canonique (clés triées). Contrôle d'intégrité, pas de sécurité.
function canonical(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    }
    return value === undefined ? 'null' : JSON.stringify(value);
}

export function stateHash(value: unknown): string {
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (const byte of new TextEncoder().encode(canonical(value))) {
        h ^= BigInt(byte);
        h = (h * prime) & 0xffffffffffffffffn;
    }
    return h.toString(16).padStart(16, '0');
}
