import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
    try {
        const { videoUrl, resolution, model } = await request.json();

        console.log(videoUrl, resolution, model);

        if (!videoUrl || !resolution || !model) {
            return NextResponse.json(
                { error: 'Video URL, resolution, and model are required' },
                { status: 400 }
            );
        }

        // Upload to Cloudinary
        const cloudinaryUpload = await cloudinary.uploader.upload(videoUrl, {
            resource_type: 'video',
            folder: 'video-upscaler',
        });

        // Start the video upscaling process with Cloudinary URL
        // const prediction = await replicate.predictions.create({
        //     version: "lucataco/real-esrgan-video:c23768236472c41b7a121ee735c8073e29080c01b32907740cfada61bff75320",
        //     input: {
        //         video_path: cloudinaryUpload.secure_url,
        //         resolution: resolution,
        //         model: model,
        //     },
        //     webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate-webhook`,
        //     webhook_events_filter: ["completed"]
        // });

        // return NextResponse.json({
        //     success: true,
        //     id: prediction.id,
        //     status: prediction.status,
        //     cloudinaryUrl: cloudinaryUpload.secure_url
        // });
        return NextResponse.json({
            success: true,
            cloudinaryUrl: cloudinaryUpload.secure_url
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: 'Failed to process video' },
            { status: 500 }
        );
    }
}

export const maxDuration = 300;