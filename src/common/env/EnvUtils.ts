declare const process: { env: { [key: string]: string | undefined } };
declare const window: { [key: string]: any };

export const WINDOW_ENV_KEY: any = 'nw-envs';

export function env(key: string): string | undefined {
    if (typeof window !== 'undefined' && window[WINDOW_ENV_KEY]) {
        if (!key.startsWith('NEXT_PUBLIC_')) {
            throw new Error(`Environment variable '${key}' is not public and cannot be accessed in the browser.`);
        }

        return window[WINDOW_ENV_KEY][key];
    }

    return process.env[key];
}