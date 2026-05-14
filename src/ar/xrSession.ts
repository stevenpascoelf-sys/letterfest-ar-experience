let currentSession: XRSession | null = null;
let endingPromise: Promise<void> | null = null;
let pendingRequest: Promise<XRSession> | null = null;

const RELEASE_DELAY_MS = 250;
const MAX_RETRIES = 5;

function attachAutoClear(session: XRSession) {
    const onEnd = () => {
        if (currentSession === session) currentSession = null;
        session.removeEventListener('end', onEnd);
    };
    session.addEventListener('end', onEnd);
}

export function getActiveSession(): XRSession | null {
    return currentSession;
}

export async function endActiveSession(): Promise<void> {
    if (endingPromise) {
        await endingPromise;
        return;
    }
    let session: XRSession | null = currentSession;
    if (!session && pendingRequest) {
        try {
            session = await pendingRequest;
        } catch {
            return;
        }
    }
    if (!session) return;
    if (currentSession === session) currentSession = null;
    const p = (async () => {
        try {
            await session!.end();
        } catch {
            /* already ended */
        }
        await new Promise<void>((resolve) => setTimeout(resolve, RELEASE_DELAY_MS));
    })();
    endingPromise = p;
    try {
        await p;
    } finally {
        if (endingPromise === p) endingPromise = null;
    }
}

async function tryRequest(options: XRSessionInit): Promise<XRSession> {
    const xr = navigator.xr!;
    const promise = xr.requestSession('immersive-ar', options);
    pendingRequest = promise;
    try {
        const session = await promise;
        currentSession = session;
        attachAutoClear(session);
        return session;
    } finally {
        if (pendingRequest === promise) pendingRequest = null;
    }
}

export type ArSessionResult = {
    session: XRSession;
    features: { hitTest: boolean; domOverlay: boolean; anchors: boolean };
};

export async function requestArSession(overlayRoot: Element | null): Promise<ArSessionResult> {
    const xr = navigator.xr;
    if (!xr) throw new Error('WebXR not available on this device.');

    if (endingPromise) await endingPromise;
    if (pendingRequest) await endActiveSession();
    if (currentSession) await endActiveSession();

    const domOverlay = overlayRoot ? { root: overlayRoot } : undefined;

    const attempts: { init: XRSessionInit; features: ArSessionResult['features'] }[] = [
        {
            init: {
                requiredFeatures: ['hit-test', 'local', 'dom-overlay'],
                optionalFeatures: ['anchors', 'light-estimation'],
                domOverlay,
            },
            features: { hitTest: true, domOverlay: true, anchors: true },
        },
        {
            init: {
                requiredFeatures: ['hit-test', 'local'],
                optionalFeatures: ['dom-overlay', 'anchors', 'light-estimation'],
                domOverlay,
            },
            features: { hitTest: true, domOverlay: true, anchors: true },
        },
        {
            init: {
                requiredFeatures: ['local'],
                optionalFeatures: ['hit-test', 'dom-overlay', 'anchors', 'light-estimation'],
                domOverlay,
            },
            features: { hitTest: true, domOverlay: true, anchors: true },
        },
        {
            init: {
                optionalFeatures: ['hit-test', 'local', 'dom-overlay', 'anchors', 'light-estimation'],
                domOverlay,
            },
            features: { hitTest: true, domOverlay: true, anchors: true },
        },
        {
            init: {},
            features: { hitTest: false, domOverlay: false, anchors: false },
        },
    ];

    let lastErr: unknown = null;
    for (const attempt of attempts) {
        for (let retry = 0; retry <= MAX_RETRIES; retry++) {
            try {
                const session = await tryRequest(attempt.init);
                return { session, features: attempt.features };
            } catch (e) {
                lastErr = e;
                const msg = e instanceof Error ? e.message : String(e);
                if (/already an active/i.test(msg) && retry < MAX_RETRIES) {
                    await endActiveSession();
                    await new Promise<void>((resolve) => setTimeout(resolve, 200 * (retry + 1)));
                    continue;
                }
                break;
            }
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('AR session not supported on this device.');
}
