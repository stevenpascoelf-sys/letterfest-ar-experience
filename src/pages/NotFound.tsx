import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6">
            <div className="max-w-xl text-center">
                <h1 className="mb-3 text-2xl leading-tight font-semibold sm:text-3xl">
                    404 - Page not found
                </h1>
                <p className="mb-3 text-lg text-neutral-800">
                    <Link to="/" className="underline">
                        Back to home
                    </Link>
                </p>
            </div>
        </main>
    );
}
