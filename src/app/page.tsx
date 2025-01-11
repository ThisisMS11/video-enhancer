'use client';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import VideoUploader from '@/components/video-uploader';

export default function App() {
    return (
        <div className="h-[98vh] w-[100vw] flex justify-center items-center">
            <SignedIn>
                <VideoUploader />
            </SignedIn>
            <SignedOut>
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold">Video Enhancement Tool</h1>
                    <p className="text-lg text-muted-foreground">
                        Please sign in to enhance your videos
                    </p>
                </div>
            </SignedOut>
        </div>
    );
}